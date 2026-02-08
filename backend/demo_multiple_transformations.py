"""
Demo script to showcase multiple transformations working together
This demonstrates how the backend handles chained transformations
"""

from data_processor_simple import DataProcessor
from workflow_service import WorkflowService
import json


def demo_multiple_transformations():
    """
    Demonstrates how multiple transformations work in sequence
    """
    print("=== ETL Workflow Multiple Transformations Demo ===\n")
    
    # Create a sample dataset
    sample_data = {
        'id': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        'name': ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'],
        'age': [25, 30, 35, 28, 32, 45, 29, 38, 26, 41],
        'salary': [50000, 60000, 70000, 55000, 62000, 80000, 52000, 75000, 48000, 85000],
        'department': ['HR', 'IT', 'IT', 'Finance', 'HR', 'IT', 'Finance', 'IT', 'HR', 'Finance'],
        'email': ['alice@test.com', 'bob@test.com', 'charlie@test.com', 'david@test.com', 
                  'eve@test.com', 'frank@test.com', 'grace@test.com', 'henry@test.com', 
                  'ivy@test.com', 'jack@test.com']
    }
    
    print("Original Data:")
    print(json.dumps(sample_data, indent=2))
    print()
    
    # Initialize processor
    processor = DataProcessor()
    
    # Load initial data
    processor.load_input_data(sample_data, "input_1")
    print("✓ Loaded input data\n")
    
    # Transformation 1: Filter employees older than 30
    filtered_id = processor.apply_transformation(
        "input_1",
        processor.__class__.__dict__['clean_missing'],  # Use clean_missing for demonstration
        strategy="fill",
        fill_value=0
    )
    print("✓ Applied 'clean missing' transformation")
    
    # Actually apply a filter transformation
    filtered_id = processor.apply_transformation(
        "input_1",
        processor.__class__.__dict__['filter_data'],
        column="age",
        condition=">",
        value=30
    )
    print("✓ Applied 'filter age > 30' transformation")
    
    # Transformation 2: Remove duplicates (if any)
    deduped_id = processor.apply_transformation(
        filtered_id,
        processor.__class__.__dict__['remove_duplicates']
    )
    print("✓ Applied 'remove duplicates' transformation")
    
    # Transformation 3: Normalize salary
    normalized_id = processor.apply_transformation(
        deduped_id,
        processor.__class__.__dict__['normalize_column'],
        column="salary",
        method="min_max"
    )
    print("✓ Applied 'normalize salary' transformation")
    
    # Transformation 4: Sort by age
    sorted_id = processor.apply_transformation(
        normalized_id,
        processor.__class__.__dict__['sort_data'],
        columns=["age"],
        ascending=[True]
    )
    print("✓ Applied 'sort by age' transformation")
    
    print(f"\nFinal processed data shape: {processor.get_dataframe(sorted_id).shape}")
    print("Final processed data preview:")
    print(processor.get_dataframe(sorted_id).head())
    
    # Generate a visualization
    try:
        graph_url = processor.generate_graph(
            sorted_id,
            "scatter",
            "age",
            "salary",
            "Age vs Salary"
        )
        print(f"\n✓ Generated visualization (first 50 chars): {graph_url[:50]}...")
    except Exception as e:
        print(f"\n⚠ Could not generate visualization: {e}")
    
    print(f"\n✓ Total transformations applied: {len(processor.transform_history)}")
    print("✓ All transformations completed successfully!")
    
    # Show transformation summary
    summary = processor.get_transform_summary()
    print(f"\nTransformation Summary:")
    print(json.dumps(summary, indent=2))


def demo_chained_workflow():
    """
    Simulates a workflow with chained transformations (like multiple transform nodes connected)
    """
    print("\n" + "="*60)
    print("CHAINED TRANSFORMATIONS WORKFLOW DEMO")
    print("="*60)
    
    # Create a workflow that simulates multiple transform nodes in sequence
    sample_workflow = {
        "_id": "chained_wf_1",
        "name": "Chained Transformations Workflow",
        "definition": {
            "nodes": [
                {
                    "_id": "input_1",
                    "type": "input",
                    "position": {"x": 100, "y": 100},
                    "data": {
                        "file": {
                            "filename": "employees.csv",
                            "fileContent": "id,name,age,salary,department\n1,Alice,25,50000,HR\n2,Bob,30,60000,IT",
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
                    "_id": "transform_2",
                    "type": "transform",
                    "position": {"x": 500, "y": 100},
                    "data": {
                        "transformType": "NORMALIZE",
                        "columnName": "salary",
                        "method": "min_max"
                    }
                },
                {
                    "_id": "transform_3",
                    "type": "transform",
                    "position": {"x": 700, "y": 100},
                    "data": {
                        "transformType": "SORT",
                        "columnName": "salary",
                        "ascending": True
                    }
                },
                {
                    "_id": "output_1",
                    "type": "output",
                    "position": {"x": 900, "y": 100},
                    "data": {
                        "file": {
                            "filename": "processed_employees.csv",
                            "fileContent": "NA",
                            "fileFormat": "csv"
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
                    "target": {"_id": "transform_2"}
                },
                {
                    "_id": "edge_3",
                    "source": {"_id": "transform_2"},
                    "target": {"_id": "transform_3"}
                },
                {
                    "_id": "edge_4",
                    "source": {"_id": "transform_3"},
                    "target": {"_id": "output_1"}
                }
            ]
        }
    }
    
    print("Simulated workflow with chained transformations:")
    print("- Input Node: Loads employee data")
    print("- Transform 1: Filters employees with age > 25")
    print("- Transform 2: Normalizes salary values")
    print("- Transform 3: Sorts by salary")
    print("- Output Node: Saves processed data")
    print()
    
    # Execute the workflow using the service
    service = WorkflowService()
    result = service.execute_workflow(sample_workflow)
    
    print("Workflow execution result:")
    print(json.dumps(result, indent=2))
    
    if result['success']:
        print("\n✓ Chained transformations executed successfully!")
        print("✓ No cycles detected in workflow")
        print("✓ All transformations processed in correct order")
    else:
        print(f"\n✗ Workflow execution failed: {result.get('error', 'Unknown error')}")


if __name__ == "__main__":
    demo_multiple_transformations()
    demo_chained_workflow()