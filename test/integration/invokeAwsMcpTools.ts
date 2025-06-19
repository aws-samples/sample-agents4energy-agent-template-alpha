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

    const opts: aws4.Request = {
        host: url.hostname,
        path: url.pathname,
        method: 'POST', // or 'POST' if needed
        service: 'lambda',
        region,
        headers: {
            'content-type': 'application/json',
            'accept': 'application/json',
            'jsonrpc': '2.0'
        },
        body: JSON.stringify({
            message: "Hello from the test event!"
        })
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

    console.log('request: ', opts)

    // Make the HTTPS request
    const req = https.request(opts, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log(data);
        });
    });

    req.on('error', (err) => {
        console.error(err);
    });

    req.end();

}

main()