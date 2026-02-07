from setuptools import setup, find_packages

setup(
    name="etl-workflow-backend",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "pandas>=1.5.0",
        "numpy>=1.21.0",
        "matplotlib>=3.5.0",
        "seaborn>=0.11.0",
        "flask>=2.0.0",
        "flask-cors>=3.0.0"
    ],
    author="ETL Workflow Creator Team",
    description="Backend for ETL Workflow Creator using Node-Based Visual Programming",
    python_requires=">=3.7",
)