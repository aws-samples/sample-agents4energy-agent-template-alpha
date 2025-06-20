import aws4 from 'aws4';
import https from 'https';
import { URL } from 'url';

import { setAmplifyEnvVars } from '../../utils/amplifyUtils';
import { loadOutputs } from '../utils';

const main = async () => {

    await setAmplifyEnvVars()
    const outputs = loadOutputs();

    // Replace these values with your actual Lambda function URL and AWS region
    const lambdaUrl = outputs.custom.awsMcpToolsFunctionUrl;
    const region = outputs.auth.aws_region;

    const url = new URL(lambdaUrl);
    // // In the opts object:
    // const opts: aws4.Request = {
    //     host: url.hostname,
    //     path: url.pathname,
    //     method: 'POST',  // Changed from 'GET' to 'POST'
    //     service: 'lambda',
    //     region,
    //     headers: {
    //         'content-type': 'application/json',
    //         'accept': 'application/json',
    //         'jsonrpc': '2.0'
    //     },
    //     body: JSON.stringify({
    //         jsonrpc: "2.0",
    //         method: "tools/list",
    //         id: 1
    //     })
    // };

    // Define the body as a separate variable for clarity
    // const bodyData = JSON.stringify({
    //     message: "Hello from the test event!"
    // });

    const bodyData = JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/list",
            id: 1
        })

    const opts: aws4.Request = {
        host: url.hostname,
        path: url.pathname,
        method: 'POST',
        service: 'lambda',
        region,
        headers: {
            'content-type': 'application/json',
            'accept': 'application/json',
            'content-length': Buffer.byteLength(bodyData),
            'jsonrpc': '2.0'
        },
        body: bodyData
        // Other body options for reference:
        // "body": "{ \"message\": \"Hello, world!\" }",
        // body: "Hello from the test event!"
        // body: JSON.stringify({
        //     jsonrpc: "2.0",
        //     method: "tools/list",
        //     id: 1,
        //     does: "this hang?"
        // })
    };

    // const opts: aws4.Request = {
    //     host: url.hostname,
    //     path: url.pathname,
    //     method: 'GET', // or 'POST' if needed
    //     service: 'lambda',
    //     region,
    // };


    // Sign the request with your AWS credentials
    aws4.sign(opts, {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN
    });

    // console.log('request: ', opts)

    // Make the HTTPS request
    const req = https.request(opts, (res) => {
        let data = '';
        
        console.log(`Response status: ${res.statusCode}`);
        console.log('Response headers:', res.headers);
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('Response data:', data);
        });
    });

    // Add timeout to prevent hanging indefinitely
    req.setTimeout(10000, () => {
        console.error('Request timed out after 10 seconds');
        req.destroy();
    });

    req.on('error', (err) => {
        console.error('Request error:', err);
    });

    // Pass the body to req.end() when sending a request with a body
    req.end(bodyData);

}

main()
