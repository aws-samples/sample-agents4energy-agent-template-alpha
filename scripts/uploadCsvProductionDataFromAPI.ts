import { JSDOM } from 'jsdom';
import * as path from 'path';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import outputs from '../amplify_outputs.json'

interface UploadConfig {
    wellApiNumber: string;
    associatedPools: string;
    bucketName: string;
    prefix?: string;
    credentials: LoginCredentials;
}

interface UploadResult {
    rowCount: number;
}

interface LoginCredentials {
    UserName: string;
    Password: string;
}

interface RefreshCredentials {
    UserName: string;
    RefreshToken: string;
}

interface Tokens {
    AccessToken: string;
    RefreshToken: string;
    AccessTokenExpirationDate: string;
    RefreshTokenExpirationDate: string;
}

let currentTokens: Tokens | null = null;
let tokenExpirationTime: number | null = null;

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

async function login(credentials: LoginCredentials): Promise<Tokens> {
    const response = await fetch('https://api.emnrd.nm.gov/wda/v1/OCD/Permitting/Authorization/Token/LoginCredentials', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
    });

    if (!response.ok) {
        throw new Error(`Login failed: ${response.statusText}`);
    }

    const tokens = await response.json();

    tokenExpirationTime = Date.now() + (tokens.expiresIn * 1000);
    return tokens;
}

async function refreshToken(refreshCredentials: RefreshCredentials): Promise<Tokens> {
    const response = await fetch('https://api.emnrd.nm.gov/wda/v1/OCD/Permitting/Authorization/Token/RefreshToken', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(refreshCredentials),
    });

    if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const tokens = await response.json();
    tokenExpirationTime = Date.now() + (tokens.expiresIn * 1000);
    return tokens;
}

async function getValidToken(credentials: LoginCredentials): Promise<string> {
    // If we have a token and it's not expired (with 60s buffer), return it
    if (currentTokens && tokenExpirationTime && Date.now() < tokenExpirationTime - 60000) {
        return currentTokens.AccessToken;
    }

    // If we have a refresh token, try to use it
    if (currentTokens?.RefreshToken) {
        try {
            currentTokens = await refreshToken({
                UserName: credentials.UserName,
                RefreshToken: currentTokens.RefreshToken
            });
            return currentTokens.AccessToken;
        } catch (error) {
            console.log('Token refresh failed, attempting new login');
        }
    }

    // If we get here, we need to do a fresh login
    currentTokens = await login(credentials);
    return currentTokens.AccessToken;
}

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchProductionData(wellApiNumber: string, credentials: LoginCredentials): Promise<any[]> {
    // Format API number: remove dashes and ensure proper 10-digit format
    let correctedApiNumber = wellApiNumber.replaceAll('-','');
    // If it's less than 10 digits, pad with leading zeros
    correctedApiNumber = correctedApiNumber.padStart(10, '0');
    // If it's more than 10 digits, take the last 10 digits
    if (correctedApiNumber.length > 10) {
        correctedApiNumber = correctedApiNumber.slice(-10);
    }
    const requestedUrl = `https://api.emnrd.nm.gov/wda/v1/OCD/Permitting/WellProduction/ProductionInjection/Detail/${correctedApiNumber}`
    console.log(`Fetching production for well ${correctedApiNumber}`)
    console.log(`Requested URL: ${requestedUrl}`)
    const token = await getValidToken(credentials);
    const response = await fetch(
        requestedUrl, 
        {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }
    );

    if (!response.ok) {
        if (response.status === 401) {
            // Token might have just expired, try one more time
            const newToken = await getValidToken(credentials);
            const retryResponse = await fetch(
                requestedUrl,
                {
                    headers: {
                        'Authorization': `Bearer ${newToken}`
                    }
                }
            );
            if (!retryResponse.ok) {
                throw new Error(`Failed to fetch production data: ${retryResponse.statusText}`);
            }
            return await retryResponse.json();
        }
        throw new Error(`Failed to fetch production data: ${response.statusText}`);
    }

    return await response.json();
}

function convertToCSV(data: any[]): string[][] {
    if (!data || data.length === 0) return [[]];

    // Define the columns we want to extract
    const columns = [
        'ProductionYear',
        'ProductionMonth',
        'OilProduced',
        'GasProduced',
        'WaterProduced',
        'GasInjected',
        'WaterInjected',
        'CO2Injected',
        'Days'
    ];

    // Create header row with column names
    const csvRows: string[][] = [[...columns, 'PoolName']];

    // Convert each data row
    data.forEach(row => {
        const csvRow = columns.map(col => row[col]?.toString() || '');
        csvRow.push(row.Pool.PoolName);
        csvRows.push(csvRow);
    });

    return csvRows;
}

export const uploadCsvProductionData = async (config: UploadConfig): Promise<UploadResult> => {  
    const { wellApiNumber, bucketName, prefix = '', credentials, associatedPools } = config;
    
    

    console.log(`Fetching production data for well API: ${wellApiNumber}`);
    
    const productionData = await fetchProductionData(wellApiNumber, credentials);
    const csvContent = convertToCSV(productionData);

    // console.log('csv content: ', csvContent)

    if (csvContent.length <= 1) {
        console.log('No production data found for this well');
        return { rowCount: 0 };
    }

    const csvContentWithDate = [["Date", ...csvContent[0]]];

    const dataRows = csvContent.slice(1)
        .map(row => ([
            new Date(`${row[1]} 1, ${row[0]}`).toISOString().split('T')[0],
            ...row,
        ]));
    
    csvContentWithDate.push(...dataRows);

    // const csvContentString = csvContentWithDate.map(row => row.join(',')).join('\n');
    // console.log('associated pools: ',associatedPools)
    for (let pool of associatedPools.split(';')) {
        //Remove the pool id number from the pool string(ex: [71629] BASIN FRUITLAND COAL (GAS) => BASIN FRUITLAND COAL (GAS))
        pool = pool.split(']')[1].trim()
        // console.log('uploading data for pool: ', pool)

        const s3Key = [
            prefix,
            `api=${wellApiNumber.replaceAll('-', '')}`,
            `pool=${pool}`,
            'production.csv'
        ].join('/')

        //Create the csvContentString for just data for this pool
        const poolDataRows = dataRows.filter(row => row[10] === pool);
        const poolCsvContent = [["Date", ...csvContent[0]]].concat(poolDataRows);
        const poolCsvContentString = poolCsvContent.map(row => row.join(',')).join('\n');

        if (poolDataRows.length > 0) {
            await uploadToS3(poolCsvContentString, s3Key, bucketName);
        }
        
    }
    
    return { rowCount: dataRows.length };
}

// Example usage:
if (require.main === module) {
    const config: UploadConfig = {
        wellApiNumber: '30-045-34358',
        associatedPools: '[71280] AZTEC PICTURED CLIFFS (GAS); [71629] BASIN FRUITLAND COAL (GAS)',
        bucketName: outputs.storage.bucket_name,
        prefix: 'global/test/production-data',
        credentials: {
            UserName: process.env.EMNRD_API_USERNAME || '',
            Password: process.env.EMNRD_API_PASSWORD || ''
        }
    };

    if (!config.bucketName) {
        console.error('BUCKET_NAME environment variable is required');
        process.exit(1);
    }

    if (!config.credentials.UserName || !config.credentials.Password) {
        console.error('EMNRD_API_USERNAME and EMNRD_API_PASSWORD environment variables are required');
        process.exit(1);
    }

    uploadCsvProductionData(config).catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}
