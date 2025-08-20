import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AthenaClient, StartQueryExecutionCommand, GetQueryExecutionCommand, GetQueryResultsCommand, GetQueryExecutionCommandOutput } from '@aws-sdk/client-athena';
import { v4 as uuidv4 } from 'uuid';
import { getConfiguredAmplifyClient } from '../../../utils/amplifyUtils';
import { publishResponseStreamChunk } from "../graphql/mutations";
import { getChatSessionId, getChatSessionPrefix } from "./toolUtils";
import { writeFile } from "./s3ToolBox";

// Environment variables
const getAthenaWorkgroup = () => process.env.ATHENA_SQL_WORKGROUP_NAME;
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
): Promise<GetQueryExecutionCommandOutput> {
    const {
        timeoutSeconds = 300,
        waitMessage = "⏳ Executing SQL query...",
        successMessage = "✅ Query completed successfully",
        failureMessage = "❌ Query failed",
        continueOnFailure = false
    } = options;

    let currentProgressIndex = progressIndex;

    // Start the query execution
    const startCommand = new StartQueryExecutionCommand({
        QueryString: sqlQuery,
        WorkGroup: getAthenaWorkgroup(),
        QueryExecutionContext: {
            Database: database
        },
        ResultConfiguration: {
            OutputLocation: `s3://${process.env.STORAGE_BUCKET_NAME}/${getChatSessionPrefix()}athena-sql-results/`,
        }
    });

    console.log(`Starting SQL query execution: ${description}`);
    const startResponse = await athenaClient.send(startCommand);

    if (!startResponse.QueryExecutionId) {
        await publishProgress(chatSessionId, `${failureMessage}: No query execution ID returned`, currentProgressIndex++);
        throw new Error(`${failureMessage}: No query execution ID returned`);
    }

    const queryExecutionId = startResponse.QueryExecutionId;
    console.log(`Query execution ID: ${queryExecutionId}`);

    // Poll for completion
    await publishProgress(chatSessionId, waitMessage, currentProgressIndex++);
    let finalState = 'QUEUED';
    let getQueryExecutionResponse: GetQueryExecutionCommandOutput;
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

        getQueryExecutionResponse = await athenaClient.send(getCommand);

        finalState = getQueryExecutionResponse.QueryExecution?.Status?.State || 'UNKNOWN';

        const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
        console.log(`Query state: ${finalState} (${elapsedSeconds}s elapsed / ${timeoutSeconds}s timeout)`);
    }

    // Handle final state and publish appropriate progress message
    if (finalState === 'SUCCEEDED') {
        await publishProgress(chatSessionId, successMessage, currentProgressIndex++);
    } else if (finalState === 'FAILED' || finalState === 'CANCELLED') {
        if (!continueOnFailure) {
            await publishProgress(chatSessionId, `${failureMessage}: ${finalState}`, currentProgressIndex++);
        } else {
            await publishProgress(chatSessionId, `⚠️ Warning: ${failureMessage}: ${finalState}`, currentProgressIndex++);
        }
    } else {
        // Timeout case
        await publishProgress(chatSessionId, `⚠️ Query execution timed out after ${timeoutSeconds} seconds`, currentProgressIndex++);
    }

    return getQueryExecutionResponse!;
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
    queryDescription: string,
    csvFileName?: string
): Promise<{
    csvContent: string,
    rowCount: number,
    columnCount: number,
    newProgressIndex: number,
    sampleRows: any[],
    savedFileName: string
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
                newProgressIndex: currentProgressIndex,
                sampleRows: [],
                savedFileName: ''
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

        // Capture first 20 rows for sample data
        const sampleRows = dataRows.slice(0, 20).map(row => {
            const rowObject: { [key: string]: string } = {};
            const values = row.Data?.map(data => data.VarCharValue || '') || [];
            columnNames.forEach((columnName, index) => {
                rowObject[columnName] = values[index] || '';
            });
            return rowObject;
        });

        // Determine filename - use custom name if provided, otherwise generate timestamp-based name
        let filename: string;
        if (csvFileName) {
            // Ensure the filename has .csv extension and is in the data directory
            const cleanFileName = csvFileName.endsWith('.csv') ? csvFileName : `${csvFileName}.csv`;
            filename = cleanFileName.startsWith('data/') ? cleanFileName : `data/${cleanFileName}`;
        } else {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            filename = `data/athena-query-results-${timestamp}.csv`;
        }

        await writeFile.invoke({
            filename,
            content: csvContent
        });

        await publishProgress(chatSessionId, `✅ Query results saved to ${filename} (${rowCount} rows, ${columnCount} columns)`, currentProgressIndex++);

        return {
            csvContent,
            rowCount,
            columnCount,
            newProgressIndex: currentProgressIndex,
            sampleRows,
            savedFileName: filename
        };

    } catch (error) {
        console.error('Error fetching query results:', error);
        await publishProgress(chatSessionId, `⚠️ Warning: Error while fetching results: ${error}`, currentProgressIndex++);
        return {
            csvContent: '',
            rowCount: 0,
            columnCount: 0,
            newProgressIndex: currentProgressIndex,
            sampleRows: [],
            savedFileName: ''
        };
    }
}


