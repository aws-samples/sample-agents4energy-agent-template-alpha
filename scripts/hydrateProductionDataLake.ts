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

    // Process wells in chunks
    const CHUNK_SIZE = 5;
    for (let i = 39781; i < records.length; i += CHUNK_SIZE) {
        const chunk = records.slice(i, i + CHUNK_SIZE);
        const chunkPromises = chunk.map(async (wellData: WellData, index: number) => {
            if (!wellData.API) return;

            const progress = `[${i + index + 1}/${totalWells}]`;
            console.log(`${progress} Processing well: ${wellData['Well Name']} (${wellData.API})`);
            
            try {
                const result = await uploadCsvProductionData({
                    wellApiNumber: wellData.API,
                    bucketName,
                    prefix: 'global/production-data'
                });
                console.log(`${progress} Successfully processed well: ${wellData.API} (${result.rowCount} rows uploaded)`);
            } catch (error) {
                console.error(`${progress} Error processing well ${wellData.API}:`, error);
                // Continue with next well even if one fails
            }
        });

        // Process chunk concurrently
        await Promise.all(chunkPromises);

        // Wait 1 second between chunks to avoid overwhelming the system
        if (i + CHUNK_SIZE < records.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    console.log(`\nCompleted processing all ${totalWells} wells!`);
}

// Run the script
if (require.main === module) {
    const wellsFilePath = path.join(__dirname, '../tmp/NM_wells.csv');
    processWellsFile(wellsFilePath).catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}
