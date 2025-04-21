import path from "path";
import * as csv from 'csv-parse';
import outputs from '../amplify_outputs.json';
import fs from 'fs';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: outputs.storage.aws_region });

interface ProductionRecord {
    api: string;
    rate_drop: string;
    initial_rate?: string;
    final_rate?: string;
    date?: string;
}

function generateAnalysisPrompt(well: ProductionRecord): string {
    const dropRate = parseFloat(well.rate_drop);
    const initialRate = well.initial_rate ? parseFloat(well.initial_rate) : undefined;
    const finalRate = well.final_rate ? parseFloat(well.final_rate) : undefined;
    const date = well.date || '2023-08-01'; // Default date if not provided

    return `On ${date}, the well with API number ${well.api} experienced a significant production rate drop of ${dropRate.toFixed(0)} MCF/Day${
        initialRate && finalRate ? `, reducing from ${initialRate.toFixed(0)} to approximately ${finalRate.toFixed(0)} MCF/Day` : ''
    }.
1. Search for well files and create en operational events table
2. Query historic production rates
4. Fit a hyperbolic decline curve.
5. Create plot with oil, gas, and water production data. Add operational events to the plot as points with tool tips describing the operation.
6. Develop a detailed repair procedure and cost estimate. Save these to a file
7. Generate an executive report.
8. If the project is economically attractive, create the project.
`;
}

const main = async () => {
    const productionDropTablePath = path.join(__dirname, '../tmp/productionDropTable.csv');

    // Read and parse CSV
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
    for (const [index, well] of highDropWells.entries()) {
        //for testing, only process the first 10 wells
        if (index > 5) {
            break;
        }
        const wellApiNumber = well.api;
        const prompt = generateAnalysisPrompt(well);
        
        // Save prompt to a file
        const promptFileName = `well_${wellApiNumber}_analysis_prompt.txt`;
        const promptFilePath = path.join(__dirname, '../tmp/prompts', promptFileName);
        
        // Ensure the prompts directory exists
        fs.mkdirSync(path.join(__dirname, '../tmp/prompts'), { recursive: true });
        
        // Write the prompt to a file
        fs.writeFileSync(promptFilePath, prompt);
        console.log(`Generated analysis prompt for well ${wellApiNumber} (${index + 1}/${highDropWells.length})`);
        
        console.log(prompt, '\n\n');
    }
};

main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});