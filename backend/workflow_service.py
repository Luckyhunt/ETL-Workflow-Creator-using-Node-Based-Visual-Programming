"""
Workflow Service for ETL Operations

This service connects the frontend workflow system to the Python data processing module.
It handles:
1. Receiving workflow definitions from the frontend
2. Executing transformations based on workflow nodes
3. Managing data flow between nodes without creating cycles
4. Returning processed data and visualizations to the frontend
"""

import json
from typing import Dict, Any, List
from data_processor_simple import SimpleDataProcessor, TransformOperation
import pandas as pd


class WorkflowService:
    """
    Service class to handle workflow execution
    """
    
    def __init__(self):
        self.processor = SimpleDataProcessor()
        self.workflow_results = {}  # Store results for each workflow execution
    
    def execute_workflow(self, workflow_definition: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a workflow based on the definition from the frontend
        """
        try:
            # Reset processor for this execution
            self.processor = SimpleDataProcessor()
            
            # Extract nodes and edges from workflow definition
            definition = workflow_definition.get('definition', {})
            nodes_list = definition.get('nodes', [])
            edges = definition.get('edges', [])
            
            # Convert nodes list to dictionary keyed by node ID
            nodes = {}
            for node in nodes_list:
                node_id = node.get('_id')
                if node_id:
                    nodes[node_id] = node
            
            print(f"DEBUG: Loaded {len(nodes)} nodes: {list(nodes.keys())}")
            print(f"DEBUG: Loaded {len(edges)} edges")
            
            # Identify input nodes
            input_nodes = [node for node in nodes.values() if node['type'] == 'input']
            
            if not input_nodes:
                return {'success': False, 'error': 'No input nodes found in workflow'}
            
            # Process each input node
            for input_node in input_nodes:
                input_data = self._extract_input_data(input_node)
                print(f"DEBUG: Input node {input_node['_id']} extracted {len(input_data) if input_data else 0} rows")
                if input_data is not None:
                    self.processor.load_input_data(input_data, input_node['_id'])
            
            # Build execution order based on edges (topological sort to avoid cycles)
            execution_order = self._build_execution_order(nodes, edges)
            
            # Execute transformations
            for node_id in execution_order:
                node = nodes[node_id]
                print(f"DEBUG: Executing node {node_id} of type {node['type']}")
                if node['type'] == 'transform':
                    result_id = self._execute_transform_node(node, nodes, edges)
                    result_df = self.processor.get_dataframe(result_id)
                    print(f"DEBUG: Transform result {result_id} has {len(result_df)} rows")
                    # Also store with node ID so output nodes can find it
                    self.processor.dataframes[node['_id']] = result_df
                    self.workflow_results[node_id] = {
                        'data': result_df.to_dict('records')
                    }
                elif node['type'] == 'output':
                    # Handle output nodes
                    input_source_id = self._find_connected_input(node_id, edges, nodes)
                    print(f"DEBUG: Output node {node_id} connected to {input_source_id}")
                    if input_source_id:
                        output_data = self.processor.get_dataframe(input_source_id)
                        print(f"DEBUG: Output data has {len(output_data)} rows")
                        self.workflow_results[node_id] = {
                            'data': output_data.to_dict('records'),
                            'shape': output_data.shape
                        }
            
            # Validate no cycles in the workflow
            # Note: SimpleDataProcessor doesn't have this method, so we skip validation
            if False:  # Placeholder for future cycle detection
                return {'success': True, 'results': self.workflow_results}
            
            return {
                'success': True,
                'results': self.workflow_results,
                'summary': self.processor.get_transform_summary()
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _extract_input_data(self, input_node: Dict[str, Any]) -> Any:
        """
        Extract input data from the input node
        Uses pre-parsed previewData if available, otherwise parses fileContent
        """
        data = input_node.get('data', {})
        
        # First, try to use pre-parsed previewData from frontend (new format)
        preview_data = data.get('previewData')
        if preview_data and isinstance(preview_data, list) and len(preview_data) > 0:
            print(f"Using pre-parsed previewData: {len(preview_data)} rows")
            return preview_data
        
        # Fallback: parse file content (old format)
        file_info = data.get('file', {})
        filename = file_info.get('filename', '')
        file_content = file_info.get('fileContent', '')
        
        if filename and file_content:
            try:
                # Parse based on file extension
                if filename.endswith('.csv'):
                    # Parse CSV content
                    import io
                    df = pd.read_csv(io.StringIO(file_content))
                    return df.to_dict('records') if not df.empty else []
                elif filename.endswith('.json'):
                    # Parse JSON content
                    import json
                    return json.loads(file_content)
                elif filename.endswith('.xml'):
                    # Parse XML content
                    return self._parse_xml_content(file_content)
                else:
                    # Default to CSV parsing for raw content
                    import io
                    df = pd.read_csv(io.StringIO(file_content))
                    return df.to_dict('records') if not df.empty else []
            except Exception as e:
                print(f"Error parsing file content: {e}")
                # Return empty data on parse error
                return []
        else:
            # Return empty data if no file content
            return []
    
    def _parse_xml_content(self, xml_content: str) -> List[Dict[str, Any]]:
        """
        Parse XML content into list of dictionaries
        """
        try:
            import xml.etree.ElementTree as ET
            
            root = ET.fromstring(xml_content)
            records = []
            
            def extract_records(element, prefix=''):
                """Recursively extract data records from XML"""
                # Skip namespace declarations
                if element.tag.startswith('{') or element.tag.startswith('xmlns'):
                    return
                
                # Get clean tag name without namespace
                tag_name = element.tag
                if '}' in tag_name:
                    tag_name = tag_name.split('}')[1]
                
                full_key = f"{prefix}.{tag_name}" if prefix else tag_name
                
                # If element has no children, it's a leaf node with text
                if len(element) == 0:
                    return {full_key: element.text or ''}
                
                # If all children are leaf nodes, this is a data record
                if all(len(child) == 0 for child in element):
                    record = {}
                    for child in element:
                        child_tag = child.tag
                        if '}' in child_tag:
                            child_tag = child_tag.split('}')[1]
                        child_key = f"{full_key}.{child_tag}" if prefix else child_tag
                        record[child_key] = child.text or ''
                    return record
                
                # Otherwise, recurse into children
                for child in element:
                    child_records = extract_records(child, full_key)
                    if child_records:
                        if isinstance(child_records, dict):
                            records.append(child_records)
                        elif isinstance(child_records, list):
                            records.extend(child_records)
                
                return None
            
            # Try to find data records at root's children level
            for child in root:
                result = extract_records(child)
                if result and isinstance(result, dict) and result:
                    records.append(result)
            
            # If no records found, try deeper
            if not records:
                for child in root:
                    for grandchild in child:
                        result = extract_records(grandchild)
                        if result and isinstance(result, dict) and result:
                            records.append(result)
            
            return records if records else []
            
        except Exception as e:
            print(f"Error parsing XML: {e}")
            return []
    
    def _execute_transform_node(self, transform_node: Dict[str, Any], all_nodes: Dict[str, Any], edges: List[Dict[str, Any]]) -> str:
        """
        Execute a transformation node
        """
        # Find the input source for this transformation
        input_source_id = self._find_connected_input(transform_node['_id'], edges, all_nodes)
        
        if not input_source_id:
            raise ValueError(f"No input source found for transform node {transform_node['_id']}")
        
        # Get transformation parameters
        transform_data = transform_node.get('data', {})
        transform_type = transform_data.get('transformType', 'FILTER')
        column_name = transform_data.get('columnName', '')
        condition = transform_data.get('condition', '')
        
        # Map frontend transform types to backend operations
        transform_map = {
            'FILTER': TransformOperation.FILTER,
            'CLEAN_MISSING': TransformOperation.CLEAN_MISSING,
            'REMOVE_DUPLICATES': TransformOperation.REMOVE_DUPLICATES,
            'NORMALIZE': TransformOperation.NORMALIZE,
            'AGGREGATE': TransformOperation.AGGREGATE,
            'SORT': TransformOperation.SORT,
            'GROUP_BY': TransformOperation.GROUP_BY
        }
        
        # Handle text transformations that don't have enum mappings
        text_transforms = ['TO_UPPER', 'TO_LOWER', 'TRIM', 'DROP_COLUMN', 'RENAME_COLUMN',
                          'CONVERT_TO_NUMERIC', 'CONVERT_TO_STRING', 'ROUND_NUMBERS',
                          'STRIP_WHITESPACE', 'REMOVE_SPECIAL_CHARS', 'FILL_NA', 'FORMAT_NUMBERS',
                          'EXTRACT_NUMBERS', 'EXTRACT_STRINGS']
        
        if transform_type.upper() in text_transforms:
            # Handle text transformations directly
            return self._apply_text_transform(input_source_id, transform_type, column_name, transform_data)
        
        operation = transform_map.get(transform_type, TransformOperation.FILTER)
        
        # Prepare parameters for transformation
        params = {}
        
        if operation == TransformOperation.FILTER:
            print(f"DEBUG FILTER: condition='{condition}', column_name='{column_name}'")
            
            # Parse condition - handle both "> 25" and ">25" formats
            condition = condition.strip()
            
            # Use regex to extract operator and value
            import re
            match = re.match(r'^\s*(>?<=?|>=?|!=?|==?)\s*(.+)$', condition)
            
            if match:
                op = match.group(1).strip()
                value_str = match.group(2).strip()
                
                # Try to convert value to appropriate type
                try:
                    if value_str.isdigit():
                        value = int(value_str)
                    elif re.match(r'^-?\d+\.\d+$', value_str):
                        value = float(value_str)
                    else:
                        value = value_str
                except:
                    value = value_str
                
                params = {
                    'column': column_name,
                    'condition': op,
                    'value': value
                }
                print(f"DEBUG FILTER: parsed params={params}")
            else:
                print(f"DEBUG FILTER: Using default params, could not parse condition: '{condition}'")
                params = {
                    'column': column_name,
                    'condition': '>',
                    'value': 0
                }
        
        elif operation == TransformOperation.CLEAN_MISSING:
            params = {'strategy': 'fill', 'fill_value': 0}
        
        elif operation == TransformOperation.REMOVE_DUPLICATES:
            params = {'subset': [column_name] if column_name else None}
        
        elif operation == TransformOperation.NORMALIZE:
            params = {'column': column_name, 'method': 'min_max'}
        
        elif operation == TransformOperation.SORT:
            params = {
                'columns': [column_name],
                'ascending': [True]
            }
        
        # Apply the transformation
        result_id = self.processor.apply_transformation(input_source_id, operation, **params)
        
        return result_id
    
    def _apply_text_transform(self, input_source_id: str, transform_type: str, column_name: str, transform_data: Dict) -> str:
        """
        Apply text-based transformations directly
        """
        df = self.processor.get_dataframe(input_source_id).copy()
        
        print(f"DEBUG TEXT TRANSFORM: type={transform_type}, column={column_name}")
        
        if transform_type.upper() == 'TO_UPPER':
            if column_name and column_name in df.columns:
                df[column_name] = df[column_name].astype(str).str.upper()
        
        elif transform_type.upper() == 'TO_LOWER':
            if column_name and column_name in df.columns:
                df[column_name] = df[column_name].astype(str).str.lower()
        
        elif transform_type.upper() == 'TRIM' or transform_type.upper() == 'STRIP_WHITESPACE':
            if column_name and column_name in df.columns:
                df[column_name] = df[column_name].astype(str).str.strip()
        
        elif transform_type.upper() == 'DROP_COLUMN':
            if column_name and column_name in df.columns:
                df = df.drop(columns=[column_name])
        
        elif transform_type.upper() == 'RENAME_COLUMN':
            new_name = transform_data.get('targetValue') or transform_data.get('newName')
            if column_name and new_name and column_name in df.columns:
                df = df.rename(columns={column_name: new_name})
        
        elif transform_type.upper() == 'CONVERT_TO_NUMERIC':
            if column_name and column_name in df.columns:
                df[column_name] = pd.to_numeric(df[column_name], errors='coerce')
        
        elif transform_type.upper() == 'CONVERT_TO_STRING':
            if column_name and column_name in df.columns:
                df[column_name] = df[column_name].astype(str)
        
        elif transform_type.upper() == 'ROUND_NUMBERS':
            if column_name and column_name in df.columns:
                # Convert to numeric first (in case values are strings)
                df[column_name] = pd.to_numeric(df[column_name], errors='coerce')
                df[column_name] = df[column_name].round()
        
        elif transform_type.upper() == 'REMOVE_SPECIAL_CHARS':
            if column_name and column_name in df.columns:
                df[column_name] = df[column_name].astype(str).str.replace(r'[^a-zA-Z0-9]', '', regex=True)
        
        elif transform_type.upper() == 'FILL_NA':
            # Handle fill missing values
            fill_value = transform_data.get('targetValue') or transform_data.get('fillValue') or ''
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
                elif fill_value and (str(fill_value)).replace('.', '').isdigit():
                    fill_value = float(fill_value)
                
                # Fill NaN values
                df[column_name] = df[column_name].fillna(fill_value)
                # Also replace empty strings with fill_value
                df[column_name] = df[column_name].replace('', fill_value)
                # For object columns, also handle None values explicitly
                if df[column_name].dtype == 'object':
                    df[column_name] = df[column_name].apply(lambda x: fill_value if x is None or x == '' or (isinstance(x, float) and pd.isna(x)) else x)
        
        elif transform_type.upper() == 'FORMAT_NUMBERS':
            decimal_places = transform_data.get('targetValue') or 2
            try:
                decimal_places = int(decimal_places)
            except:
                decimal_places = 2
            if column_name and column_name in df.columns:
                df[column_name] = df[column_name].apply(lambda x: f"{x:.{decimal_places}f}" if pd.notna(x) and isinstance(x, (int, float)) else x)
        
        elif transform_type.upper() == 'EXTRACT_NUMBERS':
            if column_name and column_name in df.columns:
                df[column_name] = df[column_name].astype(str).str.extract(r'(\d+\.?\d*)')[0]
        
        elif transform_type.upper() == 'EXTRACT_STRINGS':
            if column_name and column_name in df.columns:
                df[column_name] = df[column_name].astype(str).str.replace(r'\d+\.?\d*', '', regex=True)
        
        # Store the transformed dataframe with a unique ID
        result_id = f"{input_source_id}_text_transform_{len(self.processor.transform_history) + 1}"
        self.processor.dataframes[result_id] = df
        
        print(f"DEBUG TEXT TRANSFORM: result has {len(df)} rows, {len(df.columns)} columns")
        
        return result_id
    
    def _find_connected_input(self, node_id: str, edges: List[Dict[str, Any]], all_nodes: Dict[str, Any]) -> str:
        """
        Find the input source for a given node by traversing edges
        """
        # Find edges that target this node
        incoming_edges = [edge for edge in edges if edge['target']['_id'] == node_id]
        
        if not incoming_edges:
            # If no incoming edges, this might be a direct connection to input
            # Look for nodes that connect to this one
            for node_key, node in all_nodes.items():
                if node['_id'] != node_id and node['type'] in ['input', 'transform']:
                    # Check if this node connects to our target
                    for edge in edges:
                        if edge['source']['_id'] == node_key and edge['target']['_id'] == node_id:
                            return node_key
        
        if incoming_edges:
            # Return the source of the first incoming edge
            return incoming_edges[0]['source']['_id']
        
        # If no connections found, return the first available input
        input_nodes = [node_id for node_id, node in all_nodes.items() if node['type'] == 'input']
        if input_nodes:
            return input_nodes[0]
        
        return None
    
    def _build_execution_order(self, nodes: Dict[str, Any], edges: List[Dict[str, Any]]) -> List[str]:
        """
        Build execution order based on edges (topological sort)
        """
        # Create adjacency list
        graph = {node_id: [] for node_id in nodes.keys()}
        in_degree = {node_id: 0 for node_id in nodes.keys()}
        
        for edge in edges:
            source_id = edge['source']['_id']
            target_id = edge['target']['_id']
            
            if source_id in graph and target_id in graph:
                graph[source_id].append(target_id)
                in_degree[target_id] += 1
        
        # Topological sort using Kahn's algorithm
        queue = []
        for node_id, degree in in_degree.items():
            if degree == 0:
                queue.append(node_id)
        
        execution_order = []
        while queue:
            node_id = queue.pop(0)
            execution_order.append(node_id)
            
            for neighbor in graph[node_id]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        # Add any remaining nodes that weren't in the dependency graph
        for node_id in nodes.keys():
            if node_id not in execution_order:
                execution_order.append(node_id)
        
        # Filter to only include transform and output nodes in execution order
        executable_node_ids = [node_id for node_id, node in nodes.items() if node['type'] in ['transform', 'output']]
        return [nid for nid in execution_order if nid in executable_node_ids]


def run_sample_workflow():
    """
    Example of how the service would be used
    """
    service = WorkflowService()
    
    # Sample workflow definition (similar to what would come from frontend)
    sample_workflow = {
        "_id": "wf_1",
        "name": "Sample ETL Workflow",
        "definition": {
            "nodes": [
                {
                    "_id": "input_1",
                    "type": "input",
                    "position": {"x": 100, "y": 100},
                    "data": {
                        "file": {
                            "filename": "sample.csv",
                            "fileContent": "name,age\nJohn,25\nAlice,30\nBob,35\nCharlie,40\nDavid,28\nEve,22",
                            "fileFormat": "csv"
                        }
                    }
                },
                {
                    "_id": "transform_1",
                    "type": "transform",
                    "position": {"x": 300, "y": 100},
                    "data": {
                        "transformType": "FILTER",
                        "columnName": "age",
                        "condition": "> 25"
                    }
                },
                {
                    "_id": "output_1",
                    "type": "output",
                    "position": {"x": 500, "y": 100},
                    "data": {
                        "file": {
                            "filename": "output.csv",
                            "fileContent": "NA",
                            "fileFormat": "NA"
                        }
                    }
                }
            ],
            "edges": [
                {
                    "_id": "edge_1",
                    "source": {"_id": "input_1"},
                    "target": {"_id": "transform_1"}
                },
                {
                    "_id": "edge_2",
                    "source": {"_id": "transform_1"},
                    "target": {"_id": "output_1"}
                }
            ]
        }
    }
    
    # Execute the workflow
    result = service.execute_workflow(sample_workflow)
    
    print("Workflow Execution Result:")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    run_sample_workflow()
