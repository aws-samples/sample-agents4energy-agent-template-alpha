import path from "path";
import * as csv from 'csv-parse';
// import outputs from '../amplify_outputs.json';
import fs from 'fs';
import { S3Client } from "@aws-sdk/client-s3";

import { setAmplifyEnvVars, getConfiguredAmplifyClient } from '../utils/amplifyUtils';
import { setChatSessionId } from '../amplify/functions/tools/toolUtils';
import { loadOutputs } from '../test/utils';
import { stringify } from 'yaml';

// Import tools after setting environment variables
import { pysparkTool } from '../amplify/functions/tools/athenaPySparkTool';
import { createChatSession } from '../amplify/functions/graphql/mutations';
import { readFile } from "../amplify/functions/tools/s3ToolBox";

// Set environment variables first
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
1. Search for well files and create en operational events table
2. Develop a detailed repair procedure and cost estimate. Save these to a file
3. Generate an executive report.
4. If the project is economically attractive, create the project.
`;
}

const main = async () => {
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

        console.log(`Generated analysis prompt for well ${wellApiNumber} (${index + 1}/${highDropWells.length})`);

        console.log(prompt, '\n\n');

        break;// for testing, only process the first well
    }
};

main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});