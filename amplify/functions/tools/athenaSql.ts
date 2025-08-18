import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AthenaClient, StartQueryExecutionCommand, GetQueryExecutionCommand, GetQueryResultsCommand } from '@aws-sdk/client-athena';
import { v4 as uuidv4 } from 'uuid';
import { getConfiguredAmplifyClient } from '../../../utils/amplifyUtils';
import { publishResponseStreamChunk } from "../graphql/mutations";
import { getChatSessionId, getChatSessionPrefix } from "./toolUtils";
import { writeFile } from "./s3ToolBox";

// Environment variables
const getAthenaWorkgroup = () => process.env.ATHENA_WORKGROUP_NAME;
const getAthenaDatabase = () => process.env.ATHENA_DATABASE_NAME || 'default';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// Helper function to execute a SQL query and wait for completion
export async function executeSqlQuery(
    athenaClient: AthenaClient,
    sqlQuery: string,
    database: string,
    description: string,
    chatSessionId: string,
    progressIndex: number,
    options: {
        timeoutSeconds?: number,
        waitMessage?: string,
        successMessage?: string,
        failureMessage?: string,
        continueOnFailure?: boolean
    } = {}
): Promise<{
    success: boolean,
    state: string,
    queryExecutionId?: string,
    resultData?: any,
    newProgressIndex: number
}> {
    const {
        timeoutSeconds = 300,
        waitMessage = "⏳ Executing SQL query...",
        successMessage = "✅ Query completed successfully",
        failureMessage = "❌ Query failed",
        continueOnFailure = false
    } = options;

    let currentProgressIndex = progressIndex;

    // Start the query execution
    const clientRequestToken = uuidv4();
    const startCommand = new StartQueryExecutionCommand({
        QueryString: sqlQuery,
        ClientRequestToken: clientRequestToken,
        WorkGroup: getAthenaWorkgroup(),
        QueryExecutionContext: {
            Database: database
        },
        ResultConfiguration: {
            OutputLocation: `s3://${process.env.STORAGE_BUCKET_NAME}/${getChatSessionPrefix()}athena-sql-results/`
        }
    });

    console.log(`Starting SQL query execution: ${description}`);
    const startResponse = await athenaClient.send(startCommand);

    if (!startResponse.QueryExecutionId) {
        await publishProgress(chatSessionId, `${failureMessage}: No query execution ID returned`, currentProgressIndex++);
        return {
            success: false,
            state: 'FAILED',
            newProgressIndex: currentProgressIndex
        };
    }

    const queryExecutionId = startResponse.QueryExecutionId;
    console.log(`Query execution ID: ${queryExecutionId}`);

    // Poll for completion
    await publishProgress(chatSessionId, waitMessage, currentProgressIndex++);
    let finalState = 'QUEUED';
    let resultData = null;
    let resultLocation = null;
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;

    while (
        finalState !== 'SUCCEEDED' &&
        finalState !== 'FAILED' &&
        finalState !== 'CANCELLED' &&
        Date.now() - startTime < timeoutMs
    ) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const getCommand = new GetQueryExecutionCommand({
            QueryExecutionId: queryExecutionId
        });

        try {
            const getResponse = await athenaClient.send(getCommand);
            finalState = getResponse.QueryExecution?.Status?.State || 'UNKNOWN';

            if (getResponse.QueryExecution?.Status?.StateChangeReason) {
                console.log(`State change reason: ${getResponse.QueryExecution.Status.StateChangeReason}`);
            }

            if (getResponse.QueryExecution?.ResultConfiguration?.OutputLocation) {
                resultLocation = getResponse.QueryExecution.ResultConfiguration.OutputLocation;
            }

            if (finalState === 'SUCCEEDED') {
                resultData = {
                    outputLocation: resultLocation,
                    statistics: getResponse.QueryExecution?.Statistics,
                    queryExecutionId: queryExecutionId
                };
            }
        } catch (error) {
            console.error(`Error getting query execution status: ${error}`);
        }

        const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
        console.log(`Query state: ${finalState} (${elapsedSeconds}s elapsed / ${timeoutSeconds}s timeout)`);
    }

    if (finalState === 'SUCCEEDED') {
        await publishProgress(chatSessionId, successMessage, currentProgressIndex++);
        return {
            success: true,
            state: finalState,
            queryExecutionId,
            resultData,
            newProgressIndex: currentProgressIndex
        };
    } else {
        if (!continueOnFailure) {
            await publishProgress(chatSessionId, `${failureMessage}: ${finalState}`, currentProgressIndex++);
        } else {
            await publishProgress(chatSessionId, `⚠️ Warning: ${failureMessage}: ${finalState}`, currentProgressIndex++);
        }

        return {
            success: false,
            state: finalState,
            queryExecutionId,
            resultData,
            newProgressIndex: currentProgressIndex
        };
    }
}

