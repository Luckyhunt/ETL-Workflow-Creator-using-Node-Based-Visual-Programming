# ETL Workflow Creator using Node-Based Visual Programming

A visual, node-based ETL (Extract, Transform, Load) workflow builder that allows users to create data processing pipelines through an intuitive drag-and-drop interface. Built with React + TypeScript frontend and Python Flask backend.

![ETL Workflow Creator](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![Python](https://img.shields.io/badge/Python-3.8+-3776AB?logo=python)
![Flask](https://img.shields.io/badge/Flask-2.3+-000000?logo=flask)

## Features

### Visual Workflow Builder
- **Drag-and-drop interface** for creating data processing pipelines
- **Node-based architecture** with Input, Transform, and Output nodes
- **Real-time connection** between nodes to define data flow
- **Interactive node configuration** with intuitive parameter settings

### Data Processing Capabilities
- **File Input/Output Support**: CSV, JSON, XML formats with export options
- **Data Transformations**:
  - Filter (with conditions like >, <, ==, etc.)
  - Drop/Rename Columns
  - Handle Missing Values (fill with mean/mode)
  - Remove Duplicates
  - Normalize Data (Min-Max, Z-Score)
  - Sort and Group By
  - Text Operations (Uppercase, Lowercase, Trim)
  - Data Type Conversions
- **Data Visualization**: Generate Bar, Line, Scatter, Pie, and Histogram charts
- **Smart Data Type Detection**: Automatically detects numeric, categorical, boolean, and date types
- **Automatic Encoding**: One-hot encoding for categorical data with ≤10 unique values, label encoding otherwise

### Workflow Management
- **Cycle Detection**: Prevents circular dependencies in workflows
- **Topological Execution**: Nodes execute in correct dependency order
- **Real-time Preview**: See data transformations instantly
- **Graph Generation**: Visualize processed data with customizable charts

## Project Structure

```
ETL-Workflow-Creator/
├── backend/                  # Python Flask API
│   ├── api.py               # Flask API endpoints
│   ├── data_processor_simple.py  # Data processing logic
│   ├── workflow_service.py  # Workflow execution engine
│   ├── requirements.txt     # Python dependencies
│   └── setup.py            # Package setup
│
├── client/                  # React + TypeScript Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts (WorkflowContext)
│   │   ├── editorComponents/  # Node editor components
│   │   ├── engine/         # Workflow engine logic
│   │   ├── pages/          # Application pages
│   │   ├── services/       # API service functions
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Utility functions
│   ├── package.json        # Node.js dependencies
│   └── vite.config.ts     # Vite configuration
│
└── README.md               # This file
```

## Tech Stack

### Frontend
- **React 19** - UI library
- **TypeScript 5.9** - Type-safe JavaScript
- **Vite 7** - Build tool and dev server
- **React Router 7** - Client-side routing
- **React Icons** - Icon library
- **UUID** - Unique ID generation

### Backend
- **Flask 2.3+** - Python web framework
- **Flask-CORS** - Cross-origin resource sharing
- **Pandas 1.5+** - Data manipulation and analysis
- **NumPy 1.21+** - Numerical computing
- **Matplotlib 3.5+** - Data visualization
- **Seaborn 0.11+** - Statistical data visualization

## Prerequisites

- **Python 3.8 or higher**
- **Node.js 18 or higher**
- **npm or yarn** (npm comes with Node.js)

## Installation & Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/Luckyhunt/ETL-Workflow-Creator-using-Node-Based-Visual-Programming.git
cd ETL-Workflow-Creator-using-Node-Based-Visual-Programming
```

### Step 2: Setup Backend

```bash
cd backend

# Create a virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### Step 3: Setup Frontend

```bash
cd ../client

# Install Node.js dependencies
npm install
```

## Running the Application

### Step 1: Start the Backend Server

```bash
cd backend

# Activate virtual environment if not already activated
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

# Run the Flask API
python api.py
```

The backend server will start at `http://localhost:5000`

Health check endpoint: `http://localhost:5000/health`

### Step 2: Start the Frontend Development Server

Open a new terminal window/tab:

```bash
cd client

# Start the Vite dev server
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Step 3: Open in Browser

Navigate to `http://localhost:5173` to use the application.

## Usage Guide

### Creating a Workflow

1. **Add Input Node**
   - Drag an Input node to the canvas
   - Upload a CSV, JSON, or XML file
   - Preview data to verify correct parsing

2. **Add Transform Nodes**
   - Connect Input node to Transform nodes
   - Configure transformations:
     - Select column to transform
     - Choose transformation type
     - Set parameters (conditions, values, etc.)
   - Chain multiple transformations

3. **Add Output Node**
   - Connect the final Transform node to an Output node
   - View processed data results
   - Generate visualizations

4. **Execute Workflow**
   - Click the "Execute" or "Run" button
   - View real-time execution status
   - Inspect results at each node

### Supported File Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| CSV    | .csv      | Comma-separated values |
| JSON   | .json     | JavaScript Object Notation |
| XML    | .xml      | Extensible Markup Language |

### Available Transformations

| Category | Transformations |
|----------|-----------------|
| **Filter** | Greater than (>), Less than (<), Equal to (==), Not equal to (!=), Greater/Less than or equal (>=, <=). Formats: `> 25` or `>25` |
| **Column Ops** | Drop column, Rename column |
| **Missing Data** | Fill with value/mean/median/mode, Forward/backward fill |
| **Duplicates** | Remove duplicate rows |
| **Normalize** | Min-Max scaling, Z-Score standardization |
| **Sort** | Ascending, Descending |
| **Group By** | Aggregate functions (sum, mean, count, etc.) |
| **Text** | Uppercase, Lowercase, Trim whitespace, Remove special chars |
| **Type Cast** | Convert to numeric, Convert to string, **Round numbers (with decimal places)**, **Format numbers (with decimal places)** |
| **Extract** | Extract numbers, Extract strings |

### Graph Types

- **Bar Chart** - Compare categorical data
- **Line Chart** - Show trends over time/sequence
- **Scatter Plot** - Show relationships between variables
- **Pie Chart** - Show proportional data
- **Histogram** - Show data distribution

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/workflow/execute` | POST | Execute complete workflow |
| `/api/workflow/transform` | POST | Apply single transformation |
| `/api/preprocess/full` | POST | Full data preprocessing |
| `/api/graph/generate` | POST | Generate visualization |

## Development

### Backend Development

```bash
cd backend
python -m pytest  # Run tests (if available)
python demo_multiple_transformations.py  # Run demo
```

### Frontend Development

```bash
cd client
npm run lint      # Run ESLint
npm run build     # Build for production
npm run preview   # Preview production build
```

## Troubleshooting

### Common Issues

1. **Backend Connection Error**
   - Ensure Flask server is running on port 5000
   - Check that CORS is properly configured

2. **File Upload Fails**
   - Verify file format is CSV, JSON, or XML
   - Check file encoding (UTF-8 recommended)

3. **Node.js Dependencies Issues**
   - Delete `node_modules` folder and `package-lock.json`
   - Run `npm install` again

4. **Python Import Errors**
   - Ensure virtual environment is activated
   - Run `pip install -r requirements.txt` again

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source. See [LICENSE](LICENSE) for details.

## Acknowledgments

- React Flow for node-based UI inspiration
- Pandas for powerful data manipulation
- Flask for lightweight API framework

## Contact

For questions or support, please open an issue on GitHub:
https://github.com/Luckyhunt/ETL-Workflow-Creator-using-Node-Based-Visual-Programming/issues
