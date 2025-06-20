import { expect } from 'chai';
import aws4 from 'aws4';
import https from 'https';
import { URL } from 'url';

import { setAmplifyEnvVars } from '../../utils/amplifyUtils';
import { loadOutputs as originalLoadOutputs } from '../utils';

// Wrapper function to avoid TypeScript errors
function loadOutputs() {
  return originalLoadOutputs();
}

describe('AWS MCP Tools Integration Tests', function () {
  // Set a longer timeout for integration tests
  this.timeout(15000);

  let lambdaUrl: string;
  let region: string;

  before(async function () {
    // Set up environment variables
    const envResult = await setAmplifyEnvVars();
    if (!envResult.success) {
      console.warn('Failed to set Amplify environment variables:', envResult.error);
    }

    const outputs = loadOutputs();

    // Get Lambda function URL and region from outputs
    lambdaUrl = outputs.custom.awsMcpToolsFunctionUrl;
    region = outputs.auth.aws_region;
  });

  it('should successfully list available tools', function (done) {
    const url = new URL(lambdaUrl);

    const bodyData = JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/list",
      id: 1
    });

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
    };

    // Sign the request with AWS credentials
    aws4.sign(opts, {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN
    });

    // Make the HTTPS request
    const req = https.request(opts, (res) => {
      let data = '';

      // Check status code
      expect(res.statusCode).to.be.oneOf([200, 201]);

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          // console.log('List Tools response: ', data)

          // Verify response structure
          expect(response).to.have.property('jsonrpc', '2.0');
          expect(response).to.have.property('id', 1);
          expect(response).to.have.property('result');

          const tools = response.result.tools;
          expect(tools).to.be.an('array');

          done();
        } catch (error) {
          done(error);
        }
      });
    });

    // Add timeout to prevent hanging indefinitely
    req.setTimeout(10000, () => {
      done(new Error('Request timed out after 10 seconds'));
      req.destroy();
    });

    req.on('error', (err) => {
      done(err);
    });

    // Send the request
    req.end(bodyData);
  });

  it('should successfully execute the add tool', function (done) {
    const url = new URL(lambdaUrl);

    const a = 5;
    const b = 7;
    const expectedResult = a + b;

    const bodyData = JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "add",
        arguments: {
          a: a,
          b: b
        }
      }
    });

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
    };

    // Sign the request with AWS credentials
    aws4.sign(opts, {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN
    });

    // Make the HTTPS request
    const req = https.request(opts, (res) => {
      let data = '';

      // // Check status code
      // expect(res.statusCode).to.be.oneOf([200, 201]);

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          // console.log('Add numbers response: ', data)

          const response = JSON.parse(data);

          // Verify response structure
          expect(response).to.have.property('jsonrpc', '2.0');
          expect(response).to.have.property('id', 2);
          expect(response).to.have.property('result');

          // Verify the result contains the expected content
          expect(response.result).to.have.property('content');
          expect(response.result.content).to.be.an('array');
          expect(response.result.content[0]).to.have.property('type', 'text');
          expect(response.result.content[0]).to.have.property('text', String(expectedResult));

          done();
        } catch (error) {
          done(error);
        }
      });
    });

    // Add timeout to prevent hanging indefinitely
    req.setTimeout(10000, () => {
      done(new Error('Request timed out after 10 seconds'));
      req.destroy();
    });

    req.on('error', (err) => {
      done(err);
    });

    // Send the request
    req.end(bodyData);
  });
});
