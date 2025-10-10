# Federated Data Sources Guide

This guide explains how to configure Amazon Athena federated data sources to enable real-time querying of external databases and enterprise systems directly from the AI agent.

## Overview

Federated data sources allow the AI agent to query data from external systems (SAP, Snowflake, PostgreSQL, etc.) without copying or moving the data. This provides real-time access to enterprise data while maintaining data sovereignty.

## Setting Up Federated Data Sources

### Step 1: Create Federated Data Connection

1. **Navigate to Amazon Athena Console**
   - Go to the Amazon Athena console: https://console.aws.amazon.com/athena/
   - Select your preferred region

2. **Access Data Sources**
   - In the Athena console, click on "Data sources" in the left navigation
   - Click "Create data source"

3. **Choose Data Source Type**
   - Select your data source type from available options:
     - **Amazon RDS** (PostgreSQL, MySQL, etc.)
     - **Amazon Redshift**
     - **Snowflake**
     - **SAP HANA**
     - **Other JDBC-compatible databases**

4. **Configure Connection Details**
   - **Data source name**: Choose a descriptive name (e.g., `sap-production-db`)
   - **Connection details**: Provide connection string, credentials, and other required parameters
   - **Catalog name**: This will be used to reference the data source in queries

5. **Test Connection**
   - Use the "Test connection" feature to verify connectivity
   - Ensure the connection is successful before proceeding

### Step 2: Configure Tag-Based Access Control

Both the Athena data source and the Lambda function must be tagged for the AI agent to access the federated data.

#### Find Your Agent ID

1. **Access Your Application**
   - Log into your deployed application
   - Click on the user icon in the interface
   - Note your unique Agent ID (3-character identifier)

#### Tag the Athena Data Source

1. **Navigate to Data Source**
   - In the Athena console, go to "Data sources"
   - Select your newly created federated data source

2. **Add Tags**
   - Click on the "Tags" tab
   - Click "Add tags"
   - Add the following tag:
     - **Key**: `Allow_<YourAgentID>` (replace `<YourAgentID>` with your actual Agent ID)
     - **Value**: `True`
   - Click "Save tags"

#### Tag the Lambda Function

1. **Find Lambda Function**
   - Navigate to the AWS Lambda console: https://console.aws.amazon.com/lambda/
   - Find the function with "reActAgentlambda" in the name

2. **Add Tags to Lambda**
   - Click on your Lambda function
   - Go to the "Configuration" tab
   - Click on "Tags" in the left sidebar
   - Click "Add tags"
   - Add the same tag:
     - **Key**: `Allow_<YourAgentID>`
     - **Value**: `True`
   - Click "Save"

### Step 3: Verify Configuration

1. **Test Access**
   - Create a new chat session in your application
   - Try a simple query to test the federated connection:
   ```
   Can you show me the available tables in the [your-data-source-name] federated data source?
   ```

2. **Validate Permissions**
   - If the query fails, verify both resources have the correct tags applied
   - Ensure the tag key exactly matches: `Allow_<YourAgentID>` with value `True`

## Using Federated Data Sources

### Basic Queries

Once configured, you can query federated data sources using natural language:

```
Show me all customers from the SAP system with revenue > $100,000
```

```
What are the top 10 products by sales volume in the Snowflake data warehouse?
```

```
Compare this month's production data with last month from the PostgreSQL database
```

### Advanced Analytics

Combine federated data with AI analysis:

```
Analyze sales trends from the Snowflake data warehouse and identify seasonal patterns. Create visualizations showing monthly performance over the last 2 years.
```

```
Query the SAP production database to identify wells with declining output and suggest optimization strategies based on historical performance patterns.
```

### Cross-System Analysis

Query multiple federated sources in a single request:

```
Compare customer data between our CRM system (PostgreSQL) and financial data from SAP. Identify high-value customers who might need attention based on recent transaction patterns.
```

## Supported Data Source Types

### Amazon RDS
- **PostgreSQL**: Full SQL query support
- **MySQL**: Complete table and view access
- **MariaDB**: Standard SQL operations
- **Oracle**: Enterprise features supported

