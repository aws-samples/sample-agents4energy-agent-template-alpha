import path from "path";
import * as csv from 'csv-parse';
// import outputs from '../amplify_outputs.json';
import fs from 'fs';
import { S3Client } from "@aws-sdk/client-s3";

import { setAmplifyEnvVars, getConfiguredAmplifyClient } from '../utils/amplifyUtils';
import { setChatSessionId, setOrigin } from '../amplify/functions/tools/toolUtils';
import { loadOutputs } from '../test/utils';
import { stringify } from 'yaml';

// Import tools after setting environment variables
import { pysparkTool } from '../amplify/functions/tools/athenaPySparkTool';
import { createChatSession, createChatMessage } from '../amplify/functions/graphql/mutations';
// import { listChatMessageByChatSessionIdAndCreatedAt } from '../amplify/functions/graphql/queries';
import { invokeReActAgent, listChatMessageByChatSessionIdAndCreatedAt } from "../utils/graphqlStatements";
import * as APITypes from "../amplify/functions/graphql/API";
import { readFile } from "../amplify/functions/tools/s3ToolBox";

// Set environment variables first`
const outputs = loadOutputs();
process.env.STORAGE_BUCKET_NAME = outputs?.storage?.bucket_name;    
process.env.ATHENA_WORKGROUP_NAME = outputs?.custom?.athenaWorkgroupName;
console.log("Storage Bucket: ", process.env.STORAGE_BUCKET_NAME);
console.log("Athena Workgroup: ", process.env.ATHENA_WORKGROUP_NAME);

const s3Client = new S3Client({ region: outputs.storage.aws_region });

interface ProductionRecord {
    api: string;
    rate_drop: string;
    initial_rate: string;
    final_rate: string;
    step_date: string;
}

interface DeclineCurveParameters {
    initial_production_rate_mcf_per_day: number;
    annual_decline_rate: number;
    decline_exponent: number;
    economic_life_years: number;
}

interface EconomicParameters {
    present_value_fitted_decline_curve_usd: number;
    present_value_production_drop_usd: number;
    present_value_production_wedge_usd: number;
    gas_price_mcf: number;
    operating_cost_usd_per_year: number;
}

interface WellParameters {
    decline_curve_parameters: DeclineCurveParameters;
    economic_parameters: EconomicParameters;
}

