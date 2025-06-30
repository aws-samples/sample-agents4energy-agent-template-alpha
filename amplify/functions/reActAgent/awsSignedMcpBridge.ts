import aws4 from 'aws4';
import http from 'http';
import https from 'https';

const LOCAL_PROXY_PORT = 3010

const getBridgeServer = () => {
    const server = http.createServer(async (req, res) => {
        if (req.url === '/proxy') {
            const targetUrl = req.headers['target-url'] as string | undefined;

            if (!targetUrl) {
                console.log('No taget url provided')
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ text: "Listener listening" }));
                return { text: "Listener listening" }
            }

            console.log('Signing request to taget URL: ', targetUrl)

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
                    service: 'lambda',
                    region: process.env.AWS_REGION
                };

                // Sign the request with AWS credentials
                aws4.sign(opts, {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                    sessionToken: process.env.AWS_SESSION_TOKEN
                });

                console.log('Full request to be sent to the target host: ', opts)

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

    server.listen(LOCAL_PROXY_PORT,
        async () => {
            const proxyRes = await fetch(`http://localhost:${LOCAL_PROXY_PORT}/proxy`);
            const data = await proxyRes.text();
            console.log('Proxy result:', data);
            // server.close();
        }
    );

}