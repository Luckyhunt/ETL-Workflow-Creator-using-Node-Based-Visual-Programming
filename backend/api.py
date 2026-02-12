"""
Flask API for ETL Workflow System

This API connects the React frontend to the Python data processing backend.
It exposes endpoints for:
1. Executing workflows
2. Getting transformation results
3. Generating visualizations
4. Managing workflow states
5. Simple but accurate data preprocessing
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from workflow_service import WorkflowService
import json
import pandas as pd
from data_processor_simple import SimpleDataProcessor, TransformOperation
import io


app = Flask(__name__)
CORS(app)  # Enable CORS for communication with React frontend

# Global service instance
workflow_service = WorkflowService()


@app.route('/api/workflow/execute', methods=['POST'])
def execute_workflow():
    """
    Execute a workflow and return results
    Expected payload: workflow definition from frontend
    """
    try:
        workflow_definition = request.get_json()
        
        if not workflow_definition:
            return jsonify({'success': False, 'error': 'No workflow definition provided'}), 400
        
        # Execute the workflow
        result = workflow_service.execute_workflow(workflow_definition)
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/workflow/transform', methods=['POST'])
def apply_single_transform():
    """
    Apply a single transformation to data
    Useful for real-time preview in transformation nodes
    """
    try:
        data = request.json
        input_data = data.get('input_data')
        transform_type = data.get('transform_type')
        params = data.get('params', {})
        
        print(f"Received transform request: type={transform_type}, params={params}")  # Debug log
        
        if not input_data or not transform_type:
            return jsonify({'success': False, 'error': 'Missing input data or transform type'}), 400
        
        # For single transformation, we'll use the simple processor
        processor = SimpleDataProcessor()
        processor.load_input_data(input_data, 'temp_input')
        
        # Map frontend TransformType to backend TransformOperation
        transform_map = {
            # Only actual filter operations should map to FILTER
            'FILTER': TransformOperation.FILTER,
            # Direct mappings for proper backend operations
            'DROP_COLUMN': TransformOperation.FILTER,
            'RENAME_COLUMN': TransformOperation.FILTER,
            'NORMALIZE': TransformOperation.NORMALIZE,
            'FILL_NA': TransformOperation.CLEAN_MISSING,
            'REMOVE_DUPLICATES': TransformOperation.REMOVE_DUPLICATES,
            'AGGREGATE': TransformOperation.AGGREGATE,
            'SORT': TransformOperation.SORT,
            'GROUP_BY': TransformOperation.GROUP_BY
        }
        
        # Handle special operations that require different logic
        if transform_type.upper() == 'FILL_NA':
            # For FILL_NA, we need to clean missing values specifically
            df = processor.dataframes['temp_input'].copy()
            column_name = params.get('columnName')
            fill_value = params.get('targetValue', '')  # Use targetValue as fill value
            
            print(f"FILL_NA: column={column_name}, fill_value={fill_value}")  # Debug log
            
            if column_name and column_name in df.columns:
                # Check for special fill strategies
                fill_str = str(fill_value).strip().lower()
                if fill_str in ['mean', 'median', 'mode']:
                    # Convert column to numeric for calculation
                    numeric_col = pd.to_numeric(df[column_name], errors='coerce')
                    if fill_str == 'mean':
                        fill_value = numeric_col.mean()
                    elif fill_str == 'median':
                        fill_value = numeric_col.median()
                    elif fill_str == 'mode':
                        mode_vals = numeric_col.mode()
                        fill_value = mode_vals[0] if len(mode_vals) > 0 else None
                    print(f"FILL_NA: calculated {fill_str}={fill_value}")
                # Convert to numeric first if fill_value is numeric (but not special keywords)
                elif fill_value and (str(fill_value)).replace('.', '').isdigit():
                    fill_value = float(fill_value)
                
                # Fill NaN values
                df[column_name] = df[column_name].fillna(fill_value)
                # Also replace empty strings with fill_value
                df[column_name] = df[column_name].replace('', fill_value)
                # For object columns, also handle None values explicitly
                if df[column_name].dtype == 'object':
                    df[column_name] = df[column_name].apply(lambda x: fill_value if x is None or x == '' or (isinstance(x, float) and pd.isna(x)) else x)
            
            processor.dataframes['temp_result'] = df
            result_df = df
        elif transform_type.upper() == 'DROP_COLUMN':
            # For DROP_COLUMN, we need to remove the specified column
            df = processor.dataframes['temp_input'].copy()
            column_name = params.get('columnName')
            
            print(f"DROP_COLUMN: column={column_name}")  # Debug log
            
            if column_name and column_name in df.columns:
                df = df.drop(columns=[column_name])
            
            processor.dataframes['temp_result'] = df
            result_df = df
        elif transform_type.upper() == 'RENAME_COLUMN':
            # For RENAME_COLUMN, we need to rename the specified column
            df = processor.dataframes['temp_input'].copy()
            column_name = params.get('columnName')
            new_name = params.get('targetValue')  # Use targetValue as the new column name
            
            print(f"RENAME_COLUMN: column={column_name}, new_name={new_name}")  # Debug log
            
            if column_name and new_name and column_name in df.columns:
                df = df.rename(columns={column_name: new_name})
            
            processor.dataframes['temp_result'] = df
            result_df = df
        elif transform_type.upper() == 'TRIM':
            # For TRIM, we need to trim whitespace from the specified column
            df = processor.dataframes['temp_input'].copy()
            column_name = params.get('columnName')
            
            print(f"TRIM: column={column_name}")  # Debug log
            
            if column_name and column_name in df.columns:
                df[column_name] = df[column_name].astype(str).str.strip()
            
            processor.dataframes['temp_result'] = df
            result_df = df
        elif transform_type.upper() == 'TO_UPPER':
            # For TO_UPPER, convert to uppercase
            df = processor.dataframes['temp_input'].copy()
            column_name = params.get('columnName')
            
            print(f"TO_UPPER: column={column_name}")  # Debug log
            
            if column_name and column_name in df.columns:
                df[column_name] = df[column_name].astype(str).str.upper()
            
            processor.dataframes['temp_result'] = df
            result_df = df
        elif transform_type.upper() == 'TO_LOWER':
            # For TO_LOWER, convert to lowercase
            df = processor.dataframes['temp_input'].copy()
            column_name = params.get('columnName')
            
            print(f"TO_LOWER: column={column_name}")  # Debug log
            
            if column_name and column_name in df.columns:
                df[column_name] = df[column_name].astype(str).str.lower()
            
            processor.dataframes['temp_result'] = df
            result_df = df
        elif transform_type.upper() == 'CONVERT_TO_NUMERIC':
            # For CONVERT_TO_NUMERIC, convert column to numeric
            df = processor.dataframes['temp_input'].copy()
            column_name = params.get('columnName')
            
            print(f"CONVERT_TO_NUMERIC: column={column_name}")  # Debug log
            
            if column_name and column_name in df.columns:
                # Convert to numeric, errors become NaN
                df[column_name] = pd.to_numeric(df[column_name], errors='coerce')
            
            processor.dataframes['temp_result'] = df
            result_df = df
        elif transform_type.upper() == 'CONVERT_TO_STRING':
            # For CONVERT_TO_STRING, convert column to string
            df = processor.dataframes['temp_input'].copy()
            column_name = params.get('columnName')
            
            print(f"CONVERT_TO_STRING: column={column_name}")  # Debug log
            
            if column_name and column_name in df.columns:
                df[column_name] = df[column_name].astype(str)
            
            processor.dataframes['temp_result'] = df
            result_df = df
        elif transform_type.upper() == 'ROUND_NUMBERS':
            # For ROUND_NUMBERS, round numeric column
            df = processor.dataframes['temp_input'].copy()
            column_name = params.get('columnName')
            decimal_places = params.get('targetValue') or params.get('decimalPlaces') or 0
            
            # Convert to int if it's a string
            try:
                decimal_places = int(decimal_places)
            except (ValueError, TypeError):
                decimal_places = 0
            
            print(f"ROUND_NUMBERS: column={column_name}, decimal_places={decimal_places}")  # Debug log
            
            if column_name and column_name in df.columns:
                # Convert to numeric first (in case values are strings)
                df[column_name] = pd.to_numeric(df[column_name], errors='coerce')
                df[column_name] = df[column_name].round(decimal_places)
            
            processor.dataframes['temp_result'] = df
            result_df = df
        elif transform_type.upper() == 'FORMAT_NUMBERS':
            # For FORMAT_NUMBERS, format numeric column
            df = processor.dataframes['temp_input'].copy()
            column_name = params.get('columnName')
            decimal_places = params.get('targetValue') or params.get('decimalPlaces') or 2
            
            # Convert to int if it's a string
            try:
                decimal_places = int(decimal_places)
            except (ValueError, TypeError):
                decimal_places = 2
            
            print(f"FORMAT_NUMBERS: column={column_name}, decimal_places={decimal_places}")  # Debug log
            
            if column_name and column_name in df.columns:
                # Convert to numeric first (in case values are strings)
                df[column_name] = pd.to_numeric(df[column_name], errors='coerce')
                df[column_name] = df[column_name].apply(lambda x: f"{x:,.{decimal_places}f}" if pd.notna(x) else "")
            
            processor.dataframes['temp_result'] = df
            result_df = df
        elif transform_type.upper() == 'NORMALIZE':
            # For NORMALIZE, scale column to 0-1 range
            df = processor.dataframes['temp_input'].copy()
            column_name = params.get('columnName')
            
            print(f"NORMALIZE: column={column_name}")  # Debug log
            
            if column_name and column_name in df.columns:
                # Convert to numeric first (in case values are strings)
                df[column_name] = pd.to_numeric(df[column_name], errors='coerce')
                min_val = df[column_name].min()
                max_val = df[column_name].max()
                if max_val - min_val != 0:
                    df[column_name] = (df[column_name] - min_val) / (max_val - min_val)
            
            processor.dataframes['temp_result'] = df
            result_df = df
        elif transform_type.upper() == 'STRIP_WHITESPACE':
            # For STRIP_WHITESPACE, strip whitespace from column
            df = processor.dataframes['temp_input'].copy()
            column_name = params.get('columnName')
            
            print(f"STRIP_WHITESPACE: column={column_name}")  # Debug log
            
            if column_name and column_name in df.columns:
                df[column_name] = df[column_name].astype(str).str.strip()
            
            processor.dataframes['temp_result'] = df
            result_df = df
        elif transform_type.upper() == 'REMOVE_SPECIAL_CHARS':
            # For REMOVE_SPECIAL_CHARS, remove special characters from column
            df = processor.dataframes['temp_input'].copy()
            column_name = params.get('columnName')
            
            print(f"REMOVE_SPECIAL_CHARS: column={column_name}")  # Debug log
            
            if column_name and column_name in df.columns:
                # Remove all non-alphanumeric characters
                df[column_name] = df[column_name].astype(str).str.replace(r'[^a-zA-Z0-9]', '', regex=True)
            
            processor.dataframes['temp_result'] = df
            result_df = df
        elif transform_type.upper() == 'EXTRACT_NUMBERS':
            # For EXTRACT_NUMBERS, extract numbers from column
            df = processor.dataframes['temp_input'].copy()
            column_name = params.get('columnName')
            
            print(f"EXTRACT_NUMBERS: column={column_name}")  # Debug log
            
            if column_name and column_name in df.columns:
                # Extract numbers using regex
                df[column_name] = df[column_name].astype(str).str.extract(r'(\d+\.?\d*)')
            
            processor.dataframes['temp_result'] = df
            result_df = df
        elif transform_type.upper() == 'EXTRACT_STRINGS':
            # For EXTRACT_STRINGS, extract strings from column
            df = processor.dataframes['temp_input'].copy()
            column_name = params.get('columnName')
            
            print(f"EXTRACT_STRINGS: column={column_name}")  # Debug log
            
            if column_name and column_name in df.columns:
                # Extract non-numeric characters
                df[column_name] = df[column_name].astype(str).str.replace(r'\d+\.?\d*', '', regex=True)
            
            processor.dataframes['temp_result'] = df
            result_df = df
        else:
            # For other operations, use the standard mapping
            operation = transform_map.get(transform_type.lower()) or transform_map.get(transform_type.upper())
            if not operation:
                return jsonify({'success': False, 'error': f'Unsupported transform type: {transform_type}'}), 400
            
            print(f"Standard operation: {operation}")  # Debug log
            
            # For FILTER operation, map the transform_type condition properly
            if operation == TransformOperation.FILTER:
                # Check if condition is already in params and use it
                actual_condition = params.get('condition', transform_type.lower())
                actual_value = params.get('targetValue', params.get('value', ''))
                
                # Parse combined condition like ">=40000" into operator and value
                if actual_condition and not actual_value:
                    import re
                    match = re.match(r'([><=!]+)(.+)', str(actual_condition).strip())
                    if match:
                        actual_condition = match.group(1)
                        actual_value = match.group(2).strip()
                        print(f"Parsed condition: {actual_condition}, value: {actual_value}")
                
                params['condition'] = actual_condition
                params['value'] = actual_value
            
            result_id = processor.apply_transformation('temp_input', operation, **params)
            result_df = processor.get_dataframe(result_id)
        
        return jsonify({
            'success': True,
            'data': result_df.to_dict('records'),
            'shape': result_df.shape,
            'columns': list(result_df.columns)
        })

    except Exception as e:
        print(f"Transform error: {str(e)}")  # Debug log
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/preprocess/full', methods=['POST'])
def full_preprocess():
    """
    Simple but accurate preprocessing endpoint using the exact algorithm specified
    """
    try:
        data = request.json
        input_data = data.get('input_data')
        target_column = data.get('target_column', None)
        
        if not input_data:
            return jsonify({'success': False, 'error': 'Missing input data'}), 400
        
        # Create a new simple processor instance
        processor = SimpleDataProcessor()
        processor.load_input_data(input_data, 'temp_input')
        
        # Get the loaded dataframe
        df = processor.get_dataframe('temp_input')
        
        # Apply the simple but accurate preprocessing
        processed_df, summary_report = processor.preprocess_data(df, target_column=target_column)
        
        return jsonify({
            'success': True,
            'processed_data': processed_df.to_dict('records'),
            'summary_report': summary_report,
            'shape': processed_df.shape,
            'columns': list(processed_df.columns)
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/graph/generate', methods=['POST'])
def generate_graph():
    """
    Generate a graph from processed data
    """
    try:
        data = request.json
        df_data = data.get('data')
        graph_type = data.get('graph_type', 'bar')
        x_col = data.get('x_col')
        y_col = data.get('y_col')
        title = data.get('title', 'Generated Chart')
        
        print(f"[GRAPH] Received request: type={graph_type}, x={x_col}, y={y_col}, data_rows={len(df_data) if df_data else 0}")
        
        if not df_data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        if not x_col:
            return jsonify({'success': False, 'error': 'X column not selected'}), 400
        
        # Create a temporary processor to generate the graph
        processor = SimpleDataProcessor()
        processor.load_input_data(df_data, 'temp_input')
        
        # Verify data was loaded
        df = processor.get_dataframe('temp_input')
        print(f"[GRAPH] Loaded dataframe: {df.shape}, columns={list(df.columns)}")
        
        if x_col not in df.columns:
            return jsonify({'success': False, 'error': f'X column "{x_col}" not found in data. Available: {list(df.columns)}'}), 400
        
        if y_col and y_col not in df.columns:
            return jsonify({'success': False, 'error': f'Y column "{y_col}" not found in data. Available: {list(df.columns)}'}), 400
        
        # For graph generation, we'll use the original workflow service processor
        # since the simple processor doesn't have graph generation
        original_processor = WorkflowService().processor
        original_processor.load_input_data(df_data, 'temp_input')
        graph_url = original_processor.generate_graph('temp_input', graph_type, x_col, y_col, title)
        
        if not graph_url:
            return jsonify({'success': False, 'error': 'Graph generation failed - check backend logs for details'}), 500
        
        print(f"[GRAPH] Generated successfully")
        
        return jsonify({
            'success': True,
            'graph_url': graph_url
        })
    
    except Exception as e:
        print(f"[GRAPH] Error: {str(e)}")  # Detailed error logging
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/export', methods=['POST'])
def export_data():
    """
    Export processed data to CSV or XML format
    Expected payload: { data: [...], format: 'csv'|'xml'|'json', filename: 'output' }
    Returns: { success: true, content: string, mimeType: string, extension: string }
    """
    try:
        data = request.json
        export_data = data.get('data')
        export_format = data.get('format', 'json').lower()
        filename = data.get('filename', 'output')
        
        if not export_data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Convert to DataFrame for easier manipulation
        df = pd.DataFrame(export_data)
        
        if export_format == 'csv':
            # Generate CSV with proper formatting
            # Use StringIO to capture CSV string
            csv_buffer = io.StringIO()
            df.to_csv(csv_buffer, index=False, encoding='utf-8')
            content = csv_buffer.getvalue()
            
            return jsonify({
                'success': True,
                'content': content,
                'mimeType': 'text/csv;charset=utf-8;',
                'extension': 'csv',
                'filename': f"{filename}.csv"
            })
            
        elif export_format == 'xml':
            # Generate XML with proper formatting
            xml_lines = ['<?xml version="1.0" encoding="UTF-8"?>']
            xml_lines.append('<data>')
            
            for _, row in df.iterrows():
                xml_lines.append('  <row>')
                for col in df.columns:
                    # Clean column name for XML tag (remove spaces, special chars)
                    clean_col = str(col).replace(' ', '_').replace('-', '_').replace('(', '').replace(')', '').replace('/', '_')
                    # Escape XML special characters in values
                    value = str(row[col]) if pd.notna(row[col]) else ''
                    value = value.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;').replace("'", '&apos;')
                    xml_lines.append(f'    <{clean_col}>{value}</{clean_col}>')
                xml_lines.append('  </row>')
            
            xml_lines.append('</data>')
            content = '\n'.join(xml_lines)
            
            return jsonify({
                'success': True,
                'content': content,
                'mimeType': 'application/xml;charset=utf-8;',
                'extension': 'xml',
                'filename': f"{filename}.xml"
            })
            
        elif export_format == 'json':
            # Return JSON formatted
            content = json.dumps(export_data, indent=2, ensure_ascii=False)
            
            return jsonify({
                'success': True,
                'content': content,
                'mimeType': 'application/json;charset=utf-8;',
                'extension': 'json',
                'filename': f"{filename}.json"
            })
            
        else:
            return jsonify({'success': False, 'error': f'Unsupported format: {export_format}'}), 400
            
    except Exception as e:
        print(f"Export error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint
    """
    return jsonify({'status': 'healthy', 'service': 'ETL Workflow Backend'})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)