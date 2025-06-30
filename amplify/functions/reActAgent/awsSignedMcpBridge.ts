import aws4 from 'aws4';
import http from 'http';
import https from 'https';
import { setAmplifyEnvVars } from '../../../utils/amplifyUtils';

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
    await setAmplifyEnvVars();
    
    const port = options.port || 3010;
    const region = options.region || process.env.AWS_REGION;
    const service = options.service || 'execute-api';
    const accessKeyId = options.accessKeyId || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = options.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;
    const sessionToken = options.sessionToken || process.env.AWS_SESSION_TOKEN;
    
    if (!accessKeyId || !secretAccessKey) {
        console.error('AWS credentials not found. Make sure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set.');
    }
    
    if (!region) {
        console.error('AWS region not found. Make sure AWS_REGION is set or provide it in options.');
    }
    const server = http.createServer(async (req, res) => {
        if (req.url === '/proxy') {
            const targetUrl = req.headers['target-url'] as string | undefined;

            if (!targetUrl) {
                // console.log('No taget url provided')
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ text: "Listener listening" }));
                return// { text: "Listener listening" }
            }

            // console.log('Signing request to taget URL: ', targetUrl)

            // Parse the target URL to extract hostname and pathname
            const url = new URL(targetUrl!);

            // Read the request body
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', () => {
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
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey,
                sessionToken: sessionToken
            });

                // console.log('Full request to be sent to the target host: ', opts)

                // Make the HTTPS request
                const targetReq = https.request(opts, (targetRes) => {
                    let data = '';

                    targetRes.on('data', (chunk) => {
                        data += chunk;
                    });

                    targetRes.on('end', () => {
                        try {
                            console.log('target response body response: ', data)

                            // const response = JSON.parse(data);

                            // console.log('Call tool response: ', JSON.stringify(response, null, 2))
                            res.writeHead(targetRes.statusCode || 200, targetRes.headers);
                            res.end(data);
                        } catch (error) {
                            console.error('Error processing target response:', error);
                            res.writeHead(500);
                            res.end(JSON.stringify({ error: 'Internal Server Error' }));
                        }
                    });
                });

                // Add error handling for the target request
                targetReq.on('error', (err) => {
                    console.error('Target request error:', err);
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: 'Error connecting to target server: ' + err.message }));
                });

                // Add timeout to prevent hanging indefinitely
                targetReq.setTimeout(15000, () => {
                    targetReq.destroy();
                    res.writeHead(504);
                    res.end(JSON.stringify({ error: 'Gateway Timeout - request took too long to complete' }));
                });

                // Send the request body to the target server
                targetReq.end(body);
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
                // console.log('Proxy server started successfully on port', port);
                // console.log('Proxy health check result:', data);
            } catch (error) {
                console.error('Error during proxy server startup:', error);
            }
        }
    );

    // console.log('MCP bridge server starting on port', port);
    
    return server;
}

/**
 * Parse command line arguments into options
 */
function parseCommandLineArgs(): McpBridgeOptions {
    const args = process.argv.slice(2);
    const options: McpBridgeOptions = {};
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '--port' && i + 1 < args.length) {
            options.port = parseInt(args[++i], 10);
        } else if (arg === '--region' && i + 1 < args.length) {
            options.region = args[++i];
        } else if (arg === '--service' && i + 1 < args.length) {
            options.service = args[++i];
        } else if (arg === '--default-target-url' && i + 1 < args.length) {
            options.defaultTargetUrl = args[++i];
        } else if (arg === '--access-key-id' && i + 1 < args.length) {
            options.accessKeyId = args[++i];
        } else if (arg === '--secret-access-key' && i + 1 < args.length) {
            options.secretAccessKey = args[++i];
        } else if (arg === '--session-token' && i + 1 < args.length) {
            options.sessionToken = args[++i];
        } else if (arg === '--help') {
            printUsage();
            process.exit(0);
        }
    }
    
    return options;
}

/**
 * Print usage information
 */
function printUsage() {
    console.log(`
AWS Signed MCP Bridge Server

Usage:
  ts-node awsSignedMcpBridge.ts [options]
  
  or after compilation:
  
  node awsSignedMcpBridge.js [options]

Options:
  --port <number>              Port to run the local proxy server on (default: 3010)
  --region <string>            AWS region for signing requests (default: process.env.AWS_REGION)
  --service <string>           AWS service name for signing (default: 'execute-api')
  --default-target-url <url>   Default target URL if not provided in request headers
  --access-key-id <string>     AWS access key ID (default: process.env.AWS_ACCESS_KEY_ID)
  --secret-access-key <string> AWS secret access key (default: process.env.AWS_SECRET_ACCESS_KEY)
  --session-token <string>     AWS session token (default: process.env.AWS_SESSION_TOKEN)
  --help                       Show this help message
`);
}

