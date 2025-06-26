import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data, mcpAgentInvoker, reActAgentFunction } from './data/resource';
import { storage } from './storage/resource';
import cdk, {
  aws_apigateway as apigateway,
  aws_appsync as appsync,
  aws_athena as athena,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_lambda_nodejs as lambdaNodeJs,
} from 'aws-cdk-lib'

import path from 'path';
import { fileURLToPath } from 'url';

import { PdfToYamlConstruct } from './custom/pdfToYamlConstruct';
import { McpServerConstruct } from './custom/mcpServer';
import mcp from 'middy-mcp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const backend = defineBackend({
  auth,
  data,
  storage,
  reActAgentFunction,
  mcpAgentInvoker
});

backend.stack.tags.setTag('Project', 'workshop-a4e');

const stackUUID = cdk.Names.uniqueResourceName(
  backend.stack, {}
).toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(-3)

const mcpAgentInvokerFunctionUrl = backend.mcpAgentInvoker.resources.lambda.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.AWS_IAM,
  // authType: lambda.FunctionUrlAuthType.NONE, //This will generate a Sev2 Sim ticket
  // invokeMode: lambda.InvokeMode.RESPONSE_STREAM
});



const {
  lambdaFunction: awsMcpToolsFunction,
  api: mcpRestApi,
  apiKey: apiKey,
  mcpResource: mcpResource,
  mcpFunctionUrl: awsMcpToolsFunctionUrl
} = new McpServerConstruct(backend.stack, "McpServer", {})

awsMcpToolsFunction.grantInvokeUrl(backend.reActAgentFunction.resources.lambda)

// Create a dedicated IAM role for Athena execution
const athenaExecutionRole = new iam.Role(backend.stack, 'AthenaExecutionRole', {
  assumedBy: new iam.ServicePrincipal('athena.amazonaws.com'),
  description: 'Role for Athena to execute PySpark calculations',
});

// Grant permissions to the Athena execution role
athenaExecutionRole.addToPolicy(
  new iam.PolicyStatement({
    actions: [
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:GetBucketLocation",
      "s3:GetObject",
      "s3:ListBucket",
      "s3:ListBucketMultipartUploads",
      "s3:ListMultipartUploadParts",
      "s3:AbortMultipartUpload",
    ],
    resources: [
      backend.storage.resources.bucket.bucketArn,
      `${backend.storage.resources.bucket.bucketArn}/*`,
      "arn:aws:s3:::athena-express-*",
      "arn:aws:s3:::athena-express-*/*"
    ],
  })
);

// Add Glue catalog permissions
athenaExecutionRole.addToPolicy(
  new iam.PolicyStatement({
    actions: [
      "glue:CreateDatabase",
      "glue:GetDatabase",
      "glue:GetDatabases",
      "glue:UpdateDatabase",
      "glue:DeleteDatabase",
      "glue:CreateTable",
      "glue:UpdateTable",
      "glue:GetTable",
      "glue:GetTables",
      "glue:DeleteTable",
      "glue:BatchCreatePartition",
      "glue:CreatePartition",
      "glue:UpdatePartition",
      "glue:GetPartition",
      "glue:GetPartitions",
      "glue:BatchGetPartition"
    ],
    resources: [`arn:aws:glue:${backend.stack.region}:${backend.stack.account}:*`],
  })
);

// Add CloudWatch permissions for logging
athenaExecutionRole.addToPolicy(
  new iam.PolicyStatement({
    actions: [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ],
    resources: ["arn:aws:logs:*:*:*"],
  })
);

// Create Athena workgroup for PySpark execution with a new name to avoid update issues
const athenaWorkgroup = new athena.CfnWorkGroup(backend.stack, 'SparkWorkgroup', {
  name: `pyspark-workgroup-${stackUUID}`,
  workGroupConfiguration: {
    resultConfiguration: {
      outputLocation: `s3://${backend.storage.resources.bucket.bucketName}/athena-results/`,
    },
    engineVersion: {
      selectedEngineVersion: 'PySpark engine version 3',
    },
    executionRole: athenaExecutionRole.roleArn,
  }
});

const executeAthenaStatementsPolicy = new iam.PolicyStatement({
  actions: [
    "athena:StartSession",
    "athena:GetSessionStatus",
    "athena:TerminateSession",
    "athena:ListSessions",
    "athena:StartCalculationExecution",
    "athena:GetCalculationExecutionCode",
    "athena:StopCalculationExecution",
    "athena:ListCalculationExecutions",
    "athena:GetCalculationExecution",
    "athena:GetCalculationExecutionStatus",
    "athena:ListExecutors",
    "athena:ExportNotebook",
    "athena:UpdateNotebook"
  ],
  resources: [
    `arn:aws:athena:${backend.stack.region}:${backend.stack.account}:workgroup/${athenaWorkgroup.name}`,
  ],
})

