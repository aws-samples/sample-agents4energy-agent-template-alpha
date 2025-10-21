# Data Management Overview

This guide provides a comprehensive overview of the three data management strategies available in the application, helping you choose the right approach for your data integration needs.

## Three Data Management Strategies

The application supports three distinct approaches for data integration and analysis:

### 1. 📄 Unstructured Data Management
**Best for:** PDF documents, reports, manuals, and text-based content

- **How it works:** Upload PDF files to global storage folders for AI analysis
- **Use cases:** Document analysis, report extraction, manual processing
- **Processing time:** 15 minutes after upload
- **Access method:** Direct file system access through global folders

[**→ See Unstructured Data Management Guide**](unstructured-data-management.md)

### 2. 📊 Structured Data Management  
**Best for:** CSV files, tabular data, and datasets for database creation

- **How it works:** Upload CSV files through chat sessions and create databases dynamically
- **Use cases:** Data analytics, custom database creation, ad-hoc analysis
- **Processing time:** Immediate after upload
- **Access method:** AI agent creates and manages databases from your CSV files

[**→ See Structured Data Management Guide**](structured-data-management.md)

### 3. 🔗 Federated Data Sources
**Best for:** Direct connections to existing databases and enterprise systems

- **How it works:** Configure Amazon Athena federated connections to query source systems directly
- **Use cases:** Real-time data access, enterprise system integration, live reporting
- **Processing time:** Real-time queries
- **Access method:** Direct federated queries to source systems

[**→ See Federated Data Sources Guide**](federated-data-sources.md)

## Choosing the Right Strategy

### Use Unstructured Data When:
- ✅ You have PDF reports, manuals, or documents to analyze
- ✅ Content is primarily text-based and narrative
- ✅ You need document search and content extraction
- ✅ Data doesn't need to be queried like a database

### Use Structured Data When:
- ✅ You have CSV files or tabular data
- ✅ You want to create custom databases for specific projects
- ✅ Data is for one-time or periodic analysis
- ✅ You need full control over database structure and content

### Use Federated Data Sources When:
- ✅ You need real-time access to existing databases
- ✅ Data is frequently updated in source systems
- ✅ You want to avoid data duplication
- ✅ You need to query large datasets that shouldn't be copied

## Integration Workflows

### Combined Analysis Approach
You can combine multiple strategies for comprehensive analysis:

```
Example: Oil & Gas Production Analysis
1. Federated Data: Live production data from SAP system
2. Structured Data: Historical CSV files uploaded for trend analysis  
3. Unstructured Data: PDF geological reports and regulatory documents

Prompt: "Analyze current production from the federated SAP connection, compare with historical trends from my uploaded CSV data, and cross-reference findings with the geological reports in the global/well-files directory."
```

### Data Pipeline Strategy
Create systematic data flows using multiple approaches:

1. **Current State**: Query federated sources for real-time data
2. **Historical Context**: Use structured data for historical comparisons
3. **Documentation**: Reference unstructured data for context and insights

## Security and Access Control

All three strategies use the same security model:

- **Authentication**: AWS Cognito user authentication required
- **Authorization**: Tag-based access control with `Allow_<AgentID>=True`
- **Isolation**: User-scoped access to data and resources
- **Encryption**: Data encrypted at rest and in transit

## Performance Considerations

| Strategy | Data Volume | Query Speed | Setup Complexity | Real-time |
|----------|-------------|-------------|------------------|-----------|
| Unstructured | Medium | Medium | Low | No |
| Structured | Medium | Fast | Low | No |  
| Federated | Large | Fast | High | Yes |

## Getting Started

1. **Start Simple**: Begin with structured data upload for immediate results
2. **Add Documents**: Upload relevant PDF documents for comprehensive analysis
3. **Scale Up**: Configure federated connections for enterprise-scale data access

## Best Practices

### Data Organization
- Use consistent naming conventions across all strategies
- Document your data sources and their purposes
- Plan your folder structures before uploading data

### Performance Optimization
- For large datasets, prefer federated connections over data uploads
- Use structured data for frequently accessed analytical datasets
- Reserve unstructured data for reference materials and documentation

### Security Management
- Regularly review and update access tags
- Monitor data access patterns and usage
- Follow your organization's data governance policies

## Support and Troubleshooting

For strategy-specific troubleshooting:
- **Unstructured Data Issues**: See the [Unstructured Data Guide](unstructured-data-management.md#troubleshooting)
- **Structured Data Issues**: See the [Structured Data Guide](structured-data-management.md#troubleshooting)
- **Federated Connection Issues**: See the [Federated Data Guide](federated-data-sources.md#troubleshooting)

For general data management questions, consult your system administrator or refer to the AWS documentation for the underlying services.
