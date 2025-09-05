import aws4 from 'aws4';
import http from 'http';
import axios from 'axios';
// Removing dependency on amplifyUtils for testing
// import { setAmplifyEnvVars } from '../../../utils/amplifyUtils';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { setAmplifyEnvVars } from './amplifyUtils';

/**
 * Options for processing a signed MCP request
 */
export interface SignedMcpRequestOptions {
    /** AWS region for signing requests (default: process.env.AWS_REGION) */
    region?: string;
    /** AWS access key ID (default: process.env.AWS_ACCESS_KEY_ID) */
    accessKeyId?: string;
    /** AWS secret access key (default: process.env.AWS_SECRET_ACCESS_KEY) */
    secretAccessKey?: string;
    /** AWS session token (default: process.env.AWS_SESSION_TOKEN) */
    sessionToken?: string;
    /** AWS service name for signing (default: 'execute-api') */
    service?: string;
    /** HTTP method for the request (default: 'POST') */
    method?: string;
    /** Additional headers to include in the request */
    headers?: Record<string, string>;
    /** Request timeout in milliseconds (default: 15000) */
    timeout?: number;
}

/**
 * Configuration options for the MCP bridge server
 */
export interface McpBridgeOptions {
    /** Port to run the local proxy server on (default: 3010) */
    port?: number;
    /** AWS region for signing requests (default: process.env.AWS_REGION) */
    region?: string;
    /** Default target URL if not provided in request headers */
    defaultTargetUrl?: string;
    /** AWS access key ID (default: process.env.AWS_ACCESS_KEY_ID) */
    accessKeyId?: string;
    /** AWS secret access key (default: process.env.AWS_SECRET_ACCESS_KEY) */
    secretAccessKey?: string;
    /** AWS session token (default: process.env.AWS_SESSION_TOKEN) */
    sessionToken?: string;
    /** AWS service name for signing (default: 'execute-api') */
    service?: string;
}

/**
 * Start an MCP bridge server that signs AWS requests
 * @param options Configuration options for the server
 * @returns The HTTP server instance
 */
export const startMcpBridgeServer = async (options: McpBridgeOptions = {}) => {
    // await setAmplifyEnvVars();

    const port = options.port || 3020;
    const region = options.region || process.env.AWS_REGION;
    const service = options.service || 'lambda';
    // const accessKeyId = options.accessKeyId || process.env.AWS_ACCESS_KEY_ID;
    // const secretAccessKey = options.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;
    // const sessionToken = options.sessionToken || process.env.AWS_SESSION_TOKEN;

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        console.error('AWS credentials not found. Make sure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set.');
    }

    if (!region) {
        console.error('AWS region not found. Make sure AWS_REGION is set or provide it in options.');
    }

    const server = http.createServer(async (req, res) => {
        if (req.url === '/proxy') {
            const targetUrl = req.headers['target-url'] as string | undefined;

            if (!targetUrl) {
                console.warn(`No taget url provided`)
                console.warn(`headers: ${JSON.stringify(req.headers)}`)
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ text: "Listener listening" }));
                return// { text: "Listener listening" }
            }

            console.warn('Signing request to taget URL: ', targetUrl)

            // Parse the target URL to extract hostname and pathname
            const url = new URL(targetUrl!);

            // Read the request body
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', async () => {
                // Create the AWS request object
                const opts: aws4.Request = {
                    host: url.hostname,
                    path: url.pathname,
                    method: req.method,
                    headers: {
                        ...req.headers,
                        host: url.hostname  // Override the host header to match the target host
                    },
                    body: body,
                    service: service,
                    region: region
                };

                // Sign the request with AWS credentials
                aws4.sign(opts, {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                    sessionToken: process.env.AWS_SESSION_TOKEN
                });

                // console.warn('Full request to be sent to the target host: ', opts)

                // Convert aws4 signed request to axios config
                // Create a clean headers object that axios can accept
                const headers: Record<string, string> = {};
                if (opts.headers) {
                    Object.entries(opts.headers).forEach(([key, value]) => {
                        if (value !== undefined && typeof value === 'string') {
                            headers[key] = value;
                        }
                    });
                }

                // Make the request using axios
                // console.warn(`{"message": "Setting request timeout", "timeout": 300000, "timestamp": "${new Date().toISOString()}"}`);
                try {
                    const targetRes = await axios({
                        method: opts.method as string,
                        url: targetUrl,
                        headers: headers,
                        data: body,
                        timeout: 300000, // 5 minutes timeout
                        responseType: 'arraybuffer' // To handle binary responses correctly
                    });

                    console.log('target response body response received: ', targetRes.data);
                    
                    // Convert response headers to format expected by http.ServerResponse
                    const responseHeaders: Record<string, string | string[] | undefined> = {};
                    Object.entries(targetRes.headers).forEach(([key, value]) => {
                        responseHeaders[key] = value;
                    });

                    res.writeHead(targetRes.status, responseHeaders);
                    res.end(targetRes.data);
                } catch (error: any) {
                    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
                        console.warn(`{"message": "REQUEST TIMEOUT OCCURRED", "targetUrl": "${targetUrl}", "timestamp": "${new Date().toISOString()}"}`);
                        res.writeHead(504);
                        res.end(JSON.stringify({ error: 'Gateway Timeout - request took too long to complete' }));
                    } else if (axios.isAxiosError(error) && error.response) {
                        // Forward the error response from the target server
                        console.error('Target server error response:', error.response.status, ' ', error.response.data);
                        res.writeHead(error.response.status, error.response.headers as any);
                        res.end(error.response.data);
                    } else {
                        // Handle network or other errors
                        console.error('Target request error:', error);
                        res.writeHead(500);
                        res.end(JSON.stringify({ error: 'Error connecting to target server: ' + (error.message || 'Unknown error') }));
                    }
                }
            });

            // const result = await signAndFetch('https://aws-service...', { method: 'GET' });
            // res.writeHead(200, { 'Content-Type': 'application/json' });
            // res.end(JSON.stringify(result));
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    server.listen(port,
        async () => {
            try {
                const proxyRes = await fetch(`http://localhost:${port}/proxy`);
                const data = await proxyRes.text();
                console.warn('Proxy server started successfully on port', port);
                console.warn('Proxy health check result:', data);
            } catch (error) {
                console.error('Error during proxy server startup:', error);
            }
        }
    );

    console.warn('MCP bridge server starting on port', port);

    return server;
}