// This enables the Athena notebook console environment to use this service role
athenaExecutionRole.addToPolicy(executeAthenaStatementsPolicy);

//Add permissions to the lambda functions to invoke the model
[
  backend.reActAgentFunction.resources.lambda,
  awsMcpToolsFunction
].forEach((resource) => {
  resource.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ["bedrock:InvokeModel*"],
      resources: [
        `arn:aws:bedrock:us-*::foundation-model/*`,
        `arn:aws:bedrock:us-*:${backend.stack.account}:inference-profile/*`,
      ],
    }),
  )

  // Add Athena permissions to the Lambda
  resource.addToRolePolicy(executeAthenaStatementsPolicy);

  // Also grant access to the Athena execution role
  resource.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ["iam:PassRole"],
      resources: [athenaExecutionRole.roleArn],
    })
  );

  resource.addToRolePolicy(
    new iam.PolicyStatement({
      actions: [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject"
      ],
      resources: [
        backend.storage.resources.bucket.bucketArn,
        `${backend.storage.resources.bucket.bucketArn}/*`,
      ],
    })
  );

})

// const graphQLApi = appsync.GraphqlApi.fromGraphqlApiAttributes(backend.data.stack, 'graphQLApi', {
//   graphqlApiId: backend.data.apiId
// })

// awsMcpToolsFunction.addToRolePolicy(
//   new iam.PolicyStatement({
//     actions: ["appsync:GraphQL"],
//     resources: [
//       `arn:aws:appsync:${backend.stack.region}:${backend.stack.account}:apis/${graphQLApi.apiId}`,
//       // graphQLApi.arn
//       // `${graphQLApi.graphQLEndpointArn}/types/Query/*`,
//       // `${graphQLApi.graphQLEndpointArn}/types/Mutation/*`
//     ],
//   })
// )

// // Allow the MCP server to interact with the GraphQL api
// graphQLApi.grantQuery(awsMcpToolsFunction)
// graphQLApi.grantMutation(awsMcpToolsFunction)



//Allow the reActAgentFunction to retrieve the API key used to invoke the MCP server
backend.reActAgentFunction.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    actions: [
      "apigateway:GET"
    ],
    resources: [
      apiKey.keyArn,
    ],
  })
);

//These allow the MCP server to interact with our file session objects and the athena pyspark environment
awsMcpToolsFunction.addEnvironment(
  'STORAGE_BUCKET_NAME',
  backend.storage.resources.bucket.bucketName
);
awsMcpToolsFunction.addEnvironment(
  'ATHENA_WORKGROUP_NAME',
  athenaWorkgroup.name
);

//These do the same for our reAct agent
backend.reActAgentFunction.addEnvironment(
  'STORAGE_BUCKET_NAME',
  backend.storage.resources.bucket.bucketName
);
backend.reActAgentFunction.addEnvironment(
  'ATHENA_WORKGROUP_NAME',
  athenaWorkgroup.name
);

backend.reActAgentFunction.addEnvironment(
  'MCP_REST_API_URL',
  mcpRestApi.urlForPath(mcpResource.path)
);

backend.reActAgentFunction.addEnvironment(
  'MCP_REST_API_KEY_ARN',
  apiKey.keyArn
);

backend.reActAgentFunction.addEnvironment(
  'MCP_FUNCTION_URL',
  awsMcpToolsFunctionUrl.url
);

awsMcpToolsFunctionUrl

new PdfToYamlConstruct(backend.stack, 'PdfToYamlConstruct', {
  s3Bucket: backend.storage.resources.bucket
});

// Add CloudFormation stack output for mcpRestApiUrl and ApiKeyArn
new cdk.CfnOutput(backend.stack, 'McpRestApiUrl', {
  value: mcpRestApi.urlForPath(mcpResource.path),
  description: 'URL for the MCP REST API'
});

new cdk.CfnOutput(backend.stack, 'McpRestApiKeyArn', {
  value: apiKey.keyArn,
  description: 'Api key ARN for the MCP REST API'
});

backend.addOutput({
  custom: {
    rootStackName: backend.stack.stackName,
    athenaWorkgroupName: athenaWorkgroup.name,
    reactAgentLambdaArn: backend.reActAgentFunction.resources.lambda.functionArn,
    mcpRestApiUrl: mcpRestApi.urlForPath(mcpResource.path),
    apiKeyArn: apiKey.keyArn,
    mcpAgentInvokerUrl: mcpAgentInvokerFunctionUrl.url,
    mcpFunctionUrl: awsMcpToolsFunctionUrl.url
  }
});


// backend.addOutput({ custom: { athenaWorkgroupName: athenaWorkgroup.name } });
// backend.addOutput({ custom: { reactAgentLambdaArn: backend.reActAgentFunction.resources.lambda.functionArn } });
// backend.addOutput({ custom: { awsMcpToolsFunctionUrl: awsMcpToolsFunctionUrl.url } });