// Function to add Athena SQL tool to MCP server
export function addAthenaSqlTool(server: McpServer) {
    server.registerTool("athenaSqlTool", {
        title: "athenaSqlTool",
        description: `
Use this tool to execute SQL queries against Amazon Athena. The tool will execute the provided SQL query,
wait for completion, and optionally save the results to the chat session artifacts as a CSV file.

Important notes:
- Queries are executed against the configured Athena workgroup and database
- Results are saved as CSV files in the chat session artifacts
- You can specify a custom filename for the CSV file using the csvFileName parameter
- Query execution is limited by the specified timeout (default 300 seconds)
- Large result sets are handled efficiently with pagination
- Failed queries will return error details for debugging

Example usage:
- Query data lakes and databases accessible through Athena
- Perform data analysis using standard SQL
- Generate reports from structured data
- Join data across multiple tables and databases
- Save results with meaningful filenames like 'anomalyDetectionResults.csv'

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
            saveResults: z.boolean().optional().default(true).describe("Whether to save query results to chat session artifacts as CSV file"),
            csvFileName: z.string().optional().describe("Custom filename for the CSV file (e.g., 'anomalyDetectionResults.csv'). If not provided, a timestamp-based filename will be used.")
        }
    }, async (args) => {
        const { sqlQuery, database, timeout = 300, description = "SQL query execution", saveResults = true, csvFileName } = args;
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

            const finalState = queryResult.QueryExecution?.Status?.State;
            const queryExecutionId = queryResult.QueryExecution?.QueryExecutionId;

            // Check final state
            if (finalState === 'SUCCEEDED' && queryExecutionId && saveResults) {
                // Fetch and save query results
                const resultsInfo = await fetchQueryResults(
                    athenaClient,
                    queryExecutionId,
                    queryResult,
                    chatSessionId,
                    progressIndex + 3, // Approximate progress after query execution
                    description,
                    csvFileName
                );

                await publishProgress(chatSessionId, `🎉 SQL query execution completed successfully!`, resultsInfo.newProgressIndex);

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            status: "SUCCEEDED",
                            queryExecutionId: queryExecutionId,
                            database: targetDatabase,
                            rowCount: resultsInfo.rowCount,
                            columnCount: resultsInfo.columnCount,
                            statistics: queryResult.QueryExecution?.Statistics,
                            message: `SQL query executed successfully. Results saved to chat session artifacts.`,
                            files: {
                                csv: resultsInfo.savedFileName
                            },
                            sampleRows: resultsInfo.sampleRows
                        })
                    }],
                };
            } else if (finalState === 'SUCCEEDED' && !saveResults) {
                await publishProgress(chatSessionId, `🎉 SQL query execution completed successfully!`, progressIndex + 3);

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            status: "SUCCEEDED",
                            queryExecutionId: queryExecutionId,
                            database: targetDatabase,
                            statistics: queryResult.QueryExecution?.Statistics,
                            message: `SQL query executed successfully. Results not saved (saveResults=false).`,
                            outputLocation: queryResult.QueryExecution?.ResultConfiguration?.OutputLocation
                        })
                    }],
                };
            } else {
                await publishProgress(chatSessionId, `❌ Query execution failed with state: ${finalState}`, progressIndex + 3);

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            status: finalState || 'UNKNOWN',
                            error: "SQL query execution did not complete successfully",
                            details: queryResult.QueryExecution?.Status?.StateChangeReason,
                            queryExecutionId: queryExecutionId,
                            database: targetDatabase,
                            sqlQuery: sqlQuery,
                            workgroup: getAthenaWorkgroup()
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
                        database: database || getAthenaDatabase(),
                        sqlQuery: sqlQuery,
                        progressIndex: progressIndex
                    })
                }],
            };
        }
    });
}
