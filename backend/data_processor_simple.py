"""
Simple Data Processing Module - Exact Algorithm Implementation

This module implements the exact data cleaning algorithm you specified:
For each column Ci in D
    If Ci is Numeric
        Replace missing with mean(Ci)
    Else if Ci is Categorical
        Replace missing with mode(Ci)
    Else if Ci is Boolean
        Replace missing with most frequent value
    Else if Ci is Date
        Replace missing with most frequent date
"""

import pandas as pd
import numpy as np
import json
from typing import Dict, List, Any, Optional, Union
from enum import Enum
import xml.etree.ElementTree as ET


class TransformOperation(Enum):
    """Supported transformation operations"""
    FILTER = "filter"
    CLEAN_MISSING = "clean_missing"
    REMOVE_DUPLICATES = "remove_duplicates"
    NORMALIZE = "normalize"
    AGGREGATE = "aggregate"
    SORT = "sort"
    GROUP_BY = "group_by"


class SimpleDataProcessor:
    """
    Simple data processor implementing your exact specified algorithm
    """
    
    def __init__(self):
        self.dataframes = {}
        self.transform_history = []
    
    def load_input_data(self, data_source: Union[str, Dict], source_id: str = "input_1"):
        """
        Load data from input node - handles CSV, JSON, XML
        """
        try:
            if isinstance(data_source, str):
                if data_source.endswith('.csv'):
                    df = pd.read_csv(data_source)
                elif data_source.endswith('.json'):
                    if data_source.startswith('{') or data_source.startswith('['):
                        import io
                        df = pd.read_json(io.StringIO(data_source))
                    else:
                        df = pd.read_json(data_source)
                elif data_source.endswith('.xml'):
                    df = self._parse_xml_to_dataframe(data_source)
                else:
                    from io import StringIO
                    df = pd.read_csv(StringIO(data_source))
            elif isinstance(data_source, dict):
                df = pd.DataFrame(data_source)
            elif isinstance(data_source, list):
                df = pd.DataFrame(data_source)
            else:
                raise ValueError(f"Unsupported data source type: {type(data_source)}")
            
            self.dataframes[source_id] = df.copy()
            return df
        except Exception as e:
            raise ValueError(f"Error loading input data: {str(e)}")
    
    def _parse_xml_to_dataframe(self, xml_data: str) -> pd.DataFrame:
        """
        Parse XML data into flat tabular structure
        """
        try:
            if xml_data.startswith('<?xml') or xml_data.startswith('<'):
                root = ET.fromstring(xml_data)
            else:
                tree = ET.parse(xml_data)
                root = tree.getroot()
            
            records = []
            for child in root:
                record = {}
                for attr_name, attr_value in child.attrib.items():
                    record[f"@{attr_name}"] = attr_value
                
                for elem in child:
                    if elem.text and elem.text.strip():
                        record[elem.tag] = elem.text.strip()
                    else:
                        record[elem.tag] = elem.text
                
                if child.text and child.text.strip():
                    record["content"] = child.text.strip()
                
                records.append(record)
            
            return pd.DataFrame(records)
        except Exception as e:
            raise ValueError(f"Error parsing XML data: {str(e)}")
    
    def simple_data_cleaning(self, df: pd.DataFrame) -> tuple:
        """
        EXACT implementation of your specified algorithm:
        
        Algorithm Data_Cleaning_And_Preprocessing
        Input: DataFrame df
        Output: Cleaned dataset
        """
        df_cleaned = df.copy()
        processing_steps = []
        
        # Detect file type and load (already done)
        processing_steps.append(f"Loaded data with shape: {df.shape}")
        
        # For each column Ci in D
        # Detect data type of Ci and Count missing values
        column_info = {}
        for col in df_cleaned.columns:
            missing_count = df_cleaned[col].isnull().sum()
            column_info[col] = {
                'missing_count': missing_count,
                'data_type': self._detect_simple_type(df_cleaned[col])
            }
        
        processing_steps.append(f"Analyzed {len(column_info)} columns")
        
        # EXACT algorithm implementation:
        # For each column Ci in D
        for col in df_cleaned.columns:
            col_info = column_info[col]
            
            # If Ci is Numeric
            if col_info['data_type'] in ['numeric', 'integer', 'float']:
                # Replace missing with mean(Ci)
                mean_val = df_cleaned[col].mean()
                df_cleaned[col] = df_cleaned[col].fillna(mean_val)
                processing_steps.append(f"Filled missing values in {col} with mean: {mean_val:.2f}")
            
            # Else if Ci is Categorical
            elif col_info['data_type'] == 'categorical':
                # Replace missing with mode(Ci)
                mode_series = df_cleaned[col].mode()
                if not mode_series.empty:
                    mode_val = mode_series.iloc[0]
                    df_cleaned[col] = df_cleaned[col].fillna(mode_val)
                    processing_steps.append(f"Filled missing values in {col} with mode: {mode_val}")
                else:
                    df_cleaned[col] = df_cleaned[col].fillna("Unknown")
                    processing_steps.append(f"Filled missing values in {col} with 'Unknown'")
            
            # Else if Ci is Boolean
            elif col_info['data_type'] == 'boolean':
                # Replace missing with most frequent value
                mode_series = df_cleaned[col].mode()
                if not mode_series.empty:
                    mode_val = mode_series.iloc[0]
                    df_cleaned[col] = df_cleaned[col].fillna(mode_val)
                    processing_steps.append(f"Filled missing values in {col} with mode: {mode_val}")
                else:
                    df_cleaned[col] = df_cleaned[col].fillna(True)
                    processing_steps.append(f"Filled missing values in {col} with True")
            
            # Else if Ci is Date
            elif col_info['data_type'] == 'datetime':
                # Replace missing with most frequent date
                parsed = pd.to_datetime(df_cleaned[col], errors='coerce')
                mode_series = parsed.mode()

                if not mode_series.empty:
                    df_cleaned[col] = parsed.fillna(mode_series.iloc[0])
                    processing_steps.append(f"Filled missing values in {col} with most frequent date")
                else:
                    df_cleaned = df_cleaned.dropna(subset=[col])
                    processing_steps.append(f"Removed rows with missing dates in {col}")
        
        # Normalize all categorical text columns
        df_cleaned = self._normalize_text_columns(df_cleaned)
        processing_steps.append("Normalized all text columns")
        
        # Remove duplicate rows
        initial_rows = len(df_cleaned)
        df_cleaned = df_cleaned.drop_duplicates()
        removed_duplicates = initial_rows - len(df_cleaned)
        processing_steps.append(f"Removed {removed_duplicates} duplicate rows")
        
        # For each categorical column Ci
        encoding_summary = []
        for col in df_cleaned.columns:
            if column_info[col]['data_type'] == 'categorical':
                unique_count = df_cleaned[col].nunique()
                threshold = 10  # As specified in algorithm
                
                # If unique_values(Ci) ≤ threshold
                if unique_count <= threshold:
                    # Apply One-Hot Encoding
                    dummies = pd.get_dummies(df_cleaned[col], prefix=col)
                    df_cleaned = df_cleaned.drop(columns=[col])
                    df_cleaned = pd.concat([df_cleaned, dummies], axis=1)
                    encoding_summary.append(f"One-hot encoded {col} ({unique_count} categories)")
                else:
                    # Apply Label Encoding
                    df_cleaned[col] = pd.Categorical(df_cleaned[col]).codes
                    encoding_summary.append(f"Label encoded {col} ({unique_count} categories)")
        
        if encoding_summary:
            processing_steps.append(f"Encoding applied: {', '.join(encoding_summary)}")
        
        # Scale all numerical columns
        df_cleaned = self._scale_numeric_columns(df_cleaned)
        processing_steps.append("Scaled all numerical columns")
        
        # Generate summary report
        summary_report = {
            "original_shape": df.shape,
            "final_shape": df_cleaned.shape,
            "processing_steps": processing_steps,
            "columns_processed": len(df_cleaned.columns),
            "duplicates_removed": removed_duplicates,
            "encoding_methods": ", ".join(encoding_summary) if encoding_summary else "None"
        }
        
        return df_cleaned, summary_report
    
    def _detect_simple_type(self, series: pd.Series) -> str:
        """
        STRICT and deterministic data type detection
        aligned with the specified algorithm
        """
        non_null = series.dropna()

        if non_null.empty:
            return 'categorical'

        # 1️⃣ Boolean detection (STRICT)
        if non_null.isin([True, False]).all():
            return 'boolean'

        # 2️⃣ Datetime detection (threshold-based)
        parsed_dates = pd.to_datetime(non_null, errors='coerce')
        if parsed_dates.notna().mean() > 0.9:
            return 'datetime'

        # 3️⃣ Numeric detection (threshold-based)
        numeric_series = pd.to_numeric(non_null, errors='coerce')
        numeric_ratio = numeric_series.notna().mean()

        if numeric_ratio > 0.9:
            if (numeric_series.dropna() % 1 == 0).all():
                return 'integer'
            return 'float'

        # 4️⃣ Default
        return 'categorical'
    
    def _is_boolean_series(self, series: pd.Series) -> bool:
        """
        STRICT boolean detection
        Only True / False allowed
        """
        non_null = series.dropna()
        return non_null.isin([True, False]).all()
    
    def _normalize_text_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Normalize all categorical text columns
        """
        df_normalized = df.copy()
        
        for col in df.columns:
            if df[col].dtype == 'object':
                # Convert to string, strip whitespace, and convert to lowercase
                df_normalized[col] = df_normalized[col].astype(str).str.replace(r'[^a-zA-Z0-9\s]', '', regex=True).str.lower()
        
        return df_normalized
    
    def _scale_numeric_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Scale all numerical columns using standardization
        """
        df_scaled = df.copy()
        
        for col in df.columns:
            if pd.api.types.is_numeric_dtype(df[col]) and not pd.api.types.is_bool_dtype(df[col]):
                mean_val = df[col].mean()
                std_val = df[col].std()
                if std_val != 0:
                    df_scaled[col] = (df[col] - mean_val) / std_val
                else:
                    df_scaled[col] = 0  # Constant column
        
        return df_scaled
    
    def preprocess_data(self, df: pd.DataFrame, target_column: Optional[str] = None) -> tuple:
        """
        Main preprocessing method - uses simple cleaning algorithm
        """
        return self.simple_data_cleaning(df)
    
    def clean_missing_values(self, df: pd.DataFrame, strategy: str = "drop", fill_value=None) -> pd.DataFrame:
        """
        Clean missing values from dataframe using simple approach
        """
        df_cleaned = df.copy()
        
        if strategy == "drop":
            df_cleaned = df_cleaned.dropna()
        elif strategy == "fill":
            if fill_value is not None:
                df_cleaned = df_cleaned.fillna(fill_value)
            else:
                # Simple filling: mean for numeric, mode for categorical
                for col in df_cleaned.columns:
                    if pd.api.types.is_numeric_dtype(df_cleaned[col]):
                        df_cleaned[col] = df_cleaned[col].fillna(df_cleaned[col].mean())
                    else:
                        mode_val = df_cleaned[col].mode()
                        if not mode_val.empty:
                            df_cleaned[col] = df_cleaned[col].fillna(mode_val.iloc[0])
                        else:
                            df_cleaned[col] = df_cleaned[col].fillna("Unknown")
        elif strategy == "forward_fill":
            df_cleaned = df_cleaned.ffill()
        elif strategy == "backward_fill":
            df_cleaned = df_cleaned.bfill()
        
        return df_cleaned
    
    def filter_data(self, df: pd.DataFrame, column: str, condition: str, value: Any) -> pd.DataFrame:
        """
        Filter data based on condition
        """
        df_filtered = df.copy()
        
        try:
            # Parse condition like "age > 25" or just ">"
            if column in condition:
                # Full expression provided, extract operator and value
                parts = condition.replace(column, '').strip().split()
                op = parts[0] if parts else '>'
                val = parts[1] if len(parts) > 1 else value
            else:
                # Just operator provided
                op = condition.strip()
                val = value
            
            # Convert value to appropriate type
            if isinstance(val, str):
                if val.isdigit():
                    val = int(val)
                elif '.' in val and val.replace('.', '').isdigit():
                    val = float(val)
            
            # Convert column to numeric if value is numeric (for proper comparison)
            if isinstance(val, (int, float)):
                df_filtered[column] = pd.to_numeric(df_filtered[column], errors='coerce')
            
            print(f"DEBUG FILTER: column={column}, op={op}, val={val}, val_type={type(val)}")
            
            # Apply filter using direct comparison
            if op == '>':
                mask = df_filtered[column] > val
            elif op == '>=':
                mask = df_filtered[column] >= val
            elif op == '<':
                mask = df_filtered[column] < val
            elif op == '<=':
                mask = df_filtered[column] <= val
            elif op == '==' or op == '=':
                mask = df_filtered[column] == val
            elif op == '!=':
                mask = df_filtered[column] != val
            else:
                mask = df_filtered[column] == val
            
            df_filtered = df_filtered[mask]
            print(f"DEBUG FILTER: returned {len(df_filtered)} rows")
            
        except Exception as e:
            print(f"Filter error: {e}, returning original data")
            # Return original data on error
            return df_filtered
        
        return df_filtered
    
    def remove_duplicates(self, df: pd.DataFrame, subset: Optional[List[str]] = None) -> pd.DataFrame:
        """
        Remove duplicate rows
        """
        if subset:
            return df.drop_duplicates(subset=subset)
        else:
            return df.drop_duplicates()
    
    def normalize_column(self, df: pd.DataFrame, column: str, method: str = "min_max") -> pd.DataFrame:
        """
        Normalize a column using various methods
        """
        df_normalized = df.copy()
        
        # Check if column exists
        if column not in df_normalized.columns:
            raise ValueError(f"Column '{column}' not found in dataframe. Available columns: {list(df_normalized.columns)}")
        
        # Ensure column is numeric
        if not pd.api.types.is_numeric_dtype(df_normalized[column]):
            try:
                df_normalized[column] = pd.to_numeric(df_normalized[column], errors='coerce')
            except Exception:
                raise ValueError(f"Column '{column}' cannot be converted to numeric for normalization")
        
        if method == "min_max":
            min_val = df_normalized[column].min()
            max_val = df_normalized[column].max()
            if max_val - min_val != 0:
                df_normalized[column] = (df_normalized[column] - min_val) / (max_val - min_val)
        elif method == "z_score":
            mean_val = df_normalized[column].mean()
            std_val = df_normalized[column].std()
            if std_val != 0:
                df_normalized[column] = (df_normalized[column] - mean_val) / std_val
        elif method == "unit_vector":
            norm = np.linalg.norm(df_normalized[column])
            if norm != 0:
                df_normalized[column] = df_normalized[column] / norm
        
        return df_normalized
    
    def aggregate_data(self, df: pd.DataFrame, group_by: List[str], agg_dict: Dict[str, str]) -> pd.DataFrame:
        """
        Aggregate data by groups
        """
        # Validate group_by columns exist
        missing_cols = [col for col in group_by if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Group by columns not found: {missing_cols}. Available: {list(df.columns)}")
        
        # Validate aggregation columns exist
        agg_cols = list(agg_dict.keys())
        missing_agg_cols = [col for col in agg_cols if col not in df.columns]
        if missing_agg_cols:
            raise ValueError(f"Aggregation columns not found: {missing_agg_cols}. Available: {list(df.columns)}")
        
        return df.groupby(group_by).agg(agg_dict).reset_index()
    
    def sort_data(self, df: pd.DataFrame, columns: List[str], ascending: List[bool]) -> pd.DataFrame:
        """
        Sort dataframe by columns
        """
        # Validate columns exist
        missing_cols = [col for col in columns if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Sort columns not found: {missing_cols}. Available: {list(df.columns)}")
        
        # Ensure ascending list matches columns length
        if len(ascending) != len(columns):
            ascending = [True] * len(columns)
        
        return df.sort_values(by=columns, ascending=ascending).reset_index(drop=True)
    
    def group_by_operation(self, df: pd.DataFrame, group_by: List[str], operations: Dict[str, str]) -> pd.DataFrame:
        """
        Perform group by operation with multiple aggregations
        """
        # Validate group_by columns exist
        missing_cols = [col for col in group_by if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Group by columns not found: {missing_cols}. Available: {list(df.columns)}")
        
        # Validate operation columns exist
        op_cols = list(operations.keys())
        missing_op_cols = [col for col in op_cols if col not in df.columns]
        if missing_op_cols:
            raise ValueError(f"Operation columns not found: {missing_op_cols}. Available: {list(df.columns)}")
        
        grouped = df.groupby(group_by).agg(operations).reset_index()
        return grouped
    
    def apply_transformation(self, 
                           source_id: str, 
                           operation: TransformOperation, 
                           **kwargs) -> str:
        """
        Apply a transformation operation to the dataframe
        Returns the ID of the new transformed dataframe
        """
        if source_id not in self.dataframes:
            raise ValueError(f"Source ID '{source_id}' not found in dataframes")
        
        source_df = self.dataframes[source_id]
        new_df = None
        new_id = f"{source_id}_transform_{len(self.transform_history) + 1}"
        
        if operation == TransformOperation.CLEAN_MISSING:
            strategy = kwargs.get('strategy', 'drop')
            fill_value = kwargs.get('fill_value', None)
            new_df = self.clean_missing_values(source_df, strategy=strategy, fill_value=fill_value)
        
        elif operation == TransformOperation.FILTER:
            # Handle both 'column' and 'columnName' parameters
            column = kwargs.get('column') or kwargs.get('columnName')
            if not column:
                raise ValueError("Missing 'column' parameter for filter operation")
            
            # Get condition and value
            condition = kwargs.get('condition', '')
            value = kwargs.get('value') or kwargs.get('targetValue')
            
            # Reconstruct full condition expression for filter_data
            if condition and value is not None:
                # Build condition like "age > 25"
                full_condition = f"{column} {condition} {value}"
            else:
                raise ValueError(f"Missing condition or value for filter. Got condition='{condition}', value='{value}'")
            
            print(f"DEBUG FILTER_DATA: column='{column}', full_condition='{full_condition}'")
            new_df = self.filter_data(source_df, column, full_condition, value)
        
        elif operation == TransformOperation.REMOVE_DUPLICATES:
            subset = kwargs.get('subset', None)
            new_df = self.remove_duplicates(source_df, subset=subset)
        
        elif operation == TransformOperation.NORMALIZE:
            # Handle both 'column' and 'columnName' parameters
            column = kwargs.get('column') or kwargs.get('columnName')
            if not column:
                raise ValueError("Missing 'column' parameter for normalize operation")
            method = kwargs.get('method', 'min_max')
            new_df = self.normalize_column(source_df, column, method=method)
        
        elif operation == TransformOperation.AGGREGATE:
            group_by = kwargs['group_by']
            agg_dict = kwargs['agg_dict']
            new_df = self.aggregate_data(source_df, group_by, agg_dict)
        
        elif operation == TransformOperation.SORT:
            columns = kwargs['columns']
            ascending = kwargs.get('ascending', [True] * len(columns))
            new_df = self.sort_data(source_df, columns, ascending)
        
        elif operation == TransformOperation.GROUP_BY:
            group_by = kwargs['group_by']
            operations = kwargs['operations']
            new_df = self.group_by_operation(source_df, group_by, operations)
        
        else:
            raise ValueError(f"Unsupported operation: {operation}")
        
        # Store the new dataframe
        self.dataframes[new_id] = new_df
        self.transform_history.append({
            'from': source_id,
            'to': new_id,
            'operation': operation.value,
            'params': kwargs
        })
        
        return new_id
    
    def get_dataframe(self, df_id: str) -> pd.DataFrame:
        """
        Get a specific dataframe by ID
        """
        if df_id not in self.dataframes:
            raise ValueError(f"DataFrame ID '{df_id}' not found")
        return self.dataframes[df_id]
    
    def get_available_dataframes(self) -> List[str]:
        """
        Get list of available dataframe IDs
        """
        return list(self.dataframes.keys())
    
    def get_transform_summary(self) -> Dict[str, Any]:
        """
        Get summary of all transformations applied
        """
        return {
            'total_transformations': len(self.transform_history),
            'dataframe_count': len(self.dataframes),
            'transformations': self.transform_history,
            'available_dataframes': self.get_available_dataframes()
        }
    
    def generate_graph(self, df_id: str, graph_type: str = 'bar', x_col: str = None, y_col: str = None, title: str = 'Chart') -> str:
        """
        Generate a graph from dataframe and return the path/url
        Light theme styling for NodeFlow
        """
        try:
            import matplotlib
            matplotlib.use('Agg')  # Use non-interactive backend
            import matplotlib.pyplot as plt
            import base64
            from io import BytesIO
            
            # Light theme colors
            CHART_BG = '#ffffff'
            GRID_COLOR = '#e5e7eb'
            AXIS_TEXT = '#4b5563'
            PRIMARY_DATA = '#3b82f6'
            SECONDARY_DATA = '#22c55e'
            TITLE_COLOR = '#1f2937'
            
            df = self.get_dataframe(df_id)
            
            # Convert columns to numeric where possible for plotting
            df = df.copy()
            for col in df.columns:
                if col in [x_col, y_col]:  # Only convert the columns we're plotting
                    df[col] = pd.to_numeric(df[col], errors='coerce')
            
            # Create figure with light background
            fig, ax = plt.subplots(figsize=(10, 6))
            fig.patch.set_facecolor(CHART_BG)
            ax.set_facecolor(CHART_BG)
            
            # Configure grid - horizontal only, subtle
            ax.yaxis.grid(True, linestyle='--', alpha=0.5, color=GRID_COLOR)
            ax.xaxis.grid(False)
            ax.set_axisbelow(True)
            
            # Plot based on graph type
            if graph_type == 'bar':
                if y_col:
                    data = df.groupby(x_col)[y_col].sum()
                    data.plot(kind='bar', ax=ax, color=PRIMARY_DATA, edgecolor='white', linewidth=0.5)
                else:
                    data = df[x_col].value_counts()
                    data.plot(kind='bar', ax=ax, color=PRIMARY_DATA, edgecolor='white', linewidth=0.5)
            elif graph_type == 'line':
                if y_col:
                    ax.plot(df[x_col], df[y_col], color=PRIMARY_DATA, linewidth=2.5, marker='o', markersize=4)
                else:
                    df[x_col].plot(kind='line', ax=ax, color=PRIMARY_DATA, linewidth=2.5, marker='o', markersize=4)
            elif graph_type == 'scatter':
                if y_col:
                    ax.scatter(df[x_col], df[y_col], color=PRIMARY_DATA, alpha=0.7, s=50)
            elif graph_type == 'pie':
                data = df[x_col].value_counts()
                colors = [PRIMARY_DATA, SECONDARY_DATA, '#f59e0b', '#8b5cf6', '#ec4899']
                data.plot(kind='pie', ax=ax, colors=colors, autopct='%1.1f%%', startangle=90)
            elif graph_type == 'hist':
                ax.hist(df[x_col], bins=10, color=PRIMARY_DATA, edgecolor='white', alpha=0.8)
            
            # Style the axes
            ax.tick_params(axis='x', colors=AXIS_TEXT, labelsize=10)
            ax.tick_params(axis='y', colors=AXIS_TEXT, labelsize=10)
            ax.spines['top'].set_visible(False)
            ax.spines['right'].set_visible(False)
            ax.spines['left'].set_color(GRID_COLOR)
            ax.spines['bottom'].set_color(GRID_COLOR)
            
            # Title styling
            ax.set_title(title, color=TITLE_COLOR, fontsize=14, fontweight='600', pad=20)
            
            # Labels
            if x_col:
                ax.set_xlabel(x_col, color=AXIS_TEXT, fontsize=11)
            if y_col:
                ax.set_ylabel(y_col, color=AXIS_TEXT, fontsize=11)
            
            plt.tight_layout()
            
            # Save to buffer
            buffer = BytesIO()
            plt.savefig(buffer, format='png', dpi=100, facecolor=CHART_BG)
            buffer.seek(0)
            
            # Convert to base64
            image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
            plt.close(fig)
            
            return f"data:image/png;base64,{image_base64}"
            
        except Exception as e:
            print(f"Graph generation error: {e}")
            import traceback
            traceback.print_exc()
            raise RuntimeError(f"Graph generation failed: {str(e)}")


def create_sample_workflow():
    """
    Example usage of the simple data processor
    """
    # Create processor instance
    processor = SimpleDataProcessor()
    
    # Sample input data
    sample_data = {
        'name': ['Alice', 'Bob', 'Charlie', 'David', 'Eve'],
        'age': [25, 30, 35, None, 28],
        'salary': [50000, 60000, 70000, 55000, None],
        'department': ['HR', 'IT', 'IT', 'Finance', 'HR']
    }
    
    # Load input data
    processor.load_input_data(sample_data, "input_1")
    
    # Apply transformations
    # Clean missing values
    cleaned_id = processor.apply_transformation(
        "input_1", 
        TransformOperation.CLEAN_MISSING, 
        strategy="fill", 
        fill_value=0
    )
    
    # Filter data
    filtered_id = processor.apply_transformation(
        cleaned_id,
        TransformOperation.FILTER,
        column="age",
        condition=">",
        value=25
    )
    
    # Sort data
    sorted_id = processor.apply_transformation(
        filtered_id,
        TransformOperation.SORT,
        columns=["age"],
        ascending=[True]
    )
    
    # Print summary
    print("Transformation Summary:")
    summary = processor.get_transform_summary()
    print(json.dumps(summary, indent=2))
    
    # Display final dataframe
    final_df = processor.get_dataframe(sorted_id)
    print("\nFinal DataFrame:")
    print(final_df)


if __name__ == "__main__":
    create_sample_workflow()