/**
 * Process an MCP request by signing it with AWS credentials, sending it to the target URL, and returning the response
 * @param targetUrl The URL to send the signed request to
 * @param data The request body data (will be stringified if not a string)
 * @param options Configuration options for the request
 * @returns A promise that resolves with the response data
 */
export const processSignedMcpRequest = async (
    targetUrl: string,
    data: any,
    options: SignedMcpRequestOptions = {}
): Promise<any> => {
    await setAmplifyEnvVars();
    
    const region = options.region || process.env.AWS_REGION;
    const service = options.service || 'execute-api';
    const accessKeyId = options.accessKeyId || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = options.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;
    const sessionToken = options.sessionToken || process.env.AWS_SESSION_TOKEN;
    const method = options.method || 'POST';
    const timeout = options.timeout || 15000;
    
    if (!accessKeyId || !secretAccessKey) {
        throw new Error('AWS credentials not found. Make sure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set.');
    }
    
    if (!region) {
        throw new Error('AWS region not found. Make sure AWS_REGION is set or provide it in options.');
    }

    // Parse the target URL to extract hostname and pathname
    const url = new URL(targetUrl);
    
    // Prepare the request body
    const body = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Create the AWS request object
    const opts: aws4.Request = {
        host: url.hostname,
        path: url.pathname + url.search,
        method: method,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
            host: url.hostname
        },
        body: body,
        service: service,
        region: region
    };
    
    // Sign the request with AWS credentials
    aws4.sign(opts, {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
        sessionToken: sessionToken
    });
    
    // Return a promise that resolves with the response data
    return new Promise((resolve, reject) => {
        const protocol = url.protocol === 'https:' ? https : http;
        
        const req = protocol.request(opts, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                        reject(new Error(`Request failed with status code ${res.statusCode}: ${responseData}`));
                        return;
                    }
                    
                    // Try to parse as JSON, but return raw if not valid JSON
                    try {
                        const parsedData = JSON.parse(responseData);
                        resolve(parsedData);
                    } catch (e) {
                        resolve(responseData);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });
        
        // Add error handling for the request
        req.on('error', (err) => {
            reject(new Error(`Error connecting to target server: ${err.message}`));
        });
        
        // Add timeout to prevent hanging indefinitely
        req.setTimeout(timeout, () => {
            req.destroy();
            reject(new Error('Request timeout - took too long to complete'));
        });
        
        // Send the request body
        req.end(body);
    });
};

/**
 * Process MCP requests from standard input, sign them, send them to the target URL, and write responses to standard output
 * @param targetUrl The URL to send the signed requests to
 * @param options Configuration options for the requests
 */
export const processMcpRequestsFromStdin = async (
    targetUrl: string,
    options: SignedMcpRequestOptions = {}
): Promise<void> => {
    const readline = require('readline');
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });
    
    for await (const line of rl) {
        try {
            if (line.trim()) {
                const response = await processSignedMcpRequest(targetUrl, line, options);
                console.log(typeof response === 'string' ? response : JSON.stringify(response));
            }
        } catch (error) {
            console.error('Error processing request:', error);
        }
    }
};

// Execute when run directly (not imported)
if (import.meta.url.startsWith('file:') && process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
    try {
        // Check if we're in "process stdin" mode with a target URL as the first argument
        if (process.argv.length >= 3 && process.argv[2].startsWith('http')) {
            const targetUrl = process.argv[2];
            const options: SignedMcpRequestOptions = {};
            
            // Parse additional options
            for (let i = 3; i < process.argv.length; i++) {
                const arg = process.argv[i];
                
                if (arg === '--region' && i + 1 < process.argv.length) {
                    options.region = process.argv[++i];
                } else if (arg === '--service' && i + 1 < process.argv.length) {
                    options.service = process.argv[++i];
                } else if (arg === '--access-key-id' && i + 1 < process.argv.length) {
                    options.accessKeyId = process.argv[++i];
                } else if (arg === '--secret-access-key' && i + 1 < process.argv.length) {
                    options.secretAccessKey = process.argv[++i];
                } else if (arg === '--session-token' && i + 1 < process.argv.length) {
                    options.sessionToken = process.argv[++i];
                } else if (arg === '--method' && i + 1 < process.argv.length) {
                    options.method = process.argv[++i];
                } else if (arg === '--timeout' && i + 1 < process.argv.length) {
                    options.timeout = parseInt(process.argv[++i], 10);
                }
            }
            
            processMcpRequestsFromStdin(targetUrl, options);
        } else {
            // Start the bridge server in the original mode
            const options = parseCommandLineArgs();
            startMcpBridgeServer(options);
        }
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
