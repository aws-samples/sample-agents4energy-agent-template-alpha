# Structured Data Management Guide

This guide explains how to add structured data (CSV files) to the application through chat sessions for database creation and analysis.

## Upload Structured Data via Chat Sessions

Follow these steps to upload CSV files and create databases for structured data analysis:

### Step 1: Create a Chat Session

1. **Navigate to the Application**
   - Go to your deployed application URL
   - Log in with your user credentials

2. **Start New Chat Session**
   - Click "Create" on the top left of the screen
   - This creates a new chat session with dedicated storage

### Step 2: Create Data Folder in Chat Artifacts

1. **Access Chat Session Storage**
   - Within your chat session, you'll have access to session-specific file storage
   - The AI agent can help you create folders and manage files

2. **Create Data Directory**
   - Ask the agent to create a folder structure for your data:
   ```
   Please create a folder called 'data' in my chat session artifacts for uploading CSV files.
   ```

### Step 3: Upload CSV Files

1. **Upload Data Files**
   - Use the file upload functionality in the chat interface
   - Upload your CSV files to the newly created `data` folder
   - You can upload multiple CSV files at once

2. **Verify Upload**
   - Ask the agent to list the files in your data directory:
   ```
   Can you show me what CSV files are available in my data directory?
   ```

### Step 4: Create Database and Import Data

1. **Request Database Creation**
   - Ask the agent to create a database with a relevant name and import your CSV data:
   ```
   Please create a database called "production_analytics" (or relevant to your data type) and add all the CSV files from my data directory to this database as tables.
   ```

2. **Alternative Detailed Request**
   ```
   I have uploaded CSV files containing [describe your data type, e.g., "well production data"]. Please:
   1. Create a database called "[relevant_database_name]"
   2. Import each CSV file as a separate table
   3. Show me the schema of each table
   4. Provide a summary of the data available
   ```

## Example Workflows for Different Data Types

### Oil & Gas Production Data
```
I've uploaded production data CSV files. Please:
1. Create a database called "well_production_db"
2. Import the CSV files as tables
3. Show me the available wells and their production metrics
4. Create a visualization showing production trends over time
```

### Financial Data
```
I have financial data in CSV format. Please:
1. Create a database called "financial_analytics"  
2. Import all CSV files from the data directory
3. Analyze the data structure and show key metrics
4. Create summary reports with visualizations
```

### Survey Data
```
I've uploaded survey response data. Please:
1. Create a database called "survey_responses"
2. Import the CSV files as normalized tables
3. Analyze response patterns and create insights
4. Generate charts showing key findings
```

## Working with Imported Data

Once your data is imported into a database, you can:

### Query the Database
```
Query the production_analytics database to show me:
- All wells with production > 1000 barrels per day
- Monthly production trends for the top 5 wells
- Wells that show declining production patterns
```

### Generate Analytics
```
Using the data in my database, please:
1. Perform a statistical analysis of production efficiency
2. Identify outliers and unusual patterns  
3. Create predictive models for future production
4. Generate executive summary reports
```

### Create Visualizations
```
Create visualizations from my database that show:
- Production heat maps by location
- Time series charts of key metrics
- Comparative analysis between different wells/assets
- Performance dashboards
```

## Best Practices for Structured Data

### CSV File Preparation
- **Clean Headers**: Use clear, descriptive column names without special characters
- **Consistent Formatting**: Ensure date formats, numbers, and text are consistent
- **Handle Missing Data**: Use consistent markers for missing values (e.g., "NULL", empty cells)
- **File Naming**: Use descriptive filenames that indicate the data content

### Database Naming Conventions
- Use descriptive names that reflect your data domain
- Examples: `oil_production_db`, `financial_reports_db`, `survey_data_db`
- Avoid spaces and special characters in database names

### Data Organization
- **Related Data**: Group related CSV files in the same upload session
- **Documentation**: Include a README or description of your data structure
- **Validation**: Ask the agent to validate data integrity after import

## Troubleshooting

### Upload Issues
- **File Size**: Large CSV files may take longer to upload and process
- **Format Issues**: Ensure CSV files are properly formatted with consistent delimiters
- **Encoding**: Use UTF-8 encoding for files with special characters

### Database Creation Issues
- **Memory Limits**: Very large datasets may require processing in chunks
- **Data Types**: The agent will infer data types, but you can specify if needed
- **Relationships**: For related tables, specify how they should be linked

### Query Performance
- **Indexing**: Ask the agent to create indexes for frequently queried columns
- **Optimization**: For complex queries, the agent can suggest performance improvements
- **Caching**: Results may be cached for repeated similar queries

## Data Security and Privacy

- **Session Isolation**: Each chat session has its own isolated storage
- **Access Control**: Only you can access data within your chat sessions
- **Retention**: Chat session data follows the application's retention policies
- **Sensitive Data**: Be mindful of uploading sensitive information; follow your organization's data policies
