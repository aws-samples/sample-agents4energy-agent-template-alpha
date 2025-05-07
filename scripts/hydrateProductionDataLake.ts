// Download data from a subset of wells in New Mexico from the following dataset: https://ocd-hub-nm-emnrd.hub.arcgis.com/search?collection=Dataset

import { uploadCsvProductionData } from './uploadCsvProductionDataFromAPI'
import * as fs from 'fs'
import * as path from 'path'
import * as csv from 'csv-parse'
import outputs from '../amplify_outputs.json'

interface WellData {
    API: string;
    'Well Name': string;
    'PLSS Location (ULSTR)': string;
    'Associated Pools': string;
}

async function processWellsFile(filePath: string) {
    // Check for required environment variables
    const bucketName = outputs.storage.bucket_name;
    const apiUsername = process.env.EMNRD_API_USERNAME;
    const apiPassword = process.env.EMNRD_API_PASSWORD;

    if (!bucketName) {
        throw new Error('Bucket name not found in amplify outputs');
    }

    if (!apiUsername || !apiPassword) {
        throw new Error('EMNRD_API_USERNAME and EMNRD_API_PASSWORD environment variables are required');
    }

    // Create credentials object once
    const credentials = {
        UserName: apiUsername,
        Password: apiPassword
    };

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

    // Process wells in chunks (10 wells every 2 seconds ≈ 300 wells/minute)
    const CHUNK_SIZE = 10;
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
        const chunk = records.slice(i, i + CHUNK_SIZE);
        const minimumWeightPromise = new Promise(resolve => setTimeout(resolve, 2000))
        const chunkPromises = chunk.map(async (wellData: WellData, index: number) => {
            if (!wellData.API) return;

            const progress = `[${i + index + 1}/${totalWells}]`;
            console.log(`${progress} Processing well: ${wellData['Well Name']} (${wellData.API})`);
            
            try {
                const result = await uploadCsvProductionData({
                    wellApiNumber: wellData.API,
                    associatedPools: wellData['Associated Pools'],
                    bucketName,
                    prefix: 'global/production-data',
                    credentials
                });
                console.log(`${progress} Successfully processed well: ${wellData.API} (${result.rowCount} rows uploaded)`);
            } catch (error) {
                console.error(`${progress} Error processing well ${wellData.API}:`, error);
                // Continue with next well even if one fails
            }
        });

        // Process chunk concurrently
        await Promise.all([...chunkPromises, minimumWeightPromise]);

        // break; // For testing just process one chunk
    }

    console.log(`\nCompleted processing all ${totalWells} wells!`);
}

// Run the script
if (require.main === module) {
    const wellsFilePath = path.join(__dirname, '../tmp/San_Juan_active_wells.csv');
    processWellsFile(wellsFilePath).catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}