### Data Warehouses
- **Amazon Redshift**: Large-scale analytics
- **Snowflake**: Cloud data warehouse integration
- **Google BigQuery**: Via JDBC connector

### Enterprise Systems
- **SAP HANA**: Real-time enterprise data
- **Microsoft SQL Server**: Windows-based systems
- **IBM Db2**: Mainframe and distributed systems

### Configuration Requirements

Each data source type has specific requirements:

| Data Source | Required Information | Additional Notes |
|-------------|---------------------|------------------|
| PostgreSQL | Host, Port, Database, Username, Password | SSL support available |
| MySQL | Host, Port, Database, Credentials | Multiple schema support |
| Snowflake | Account URL, Database, Schema, Credentials | Requires Snowflake connector |
| SAP HANA | Host, Instance, Username, Password | SAP-specific drivers needed |
| Redshift | Cluster endpoint, Database, Credentials | Native AWS integration |

## Security Best Practices

### Network Security
- **VPC Configuration**: Use VPC endpoints for secure connections
- **Security Groups**: Configure appropriate inbound/outbound rules
- **Encryption**: Enable encryption in transit and at rest

### Authentication
- **Principle of Least Privilege**: Grant minimum necessary permissions
- **Credential Management**: Use AWS Secrets Manager for database credentials
- **Regular Rotation**: Implement credential rotation policies

### Access Control
- **Tag Management**: Regularly audit and update access tags
- **Monitoring**: Set up CloudTrail logging for federated queries
- **Resource Boundaries**: Use tag-based resource boundaries

## Performance Optimization

### Query Performance
- **Indexing**: Ensure source databases have appropriate indexes
- **Query Pushdown**: Leverage Athena's query pushdown capabilities
- **Result Caching**: Enable result caching for frequently accessed data

### Cost Management
- **Query Optimization**: Write efficient queries to reduce data scanned
- **Partitioning**: Use partitioned data sources when possible
- **Scheduling**: Schedule heavy analytical queries during off-peak hours

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to data source
- ✅ Verify connection parameters (host, port, credentials)
- ✅ Check network connectivity and security groups
- ✅ Ensure database server is accessible from AWS

**Problem**: Authentication failures
- ✅ Verify username and password
- ✅ Check if account has necessary permissions
- ✅ Confirm credential format matches requirements

### Permission Issues

**Problem**: Agent cannot access federated data
- ✅ Verify both Athena data source and Lambda function are tagged
- ✅ Ensure tag key exactly matches: `Allow_<YourAgentID>`
- ✅ Confirm tag value is exactly `True` (case-sensitive)
- ✅ Check that Agent ID is correct (3-character identifier)

**Problem**: Partial data access
- ✅ Review database-level permissions for the service account
- ✅ Check table and schema permissions
- ✅ Verify IAM policies for Athena access

### Query Issues

**Problem**: Slow query performance
- ✅ Optimize queries with appropriate WHERE clauses
- ✅ Add indexes to frequently queried columns
- ✅ Consider query result caching
- ✅ Review data source query execution plans

**Problem**: Query timeouts
- ✅ Break large queries into smaller chunks
- ✅ Increase timeout settings if possible
- ✅ Optimize data source indexes and statistics

## Monitoring and Maintenance

### Regular Tasks
- **Tag Audits**: Monthly review of access tags
- **Performance Review**: Quarterly query performance analysis
- **Security Updates**: Keep connectors and drivers updated
- **Cost Analysis**: Regular review of federated query costs

### Monitoring Tools
- **CloudWatch**: Monitor query execution times and errors
- **CloudTrail**: Track federated data access patterns
- **Cost Explorer**: Analyze federated query costs
- **Database Logs**: Monitor source database performance impact

## Getting Help

For additional support:
- **AWS Support**: For Athena and connector issues
- **Database Vendor**: For source database configuration
- **Application Administrator**: For tag and permission management
- **AWS Documentation**: Comprehensive federated query guides
