import { JSDOM } from 'jsdom';
import * as path from 'path';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import outputs from '../amplify_outputs.json'

interface UploadConfig {
    wellApiNumber: string;
    bucketName: string;
    prefix?: string;
}

async function uploadToS3(content: string, key: string, bucketName: string) {
    const s3Client = new S3Client({});
    try {
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: content,
            ContentType: 'text/csv'
        });
        await s3Client.send(command);
        console.log(`Successfully uploaded to s3://${bucketName}/${key}`);
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw error;
    }
}

// // const wellApiNumber = `30-015-27892`
// const wellApiNumber = `30-045-29202`
// const productionUrl = `https://wwwapps.emnrd.nm.gov/OCD/OCDPermitting/Data/ProductionSummaryPrint.aspx?report=csv&api=${wellApiNumber}`

// console.log("Production URL: ", productionUrl)
// const wellFileUrl = `https://ocdimage.emnrd.nm.gov/imaging/WellFileView.aspx?RefType=WF&RefID=${wellApiNumber.replaceAll("-","")}0000`
// console.log('Well File URL: ', wellFileUrl)


async function parseHtmlTableToArrays(htmlContent: string): Promise<string[][] | void> {
    // Create a DOM using jsdom
    const dom = new JSDOM(htmlContent);
    const doc = dom.window.document;
    
    // Find all tables in the document
    const tables = doc.getElementsByTagName('table');
    if (tables.length === 0) return;

    // The first table is the column names
    const columnNameElements = tables[0].getElementsByTagName('tr')[2].getElementsByTagName('td')
    const columnNames = Array.from(columnNameElements).map(element => element.textContent?.trim() || '').slice(0,7);

    const csvRows: string[][] = [columnNames];
    // const dataColumns: {[name: string]: string[]} = {}

    // Iterate through each table
    for (let i = 1; i < tables.length; i++) {
        const cells = tables[i].getElementsByTagName('tr')[0].getElementsByTagName('td');
        // const cellsHeader = tables[i].getElementsByTagName('th');
        
        // Combine all cells in the row
        const rowData: string[] = [];
        
        // // Handle header cells
        // for (let cell of cellsHeader) {
        //     rowData.push(cell.textContent?.trim() || '');
        // }
        
        // Handle data cells
        for (let cell of Array.from(cells).slice(0,7)) {
            rowData.push(cell.textContent?.trim() || '');
        }
        
        // Add the row to our CSV data, properly escaped
        if (rowData.length > 0) {
            csvRows.push(rowData.map(cell => `${cell.replace(/"/g, '""')}`));
        }
    }

    return csvRows;
}

export const uploadCsvProductionData = async (config: UploadConfig) => {  
    const { wellApiNumber, bucketName, prefix = '' } = config;
    const productionUrl = `https://wwwapps.emnrd.nm.gov/OCD/OCDPermitting/Data/ProductionSummaryPrint.aspx?report=csv&api=${wellApiNumber}`
    console.log("Production URL: ", productionUrl)
    
    const response = await fetch(productionUrl)
    const htmlContent = await response.text()

    const csvContent = await parseHtmlTableToArrays(htmlContent);
    if (!csvContent) return

    const csvContentWithDate = [["FirstDayOfMonth", ...csvContent[0]]]

    csvContentWithDate.push(
        ...csvContent.slice(1)
            .filter(row => /^\d+$/.test(row[0])) // Only keep rows where year is purely numeric
            .map(row => ([
                new Date(`${row[2]} 1, ${row[0]}`).toISOString().split('T')[0],
                ...row,
            ]))
    )

    const csvContentString = csvContentWithDate.map(row => row.join(',')).join('\n')
    
    const s3Key = path.join(
        prefix,
        'monthly_production',
        `api=${wellApiNumber.replaceAll('-', '')}`,
        'production.csv'
    ).replace(/\\/g, '/') // Ensure forward slashes for S3 keys

    await uploadToS3(csvContentString, s3Key, bucketName)
}

// Example usage:
if (require.main === module) {
    const config: UploadConfig = {
        wellApiNumber: '30-045-29202',
        bucketName: outputs.storage.bucket_name,
        prefix: 'global/test/production-data'
    };

    if (!config.bucketName) {
        console.error('BUCKET_NAME environment variable is required');
        process.exit(1);
    }

    uploadCsvProductionData(config).catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}