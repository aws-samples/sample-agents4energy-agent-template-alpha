// Download data from a subset of wells in New Mexico from the following dataset: https://ocd-hub-nm-emnrd.hub.arcgis.com/search?collection=Dataset

import { uploadCsvProductionData } from './uploadCsvProductionData'
import * as fs from 'fs'
import * as path from 'path'
import * as csv from 'csv-parse'
import outputs from '../amplify_outputs.json'

interface WellData {
    API: string;
    'Well Name': string;
    'PLSS Location (ULSTR)': string;
}

async function processWellsFile(filePath: string) {
    const bucketName = outputs.storage.bucket_name;
    if (!bucketName) {
        throw new Error('Bucket name not found in amplify outputs');
    }

    // Read and parse the CSV file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const parser = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true
    });

    // Convert parser to array to get total count
    const records = [];
    for await (const record of parser) {
        records.push(record);
    }
    const totalWells = records.length;
    console.log(`Starting to process ${totalWells} wells...`);

    for (let i = 0; i < records.length; i++) {
        const wellData = records[i] as WellData;
        if (!wellData.API) continue;

        const progress = `[${i + 1}/${totalWells}]`;
        console.log(`${progress} Processing well: ${wellData['Well Name']} (${wellData.API})`);
        
        try {
            await uploadCsvProductionData({
                wellApiNumber: wellData.API,
                bucketName,
                prefix: 'global/production-data'
            });
            console.log(`${progress} Successfully processed well: ${wellData.API}`);
        } catch (error) {
            console.error(`${progress} Error processing well ${wellData.API}:`, error);
            // Continue with next well even if one fails
        }

        // //exit for loop for testing
        // break;

        //Wait 1 second between wells
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\nCompleted processing all ${totalWells} wells!`);
}

// Run the script
if (require.main === module) {
    const wellsFilePath = path.join(__dirname, '../tmp/wellsIn30N6W.csv');
    processWellsFile(wellsFilePath).catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}
