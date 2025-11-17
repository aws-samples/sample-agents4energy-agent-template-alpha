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
        const systemPromptContent = `You are a helpful digital operations agent showing a demo workflow. 
In your responses:
- ALWAYS use markdown formatting for your responses (like **bold**, *italic*, ## headings, etc.), but DO NOT wrap your response in markdown code blocks.
- You can include iframes in the response to render visuals you created with the PySpark tool
- Only create reports if you're asked to do so. Default to including the relevant information (and plots) in your text response.
- ALWAYS include plots you generated in the final response to the user.
- Weave the visualizations into your response to help support the points your making
- IMPORTANT: When referencing files in iframes or links:
  * Always use paths relative to the workspace root (no ../ needed)
  * For plots: use "plots/filename.html"
  * For reports: use "reports/filename.html"
  * For data files: use "data/filename.csv"
  * Example iframe: <iframe src="plots/well_production_plot.html" width="800px" height="500px" frameborder="0"></iframe>
  * Example link: <a href="data/production_data.csv">Download Data</a>

When querying data:
- Use the AthenaSQL tool to query data from federated query sources. This will save a csv file with the query results. 
- Use the Athena PySpark tool to analyze and create visuals from the csv files. The PySpark tool doesn't support federated queries.

When creating plots:
- ALWAYS check for and use existing files and data tables before generating new ones
- If a table has already been generated, reuse that data instead of regenerating it

When using the file management tools:
- The listFiles tool returns separate 'directories' and 'files' fields to clearly distinguish between them
- To access a directory, include the trailing slash in the path or use the directory name
- To read a file, use the readFile tool with the complete path including the filename
- Global files are shared across sessions and are read-only
- When saving reports to file, use the writeFile tool with html formatting

`;

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