/**
 * Process an MCP request by signing it with AWS credentials, sending it to the target URL, and returning the response
 * @param targetUrl The URL to send the signed request to
 * @param data The request body data (will be stringified if not a string)
 * @param options Configuration options for the request
 * @returns A promise that resolves with the response data
 */

const handleStdioInput = async () => {
    try {
        console.warn('Creating the remote MCP server connection')
        await setAmplifyEnvVars();

        // Check if we're in "process stdin" mode with a target URL as the first argumen
        if (true) {
            const targetUrl = process.argv[2];
            const options: SignedMcpRequestOptions = {};

            // Parse additional options
            for (let i = 3; i < process.argv.length; i++) {
                const arg = process.argv[i];

                if (arg === '--region' && i + 1 < process.argv.length) {
                    options.region = process.argv[++i];
                } else if (arg === '--service' && i + 1 < process.argv.length) {
                    options.service = process.argv[++i];
                }  else if (arg === '--method' && i + 1 < process.argv.length) {
                    options.method = process.argv[++i];
                } else if (arg === '--timeout' && i + 1 < process.argv.length) {
                    options.timeout = parseInt(process.argv[++i], 10);
                }
            }

            const localTransport = new StdioServerTransport()

            localTransport.onmessage = async (incomingMessage: any) => {
                try {
                    console.warn("Processing message: ", incomingMessage)
                    console.warn('Target URL: ', targetUrl)


                    // Parse the target URL
                    const url = new URL(targetUrl);

                    const bodyData = JSON.stringify(incomingMessage || "")

                    // Get AWS credentials from environment
                    const region = process.env.AWS_REGION;
                    // const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
                    // const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
                    // const sessionToken = process.env.AWS_SESSION_TOKEN;

                    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
                        throw new Error('AWS credentials not found');
                    }

                    // Create the AWS request object for signing
                    const opts: aws4.Request = {
                        host: url.hostname,
                        path: url.pathname + url.search,
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            host: url.hostname
                        },
                        service: 'lambda',
                        region: region,
                        body: bodyData
                    };

                    // Sign the request with AWS credentials
                    aws4.sign(opts, {
                        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                        sessionToken: process.env.AWS_SESSION_TOKEN
                    });

                    // Convert aws4 signed request to axios config with properly typed headers
                    // Create a clean headers object that axios can accept
                    const headers: Record<string, string> = {};
                    if (opts.headers) {
                        Object.entries(opts.headers).forEach(([key, value]) => {
                            if (value !== undefined && typeof value === 'string') {
                                headers[key] = value;
                            }
                        });
                    }

                    console.warn('Body data: ', bodyData)

                    const remoteResponse = await axios.post(targetUrl, bodyData, {
                        headers,
                    });

                    console.warn('Response data from remote server: ', remoteResponse.data)


                    // // Create axios config without data initially
                    // const axiosConfig: any = {
                    //     method: opts.method as string,
                    //     url: targetUrl,
                    //     headers: headers,
                    //     timeout: 15000
                    // };

                    // // Always include data in axios config (either the actual data or an empty object)
                    // axiosConfig.data = body;

                    // // Make the request using axios
                    // const response = await axios(axiosConfig);

                    localTransport.send(remoteResponse.data)

                    // // Send the response back through the transport as a JSON-RPC response
                    // localTransport.send({
                    //     jsonrpc: "2.0",//remoteResponse.data.jsonrcp,
                    //     id: remoteResponse.data.id,
                    //     result: remoteResponse.data
                    // });
                } catch (error: any) {
                    console.error('Error in localTransport.onmessage:', JSON.stringify(error, null, 2));

                    // Send error back through the transport as a JSON-RPC error
                    // This ensures the client gets a response even when there's an error
                    localTransport.send({
                        jsonrpc: "2.0",
                        id: typeof incomingMessage === 'object' && 'id' in incomingMessage ? incomingMessage.id : 'unknown',
                        error: {
                            code: -32000,
                            message: error.message || 'Unknown error occurred'
                        }
                    });
                }
            }

            await localTransport.start()

            console.warn("Created on message handler for local stdio")

        }
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

// Execute when run directly (not imported)
if (import.meta.url.startsWith('file:') && process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
    handleStdioInput()
}
