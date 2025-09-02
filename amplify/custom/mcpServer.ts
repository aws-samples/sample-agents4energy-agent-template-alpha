import { Construct } from 'constructs';
import cdk, {
    aws_apigateway as apigateway,
    aws_lambda as lambda,
    aws_lambda_nodejs as lambdaNodeJs,
} from 'aws-cdk-lib'

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface McpServerProps {
}

export class McpServerConstruct extends Construct {
    public readonly lambdaFunction: lambdaNodeJs.NodejsFunction;
    public readonly apiKey: cdk.aws_apigateway.IApiKey
    public readonly api: apigateway.RestApi
    public readonly mcpResource: cdk.aws_apigateway.Resource
    public readonly mcpFunctionUrl: lambda.FunctionUrl

    constructor(scope: Construct, id: string, props: McpServerProps) {
        super(scope, id);

        this.lambdaFunction = new lambdaNodeJs.NodejsFunction(scope, 'awsMcpToolsFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../', 'functions', 'mcpAwsTools', 'index.ts'),
            timeout: cdk.Duration.minutes(15),
            // memorySize: 3000,
            environment: {
                AGENT_MODEL_ID: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',

                // MODEL_ID: 'us.anthropic.claude-3-sonnet-20240229-v1:0',
                // MODEL_ID: 'us.amazon.nova-pro-v1:0'
                // TEXT_TO_TABLE_MODEL_ID: 'us.amazon.nova-pro-v1:0'
                // TEXT_TO_TABLE_MODEL_ID: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
                // TEXT_TO_TABLE_MODEL_ID: 'amazon.nova-lite-v1:0',
                TEXT_TO_TABLE_MODEL_ID: 'anthropic.claude-3-haiku-20240307-v1:0',
                TEXT_TO_TABLE_CONCURRENCY: '10',

                ORIGIN_BASE_PATH: process.env.ORIGIN_BASE_PATH || ''
            }
        });

        this.mcpFunctionUrl = this.lambdaFunction.addFunctionUrl({
            authType: lambda.FunctionUrlAuthType.AWS_IAM,
            // authType: lambda.FunctionUrlAuthType.NONE, //This will generate a Sev2 Sim ticket
            // invokeMode: lambda.InvokeMode.RESPONSE_STREAM
        });

        // Currently langchain MultiServerMCPClient does not support signed requests, so we will create an API Gateway with header based authentication to invoke the mcp server function
        // https://github.com/langchain-ai/langchainjs/discussions/8412
        // Create an API Gateway REST API
        this.api = new apigateway.RestApi(scope, 'McpToolsApi', {
            description: 'API for MCP Tools',
            deployOptions: {
                stageName: 'prod',
            },
            // Enable API key
            apiKeySourceType: apigateway.ApiKeySourceType.HEADER,
        });

        // Create an API key
        this.apiKey = this.api.addApiKey('McpToolsApiKey', {
            // apiKeyName: 'mcp-tools-key',
            description: 'API Key for MCP Tools',
        });

        // Create a usage plan
        const usagePlan = this.api.addUsagePlan('McpToolsUsagePlan', {
            name: 'mcp-tools-usage-plan',
            description: 'Usage plan for MCP Tools API',
            apiStages: [
                {
                    api: this.api,
                    stage: this.api.deploymentStage,
                },
            ],
        });

        // Associate the API key with the usage plan
        usagePlan.addApiKey(this.apiKey);

        // Create a Lambda integration
        const mcpToolsIntegration = new apigateway.LambdaIntegration(this.lambdaFunction, {
            proxy: true,
        });

        // Add a resource and method to the API
        this.mcpResource = this.api.root.addResource('mcp');
        this.mcpResource.addMethod('ANY', mcpToolsIntegration, {
            apiKeyRequired: true, // This requires the API key for this method
        });
    }
}

