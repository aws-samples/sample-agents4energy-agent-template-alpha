# Unstructured Data Management Guide

This guide explains how to add unstructured data (PDF files and documents) to the application for analysis and processing by the AI agent.

## Add Unstructured Data to the Application

Follow these steps to upload PDF documents that the AI agent can analyze:

### Step 1: Access Storage Configuration

1. **Navigate to Your Application**
   - Go to the AWS Amplify page: https://us-east-1.console.aws.amazon.com/amplify/apps
   - Click on your application (e.g., "sample-agents4energy-agent-template-alpha")
   - Click on the deployed branch (e.g., "no-guest-access")

2. **Access Storage**
   - Click "Storage" in the left sidebar

### Step 2: Create Folder Structure

1. **Create Global Folder**
   - Click "Create folder"
   - Name the folder "global"
   - Click "Create"

2. **Create Well Files Subfolder**
   - Click on the newly created "global" folder
   - Click "Create folder" again
   - Name the folder "well-files"
   - Click "Create"

### Step 3: Upload PDF Documents

1. **Navigate to Target Folder**
   - Click on the "well-files" folder you just created

2. **Upload Files**
   - Click "Upload"
   - Select the relevant PDF documents from your computer
   - Click "Upload" to start the upload process

3. **Wait for Processing**
   - **Important**: Wait 15 minutes after uploading for the system to process the files
   - The application needs time to index and prepare the documents for AI analysis

## Using the Application with Uploaded Data

After uploading and waiting for processing:

1. **Navigate to the Application**
   - Go to your deployed application URL (e.g., https://no-guest-access.d14p543cy4s7og.amplifyapp.com/)

2. **Log In**
   - Use the credentials created through the user management process
   - Complete the password change if this is your first login

3. **Create New Chat Session**
   - Click "Create" on the top left of the screen
   - This will start a new chat session with the AI agent

## Example Prompts for Data Analysis

Here are example prompts you can try with your uploaded data:

### Basic File Discovery
```
Which wells do you have access to in the global/well-files directory?
```

### Comprehensive Reservoir Analysis
```
Analyze files located in the global/well-files directory to assess the quality of each producing reservoir. Compare reservoir properties in the AHIA and AFREMO fields against those of common reservoirs worldwide. Generate a detailed report with visualizations that highlight key differences and insights.
```

### Database Schema Analysis
```
In the upstream database, look at the column names and number of rows for each table, and make a report which explains what data is available in each table. Include plots of the data for each table.
```

### Reservoir Mapping and Volume Estimation
```
In the upstream database, use the well header table and the geology table to make a contour plot showing reservoir thickness vs extend for each reservoir in the AHIA field. For each producing reservoir, estimate the reservoir volume. Look in the `global/well-files` directory for information about reservoir properties.
```

### Production Data Analysis
```
In the upstream database, look at the production data table and make a report with plots explaining the available data. Focus on what would be important to an oil and gas company.
```

## File Organization Best Practices

### Recommended Folder Structure
```
global/
├── well-files/          # Well-specific PDF documents
├── production-data/     # Production reports and analysis
├── geological-surveys/  # Geological and seismic data
└── regulatory-documents/ # Compliance and regulatory files
```

### Supported File Types
- **PDF Documents**: Primary format for document analysis
- **Text Files**: Plain text documents
- **CSV Files**: Structured data that can be processed by analytics tools

## Data Processing Timeline

- **Upload Time**: Varies based on file size and quantity
- **Processing Time**: Allow 15 minutes after upload completion
- **Availability**: Files become available for AI analysis after processing is complete

## Troubleshooting

### Files Not Appearing in Analysis
1. Verify files are uploaded to the correct folder (`global/well-files/`)
2. Ensure you've waited the full 15 minutes for processing
3. Check file formats are supported (PDF recommended)
4. Verify file sizes are within limits

### Upload Issues
- Check your internet connection for large file uploads
- Ensure you have proper permissions for the storage bucket
- Contact your administrator if upload permissions are restricted

### Analysis Issues
- Try rephrasing your prompts if the AI doesn't find expected data
- Be specific about file locations in your prompts
- Use the exact folder paths when referencing data locations
