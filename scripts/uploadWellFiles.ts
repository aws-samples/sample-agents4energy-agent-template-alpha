import path from "path";
import * as csv from 'csv-parse';
import outputs from '../amplify_outputs.json';
import fs from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

const s3Client = new S3Client({ region: outputs.storage.aws_region });

interface ProductionRecord {
    api: string;
    rate_drop: string;
}

const downloadFile = async (url: string, outputPath: string) => {
    const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream'
    });

    await pipeline(response.data, fs.createWriteStream(outputPath));
};

const uploadToS3 = async (filePath: string, bucketName: string, s3Key: string) => {
    const fileStream = createReadStream(filePath);
    
    const uploadParams = {
        Bucket: bucketName,
        Key: s3Key,
        Body: fileStream,
        ContentType: 'application/pdf'
    };

    await s3Client.send(new PutObjectCommand(uploadParams));
};

const extractPDFLinks = async (wellFileUrl: string) => {
    const response = await axios.get(wellFileUrl);
    const $ = cheerio.load(response.data);
    
    return $('a[href$=".pdf"]')
        .map((_, el) => $(el).attr('href'))
        .get()
        .filter((href): href is string => href !== undefined);
};

const main = async () => {
    const storageBucketName = outputs.storage.bucket_name;
    const productionDropTablePath = path.join(__dirname, '../tmp/productionDropTable.csv');

    // Create tmp directory for downloads if it doesn't exist
    const tmpDir = path.join(__dirname, '../tmp/downloads');
    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
    }

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
        const wellApiNumber = well.api;
        const wellFileUrl = `https://ocdimage.emnrd.nm.gov/imaging/WellFileView.aspx?RefType=WF&RefID=${wellApiNumber.replaceAll("-","")}0000`;
        const progress = `[${index + 1}/${highDropWells.length}]`;
        console.log(`${progress} Processing well ${wellApiNumber}`);
        console.log('Well File URL: ', wellFileUrl);

        try {
            // Get PDF links
            const pdfLinks = await extractPDFLinks(wellFileUrl);
            console.log(`${progress} Found ${pdfLinks.length} PDF files`);

            // Get list of existing files in S3 for this well
            const prefix = `global/well-files/api=${wellApiNumber}/`;
            let existingFileNames = new Set<string>();
            let continuationToken: string | undefined;

            do {
                const listCommand = new ListObjectsV2Command({
                    Bucket: storageBucketName,
                    Prefix: prefix,
                    ContinuationToken: continuationToken
                });
                const response = await s3Client.send(listCommand);
                
                // Add this batch of files to our set
                response.Contents?.forEach(file => {
                    if (file.Key) {
                        existingFileNames.add(file.Key.replace(prefix, ''));
                    }
                });

                // Set up for next iteration if there are more results
                continuationToken = response.NextContinuationToken;
            } while (continuationToken);

            // Filter the pdfLinks to only include the ones that are not already in S3
            const filteredPdfLinks = pdfLinks.filter(pdfUrl => {
                const filename = path.basename(pdfUrl);
                return !existingFileNames.has(filename);
            });

            // Process each PDF
            for (const [pdfIndex, pdfUrl] of filteredPdfLinks.entries()) {
                const filename = path.basename(pdfUrl);
                const downloadPath = path.join(tmpDir, filename);
                const s3Key = `global/well-files/api=${wellApiNumber}/${filename}`;

                // // Check if the file already exists in S3
                // const existingFile = await s3Client.send(new GetObjectCommand({
                //     Bucket: storageBucketName,
                //     Key: s3Key
                // }));

                // if (existingFile) {
                //     console.log(`${progress} File already exists in S3: ${s3Key}`);
                //     continue;
                // }

                console.log(`${progress} Downloading ${filename} (${pdfIndex + 1}/${pdfLinks.length})`);
                await downloadFile(pdfUrl, downloadPath);

                console.log(`${progress} Uploading to S3: ${s3Key}`);
                await uploadToS3(downloadPath, storageBucketName, s3Key);

                // Clean up downloaded file
                fs.unlinkSync(downloadPath);
            }
        } catch (error) {
            console.error(`${progress} Error processing well ${wellApiNumber}:`, error);
        }

        // Wait 1 second between wells to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
};

main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});