import { Construct } from 'constructs';
import cdk, {
    aws_iam as iam,
    custom_resources,
} from 'aws-cdk-lib';

export interface SeedDataProps {
    settingsTable: cdk.aws_dynamodb.ITable;
}

export class SeedDataConstruct extends Construct {
    constructor(scope: Construct, id: string, props: SeedDataProps) {
        super(scope, id);

        // System prompt content to seed
        const systemPromptContent = `You are a helpful llm agent showing a demo workflow. 
Use markdown formatting for your responses (like **bold**, *italic*, ## headings, etc.), but DO NOT wrap your response in markdown code blocks.

List the files in the global/notes directory for guidance on how to respond to the user.
Create intermediate files to store your planned actions, thoughts and work. Use the writeFile tool to create these files. 
Store them in the 'intermediate' directory. After you complete a planned step, record the results in the file.

When querying data:
- Use the AthenaSQL tool to query data from federated query sources. This will save a csv file with the query results. 
- Use the Athena PySpark tool to analyze and create visuals from the csv files. The PySpark tool doesn't support federated queries.

When creating plots:
- ALWAYS check for and use existing files and data tables before generating new ones
- If a table has already been generated, reuse that data instead of regenerating it

When creating reports:
- Use iframes to display plots or graphics
- Use the writeFile tool to create the first draft of the report file
- Use html formatting for the report
- Put reports in the 'reports' directory
- IMPORTANT: When referencing files in HTML (links or iframes):
  * Always use paths relative to the workspace root (no ../ needed)
  * For plots: use "plots/filename.html"
  * For reports: use "reports/filename.html"
  * For data files: use "data/filename.csv"
  * Example iframe: <iframe src="plots/well_production_plot.html" width="100%" height="500px" frameborder="0"></iframe>
  * Example link: <a href="data/production_data.csv">Download Data</a>

When using the file management tools:
- The listFiles tool returns separate 'directories' and 'files' fields to clearly distinguish between them
- To access a directory, include the trailing slash in the path or use the directory name
- To read a file, use the readFile tool with the complete path including the filename
- Global files are shared across sessions and are read-only
- When saving reports to file, use the writeFile tool with html formatting

When using the textToTableTool:
- IMPORTANT: For simple file searches, just use the identifying text (e.g., "15_9_19_A") as the pattern
- IMPORTANT: Don't use this file on structured data like csv files. Use the pysparkTool instead.
- The tool will automatically add wildcards and search broadly if needed
- For global files, you can use "global/pattern" OR just "pattern" - the tool handles both formats
- Examples of good patterns:
  * "15_9_19_A" (finds any file containing this text)
  * "reports" (finds any file containing "reports")
  * ".*\\\\.txt$" (finds all text files)
  * "data/.*\\\\.yaml$" (finds YAML files in the data directory)
- Define the table columns with a clear description of what to extract
- Results are automatically sorted by date if available (chronological order)
- Use dataToInclude/dataToExclude to prioritize certain types of information
- When reading well reports, always include a column for a description of the well event`;

        // Create a custom resource to seed the Settings table with the system prompt
        new custom_resources.AwsCustomResource(scope, 'SystemPromptSeedData', {
            onCreate: {
                service: 'DynamoDB',
                action: 'putItem',
                parameters: {
                    TableName: props.settingsTable.tableName,
                    Item: {
                        name: { S: 'system_prompt' },
                        value: { S: systemPromptContent },
                        id: { S: 'system_prompt_setting' },
                        __typename: { S: 'Settings' },
                        createdAt: { S: '2024-01-01T00:00:00.000Z' },
                        updatedAt: { S: '2024-01-01T00:00:00.000Z' },
                        owner: { S: 'system' },
                    }
                },
                physicalResourceId: custom_resources.PhysicalResourceId.of('SystemPromptSeedData')
            },
            onUpdate: {
                service: 'DynamoDB',
                action: 'putItem',
                parameters: {
                    TableName: props.settingsTable.tableName,
                    Item: {
                        name: { S: 'system_prompt' },
                        value: { S: systemPromptContent },
                        id: { S: 'system_prompt_setting' },
                        __typename: { S: 'Settings' },
                        createdAt: { S: '2024-01-01T00:00:00.000Z' },
                        updatedAt: { S: '2024-01-01T00:00:00.000Z' },
                        owner: { S: 'system' },
                    }
                },
                physicalResourceId: custom_resources.PhysicalResourceId.of('SystemPromptSeedData')
            },
            policy: custom_resources.AwsCustomResourcePolicy.fromStatements([
                new iam.PolicyStatement({
                    actions: ['dynamodb:PutItem'],
                    resources: [props.settingsTable.tableArn],
                }),
            ]),
        });
    }
}
