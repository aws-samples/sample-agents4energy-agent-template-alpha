import { expect } from 'chai';
import aws4 from 'aws4';
import axios, { AxiosRequestConfig } from 'axios';
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
    lambdaUrl = outputs.custom.mcpServers.agentInvoker.functionUrl;
    region = outputs.auth.aws_region;
  });

  it('should successfully list available tools', function (done) {
    const url = new URL(lambdaUrl);

    const bodyData = JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/list",
      // method: "prompts/list",
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

    console.log('Full list tools request: ', opts)

    // Create axios config from signed request
    const axiosConfig: AxiosRequestConfig = {
      method: 'POST',
      url: lambdaUrl,
      data: bodyData,
      headers: opts.headers as Record<string, string>,
      timeout: 10000
    };

    // Make the request with axios
    axios(axiosConfig)
      .then(response => {
        try {
          // Check status code
          expect(response.status).to.be.oneOf([200, 201]);

          console.log('List Tools response: ', JSON.stringify(response.data, null, 2))

          // Verify response structure
          expect(response.data).to.have.property('jsonrpc', '2.0');
          expect(response.data).to.have.property('id', 1);
          expect(response.data).to.have.property('result');

          const tools = response.data.result.tools;
          expect(tools).to.be.an('array');

          done();
        } catch (error) {
          done(error);
        }
      })
      .catch(error => {
        done(error);
      });
  });

  it('should successfully execute the invokeReactAgent tool', function (done) {
    const url = new URL(lambdaUrl);

    const bodyData = JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "invokeReactAgent",
        arguments: {
          prompt: "What is 1+1?"
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

    // Create axios config from signed request
    const axiosConfig: AxiosRequestConfig = {
      method: 'POST',
      url: lambdaUrl,
      data: bodyData,
      headers: opts.headers as Record<string, string>,
      timeout: 10000
    };

    // Make the request with axios
    axios(axiosConfig)
      .then(response => {
        try {
          console.log('Call invokeReactAgent tool response: ', JSON.stringify(response.data, null, 2))

          // Verify response structure
          expect(response.data).to.have.property('jsonrpc', '2.0');
          expect(response.data).to.have.property('id', 2);
          expect(response.data).to.have.property('result');

          // Verify the result contains the expected content
          expect(response.data.result).to.have.property('content');
          expect(response.data.result.content).to.be.an('array');
          expect(response.data.result.content[0]).to.have.property('type', 'text');
          // expect(response.data.result.content[0]).to.have.property('text', String(expectedResult));

          done();
        } catch (error) {
          done(error);
        }
      })
      .catch(error => {
        done(error);
      });
  });
});