// Helper function to publish progress updates
async function publishProgress(chatSessionId: string, message: string, index: number = 0) {
    try {
        const amplifyClient = getConfiguredAmplifyClient();
        await amplifyClient.graphql({
            query: publishResponseStreamChunk,
            variables: {
                chatSessionId,
                chunkText: message,
                index
            }
        });
        console.log(`Progress update: ${message}`);
    } catch (error) {
        console.info('Error publishing progress update:', error);
    }
}

// Helper function to fetch query results and save to artifacts
export async function fetchQueryResults(
    athenaClient: AthenaClient,
    queryExecutionId: string,
    resultData: any,
    chatSessionId: string,
    progressIndex: number,
    queryDescription: string
): Promise<{
    csvContent: string,
    rowCount: number,
    columnCount: number,
    newProgressIndex: number
}> {
    let currentProgressIndex = progressIndex;

    try {
        await publishProgress(chatSessionId, "📥 Fetching query results...", currentProgressIndex++);

        // Get query results using Athena API
        const getResultsCommand = new GetQueryResultsCommand({
            QueryExecutionId: queryExecutionId,
            MaxResults: 1000 // Limit to prevent memory issues
        });

        const resultsResponse = await athenaClient.send(getResultsCommand);
        
        if (!resultsResponse.ResultSet?.Rows || resultsResponse.ResultSet.Rows.length === 0) {
            await publishProgress(chatSessionId, "⚠️ Query returned no results", currentProgressIndex++);
            return {
                csvContent: '',
                rowCount: 0,
                columnCount: 0,
                newProgressIndex: currentProgressIndex
            };
        }

        const rows = resultsResponse.ResultSet.Rows;
        const columnInfo = resultsResponse.ResultSet.ResultSetMetadata?.ColumnInfo || [];
        
        // Extract column names from the first row or metadata
        const columnNames = columnInfo.map(col => col.Name || 'Unknown');
        const columnCount = columnNames.length;

        // Convert results to CSV format
        let csvContent = columnNames.join(',') + '\n';
        
        // Skip the first row if it contains column headers (which it usually does in Athena results)
        const dataRows = rows.slice(1);
        
        for (const row of dataRows) {
            const values = row.Data?.map(data => {
                const value = data.VarCharValue || '';
                // Escape commas and quotes in CSV
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }) || [];
            csvContent += values.join(',') + '\n';
        }

        const rowCount = dataRows.length;

        // Save results to S3 as CSV
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `data/athena-query-results-${timestamp}.csv`;
        
        await writeFile.invoke({
            filename,
            content: csvContent
        });

        await publishProgress(chatSessionId, `✅ Query results saved to ${filename} (${rowCount} rows, ${columnCount} columns)`, currentProgressIndex++);

        // Also create an HTML table for better visualization
        const htmlFilename = `data/athena-query-results-${timestamp}.html`;
        let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Athena Query Results - ${queryDescription}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        tr:hover { background-color: #f1f1f1; }
        h1 { color: #333; }
        .query-info { background-color: #f0f8ff; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
        .stats { font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <h1>Athena Query Results</h1>
    <div class="query-info">
        <strong>Query Description:</strong> ${queryDescription}<br>
        <strong>Execution ID:</strong> ${queryExecutionId}<br>
        <strong>Results:</strong> ${rowCount} rows, ${columnCount} columns<br>
        <strong>Generated:</strong> ${new Date().toLocaleString()}
    </div>
    <table>
        <thead>
            <tr>
                ${columnNames.map(name => `<th>${name}</th>`).join('')}
            </tr>
        </thead>
        <tbody>
`;

        // Add data rows to HTML (limit to first 100 rows for performance)
        const displayRows = dataRows.slice(0, 100);
        for (const row of displayRows) {
            htmlContent += '<tr>';
            const values = row.Data?.map(data => data.VarCharValue || '') || [];
            for (const value of values) {
                htmlContent += `<td>${value}</td>`;
            }
            htmlContent += '</tr>';
        }

        if (dataRows.length > 100) {
            htmlContent += `<tr><td colspan="${columnCount}" style="text-align: center; font-style: italic; color: #666;">... and ${dataRows.length - 100} more rows (see CSV file for complete results)</td></tr>`;
        }

        htmlContent += `
        </tbody>
    </table>
</body>
</html>
`;

        await writeFile.invoke({
            filename: htmlFilename,
            content: htmlContent
        });

        await publishProgress(chatSessionId, `✅ HTML visualization saved to ${htmlFilename}`, currentProgressIndex++);

        return {
            csvContent,
            rowCount,
            columnCount,
            newProgressIndex: currentProgressIndex
        };

    } catch (error) {
        console.error('Error fetching query results:', error);
        await publishProgress(chatSessionId, `⚠️ Warning: Error while fetching results: ${error}`, currentProgressIndex++);
        return {
            csvContent: '',
            rowCount: 0,
            columnCount: 0,
            newProgressIndex: currentProgressIndex
        };
    }
}

// Function to add Athena SQL tool to MCP server
export function addAthenaSqlTool(server: McpServer) {
    server.registerTool("athenaSqlTool", {
        title: "athenaSqlTool",
        description: `
Use this tool to execute SQL queries against Amazon Athena. The tool will execute the provided SQL query,
wait for completion, and optionally save the results to the chat session artifacts.

Important notes:
- Queries are executed against the configured Athena workgroup and database
- Results are automatically saved as both CSV and HTML files in the chat session artifacts
- The HTML file provides a formatted table view of the results (limited to first 100 rows for performance)
- The CSV file contains the complete results
- Query execution is limited by the specified timeout (default 300 seconds)
- Large result sets are handled efficiently with pagination
- Failed queries will return error details for debugging

Example usage:
- Query data lakes and databases accessible through Athena
- Perform data analysis using standard SQL
- Generate reports from structured data
- Join data across multiple tables and databases

Common SQL patterns:
\`\`\`sql
-- Query a specific table
SELECT * FROM my_database.my_table LIMIT 100;

-- Aggregate data
SELECT column1, COUNT(*) as count 
FROM my_database.my_table 
GROUP BY column1 
ORDER BY count DESC;

-- Join tables
SELECT a.*, b.additional_info 
FROM my_database.table_a a
JOIN my_database.table_b b ON a.id = b.table_a_id;

-- Filter with date ranges
SELECT * FROM my_database.events 
WHERE event_date >= '2024-01-01' 
AND event_date < '2024-02-01';
\`\`\`

Database and table discovery:
\`\`\`sql
-- List available databases
SHOW DATABASES;

-- List tables in a database
SHOW TABLES IN my_database;

-- Describe table structure
DESCRIBE my_database.my_table;
\`\`\`
`,
        inputSchema: {
            sqlQuery: z.string().describe("SQL query to execute against Athena. The query will be executed in the configured database."),
            database: z.string().optional().describe("Database name to execute the query against. If not provided, uses the default configured database."),
            timeout: z.number().optional().default(300).describe("Timeout in seconds for the query execution"),
            description: z.string().optional().describe("Optional description for the query execution"),
            saveResults: z.boolean().optional().default(true).describe("Whether to save query results to chat session artifacts as CSV and HTML files")
        }
    }, async (args) => {
        const { sqlQuery, database, timeout = 300, description = "SQL query execution", saveResults = true } = args;
        let progressIndex = 0;
        const chatSessionId = getChatSessionId();
        
        if (!chatSessionId) {
            throw new Error("Chat session ID not found");
        }

        try {
            // Publish initial message
            await publishProgress(chatSessionId, "🚀 Starting Athena SQL query execution...", progressIndex++);

            // Create Athena client
            const athenaClient = new AthenaClient({ region: AWS_REGION });

            // Use provided database or default
            const targetDatabase = database || getAthenaDatabase();
            
            await publishProgress(chatSessionId, `📊 Executing query against database: ${targetDatabase}`, progressIndex++);

            // Execute the SQL query
            const queryResult = await executeSqlQuery(
                athenaClient,
                sqlQuery,
                targetDatabase,
                description,
                chatSessionId,
                progressIndex,
                {
                    timeoutSeconds: Math.ceil(timeout),
                    waitMessage: `⏳ Executing SQL query...`,
                    successMessage: `✅ Query execution completed!`
                }
            );

            progressIndex = queryResult.newProgressIndex;

            // Check final state
            if (queryResult.success && queryResult.resultData && saveResults) {
                // Fetch and save query results
                const resultsInfo = await fetchQueryResults(
                    athenaClient,
                    queryResult.queryExecutionId!,
                    queryResult.resultData,
                    chatSessionId,
                    progressIndex,
                    description
                );

                progressIndex = resultsInfo.newProgressIndex;

                await publishProgress(chatSessionId, `🎉 SQL query execution completed successfully!`, progressIndex++);

                return {
                    content: [{ 
                        type: "text", 
                        text: JSON.stringify({
                            status: "SUCCEEDED",
                            queryExecutionId: queryResult.queryExecutionId,
                            database: targetDatabase,
                            rowCount: resultsInfo.rowCount,
                            columnCount: resultsInfo.columnCount,
                            statistics: queryResult.resultData.statistics,
                            message: `SQL query executed successfully. Results saved to chat session artifacts.`,
                            files: {
                                csv: `data/athena-query-results-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`,
                                html: `data/athena-query-results-${new Date().toISOString().replace(/[:.]/g, '-')}.html`
                            }
                        })
                    }],
                };
            } else if (queryResult.success && !saveResults) {
                await publishProgress(chatSessionId, `🎉 SQL query execution completed successfully!`, progressIndex++);

                return {
                    content: [{ 
                        type: "text", 
                        text: JSON.stringify({
                            status: "SUCCEEDED",
                            queryExecutionId: queryResult.queryExecutionId,
                            database: targetDatabase,
                            statistics: queryResult.resultData?.statistics,
                            message: `SQL query executed successfully. Results not saved (saveResults=false).`,
                            outputLocation: queryResult.resultData?.outputLocation
                        })
                    }],
                };
            } else {
                await publishProgress(chatSessionId, `❌ Query execution failed with state: ${queryResult.state}`, progressIndex++);

                return {
                    content: [{ 
                        type: "text", 
                        text: JSON.stringify({
                            status: queryResult.state,
                            error: "SQL query execution did not complete successfully",
                            details: "Check the query syntax and database permissions",
                            queryExecutionId: queryResult.queryExecutionId,
                            database: targetDatabase
                        })
                    }],
                };
            }
        } catch (error: any) {
            return {
                content: [{ 
                    type: "text", 
                    text: JSON.stringify({
                        error: `Error executing SQL query: ${error.message}`,
                        suggestion: "Check your SQL syntax and database configuration",
                        database: database || getAthenaDatabase()
                    })
                }],
            };
        }
    });
}