// Helper function to format numbers with commas
function formatNumber(num: number): string {
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function generateAnalysisPrompt(props: {well: ProductionRecord, wellParameters: WellParameters}): string {
    const {well, wellParameters} = props;
    const dropRate = parseFloat(well.rate_drop);
    const initialRate = parseFloat(well.initial_rate);
    const finalRate = parseFloat(well.final_rate);
    const date = well.step_date;
    const presentValue = wellParameters.economic_parameters.present_value_fitted_decline_curve_usd;

    return `On ${date}, the well with API number ${well.api} experienced a production rate drop of ${formatNumber(dropRate)} MCF/Day
Production dropped from ${formatNumber(initialRate)} to ${formatNumber(finalRate)} MCF/Day
The present value (10% discount rate) of returning produciton to the previous decline curve is $${formatNumber(presentValue)} USD
1. Search for well files and create an operational events table.
2. Analyze the well's informaton and determine the cause of the production drop. Likely candidates are:
    - Hole in the tubing
    - Artifical lift system failure
    - Debris in the well from the perforations
3. Develop a detailed repair procedure and save it to a file
4. Estimate the cost of the repair and save it to a file
5. Generate an executive report.
    - Include the plot located at 'plots/${well.api}_hyperbolic_decline.html'
    - Include the operational events table. Filter out administrative type events.
6. If the project is economically attractive or more information is needed, create the project.

If you don't have enough information to recommend a project, ask the user for more information or to run a test.
Common tests are:
- Run a fluid shot to determine if there's a hole in the tubing
- If the well is on rod pump, check the dynomonometer card for an indication of downhole pump problems.
`;
}

const main = async () => {
    setOrigin('http://localhost:3001');//This is requred so that reports will correctly link to the other files

    await setAmplifyEnvVars();
    const amplifyClient = getConfiguredAmplifyClient();
    
    // Read and parse CSV
    const productionDropTablePath = path.join(__dirname, '../tmp/productionDropTable.csv');
    const fileContent = fs.readFileSync(productionDropTablePath, 'utf-8');
    const parser = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true
    });

    // Convert parser to array and filter for high rate drops
    const records: ProductionRecord[] = [];
    for await (const record of parser) {
        records.push(record);
    }

    const highDropWells = records.filter(record => parseFloat(record.rate_drop) > 50);
    console.log(`Found ${highDropWells.length} wells with rate drop > 50`);

    // Process each well
    for await (const [index, well] of highDropWells.entries()) {
        //for testing, only process the first 10 wells
        if (index > 5) {
            break;
        }
        const wellApiNumber = well.api;

        // Create a new chat session
        console.log('Creating new chat session');
        const { data: newChatSession, errors: newChatSessionErrors } = await amplifyClient.graphql({
            query: createChatSession,
            variables: {
                input: {
                    name: `Well ${wellApiNumber} Production Drop Analysis`
                }
            }
        });
        if (newChatSessionErrors) {
            console.error(newChatSessionErrors);
            process.exit(1);
        }
        setChatSessionId(newChatSession.createChatSession.id);
        console.log('Created chat session with id: ', newChatSession.createChatSession.id);
        // Read the Python file content
        const declineAndEconomicAnalysisContent = fs.readFileSync(path.join(__dirname, 'wellProductionDropAnalysis.py'), 'utf-8');
        const result = await pysparkTool({}).invoke({
            code: `
production_drop_date = '${well.step_date}'
initial_production_rate_MCFD = float('${well.initial_rate}')
final_production_rate_MCFD = float('${well.final_rate}')
production_drop_rate_MCFD = float('${well.rate_drop}')
well_api_number = '${wellApiNumber}'

path_to_production_data = 'global/production-data/api=${wellApiNumber}/production.csv'

import plotly.io as pio
import plotly.graph_objects as go

# Create a custom layout
custom_layout = go.Layout(
    paper_bgcolor='white',
    plot_bgcolor='white',
    xaxis=dict(showgrid=False),
    yaxis=dict(
        showgrid=True,
        gridcolor='lightgray',
        type='log'  # <-- Set y-axis to logarithmic
    )
)

# Create and register the template
custom_template = go.layout.Template(layout=custom_layout)
pio.templates["white_clean_log"] = custom_template
pio.templates.default = "white_clean_log"

            \n` // this part is done here to dynamically insert the wellApiNumber and production drop off date
                + declineAndEconomicAnalysisContent,
            description: 'Fit a hyperbolic decline curve to the production data',
            scriptPath: path.join('scripts', 'wellProductionDropAnalysis.py'),
        });

        console.log(stringify(JSON.parse(result)));

        const wellParametersFile = JSON.parse(await readFile.invoke({
            filename: `intermediate/well_${wellApiNumber}_parameters.json`,
            startAtByte: -1
        }));
        console.log('Well parameters file: ', wellParametersFile);

        const wellParameters: WellParameters = JSON.parse(wellParametersFile.content);

        // console.log('Well parameters: ', wellParameters);

        const prompt = generateAnalysisPrompt({
            well: well,
            wellParameters: wellParameters
        });

        // const prompt = 'What is 2+2?';

        console.log(`Generated analysis prompt for well ${wellApiNumber} (${index + 1}/${highDropWells.length})`);

        console.log(prompt, '\n\n');

        const {errors: newChatMessageErrors } = await amplifyClient.graphql({
            query: createChatMessage,
            variables: {
                input: {
                    chatSessionId: newChatSession.createChatSession.id,
                    content: {
                        text: prompt
                    },
                    role: APITypes.ChatMessageRole.human
                }
            }
        });

        if (newChatMessageErrors) {
            console.error(newChatMessageErrors);
            process.exit(1);
        }

        const invokeReActAgentResponse = await amplifyClient.graphql({
            query: invokeReActAgent,
            variables: {
                chatSessionId: newChatSession.createChatSession.id,
                userId: 'test-user'
            },
        });

        console.log('Invoke ReAct Agent Response: ', invokeReActAgentResponse);

        if (invokeReActAgentResponse.errors) {
            console.error(invokeReActAgentResponse.errors);
            process.exit(1);
        }

        console.log('Chat session id: ', newChatSession.createChatSession.id);

        // Get the last message and check if it's from the assistant and has completed. Loop until we get a complete response.
        let responseComplete = false;
        const waitStartTime = Date.now();
        while (!responseComplete) {
            const { data, errors: lastMessageErrors } = await amplifyClient.graphql({
                query: listChatMessageByChatSessionIdAndCreatedAt,
                variables: {
                    chatSessionId: newChatSession.createChatSession.id,
                    sortDirection: APITypes.ModelSortDirection.DESC,
                    limit: 1
                }
            });
            if (lastMessageErrors) {
                console.error(lastMessageErrors);
                process.exit(1);
            }

            const messages = data.listChatMessageByChatSessionIdAndCreatedAt.items;
            if (messages.length > 0) {
                const lastMessage = messages[0];
                responseComplete = lastMessage.responseComplete || false;
                if (responseComplete) console.log('Assistant response complete. Final response: \n', lastMessage.content?.text);
            }

            if (!responseComplete) {
                const elapsedSeconds = Math.floor((Date.now() - waitStartTime) / 1000);
                console.log(`Waiting for assistant response... (${elapsedSeconds} seconds)`);
                // Wait 20 seconds before checking again
                await new Promise(resolve => setTimeout(resolve, 20000));
            }
        }
        // break; // for testing, only process the first well
    }
};

main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});