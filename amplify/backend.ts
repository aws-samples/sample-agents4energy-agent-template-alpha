import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data, mcpAgentInvoker, reActAgentFunction, mcpServerTestFunction } from './data/resource';
import { storage } from './storage/resource';
import cdk, {
  aws_athena as athena,
  aws_iam as iam,
  aws_lambda as lambda,
  custom_resources,
} from 'aws-cdk-lib'

import path from 'path';
import { fileURLToPath } from 'url';

import { PdfToYamlConstruct } from './custom/pdfToYamlConstruct';
import { McpServerConstruct } from './custom/mcpServer';
import { SeedDataConstruct } from './custom/seedData';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const backend = defineBackend({
  auth,
  data,
  storage,
  reActAgentFunction,
  mcpAgentInvoker,
  mcpServerTestFunction
});

backend.stack.tags.setTag('Project', 'workshop-a4e');

const stackUUID = cdk.Names.uniqueResourceName(
  backend.stack, {}
).toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(-3)

console.log(`Stack UUID: ${stackUUID}`)



//This will disable the ability for users to sign up in the UI. The administrator will manually create users.
const { cfnUserPool } = backend.auth.resources.cfnResources;
cfnUserPool.adminCreateUserConfig = {
  allowAdminCreateUserOnly: true,
};

const mcpAgentInvokerFunctionUrl = backend.mcpAgentInvoker.resources.lambda.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.AWS_IAM,
  // invokeMode: lambda.InvokeMode.RESPONSE_STREAM
});

const {
  lambdaFunction: awsMcpToolsFunction,
  api: mcpRestApi,
  apiKey: apiKey,
  mcpResource: mcpResource,
  mcpFunctionUrl: awsMcpToolsFunctionUrl
} = new McpServerConstruct(backend.stack, "McpServer", {})

//Allow the agent's lambda function to invoke the aws mcp tools function
cdk.Tags.of(awsMcpToolsFunction).add(`Allow_${stackUUID}`, "True")

awsMcpToolsFunction.grantInvokeUrl(backend.reActAgentFunction.resources.lambda) //TODO: adding the InvokeFunctionUrl IAM permission may make this unneccessary
awsMcpToolsFunction.grantInvokeUrl(backend.mcpServerTestFunction.resources.lambda)

// Create an element in the mcp server registry for the A4E Mcp Server
const McpServerRegistryDdbTable = backend.data.resources.tables["McpServer"]

new custom_resources.AwsCustomResource(backend.stack, 'McpServerRegistryInit', {
  onCreate: {
    service: 'DynamoDB', //The service can also take this form: '@aws-sdk/client-bedrock-agent',
    action: 'putItem',
    parameters: {
      TableName: McpServerRegistryDdbTable.tableName,
      Item: {
        name: { S: 'A4EMcpTools' },
        signRequestsWithAwsCreds: { BOOL: true },
        enabled: { BOOL: true },
        url: { S: awsMcpToolsFunctionUrl.url },

        id: { S: 'A4EMcpRegistryEntry' },
        __typename: {S: 'McpServer'},
        createdAt: { S: '2000-01-01T00:00:00.000Z' },
        updatedAt: { S: '2000-01-01T00:00:00.000Z' },
        owner: { S: 'system' },
      }
    },
    physicalResourceId: custom_resources.PhysicalResourceId.of('A4EMcpRegistryEntry')
  },
  policy: custom_resources.AwsCustomResourcePolicy.fromStatements([
    new iam.PolicyStatement({
      actions: ['dynamodb:PutItem'],
      resources: [McpServerRegistryDdbTable.tableArn],
    }),
  ]),
});

// Seed the Settings table with the system prompt
const SettingsDdbTable = backend.data.resources.tables["Settings"];
new SeedDataConstruct(backend.stack, 'SeedData', {
  settingsTable: SettingsDdbTable
});

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
const athenaPysparkWorkgroup = new athena.CfnWorkGroup(backend.stack, 'SparkWorkgroup', {
  name: `pyspark-workgroup-${stackUUID}`,
  recursiveDeleteOption: true,
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

// Create Athena workgroup for SQL queries
const athenaSqlWorkgroup = new athena.CfnWorkGroup(backend.stack, 'SqlWorkgroup', {
  name: `sql-workgroup-${stackUUID}`,
  recursiveDeleteOption: true,
  workGroupConfiguration: {
    resultConfiguration: {
      outputLocation: `s3://${backend.storage.resources.bucket.bucketName}/athena-sql-results/`,
    },
    executionRole: athenaExecutionRole.roleArn
  },
});
athenaSqlWorkgroup.recursiveDeleteOption = true

const executeAthenaStatementsPolicy = new iam.PolicyStatement({
  actions: [
    "athena:GetWorkGroup",
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
    "athena:UpdateNotebook",
    "athena:StartQueryExecution",
    "athena:GetQueryExecution",
    "athena:GetQueryResults",
    "athena:StopQueryExecution",
    "athena:ListQueryExecutions"
  ],
  resources: [
    `arn:aws:athena:${backend.stack.region}:${backend.stack.account}:workgroup/${athenaPysparkWorkgroup.name}`,
    `arn:aws:athena:${backend.stack.region}:${backend.stack.account}:workgroup/${athenaSqlWorkgroup.name}`,
  ],
})

// This enables the Athena notebook console environment to use this service role
athenaExecutionRole.addToPolicy(executeAthenaStatementsPolicy);

//Add permissions to the lambda functions to invoke the model
[
  backend.reActAgentFunction.resources.lambda,
  backend.mcpServerTestFunction.resources.lambda,
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
        "s3:GetBucketLocation",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:ListBucketMultipartUploads",
        "s3:ListMultipartUploadParts",
        "s3:AbortMultipartUpload",
        "s3:PutObject"
      ],
      resources: [
        backend.storage.resources.bucket.bucketArn,
        `${backend.storage.resources.bucket.bucketArn}/*`,
      ],
    })
  );

  //This enables the MCP agent to query the data lake using Athena SQL
  resource.addToRolePolicy(
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
  )

  resource.addToRolePolicy(
    new iam.PolicyStatement({
      actions: [
        "athena:GetDataCatalog",
        "lambda:InvokeFunction",
        "lambda:InvokeFunctionUrl"
      ],
      resources: ["*"],
      conditions: {
        StringEquals: {
          [`aws:ResourceTag/Allow_${stackUUID}`]: "True"
        }
      }
    })
  )

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

//These allow the MCP server to interact with our file session objects and the athena environments
awsMcpToolsFunction.addEnvironment(
  'STORAGE_BUCKET_NAME',
  backend.storage.resources.bucket.bucketName
);
awsMcpToolsFunction.addEnvironment(
  'ATHENA_PYSPARK_WORKGROUP_NAME',
  athenaPysparkWorkgroup.name
);
awsMcpToolsFunction.addEnvironment(
  'ATHENA_SQL_WORKGROUP_NAME',
  athenaSqlWorkgroup.name
);

//These do the same for our reAct agent
backend.reActAgentFunction.addEnvironment(
  'STORAGE_BUCKET_NAME',
  backend.storage.resources.bucket.bucketName
);
backend.reActAgentFunction.addEnvironment(
  'ATHENA_PYSPARK_WORKGROUP_NAME',
  athenaPysparkWorkgroup.name
);
backend.reActAgentFunction.addEnvironment(
  'ATHENA_SQL_WORKGROUP_NAME',
  athenaSqlWorkgroup.name
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
    athenaPysparkWorkgroupName: athenaPysparkWorkgroup.name,
    athenaSqlWorkgroupName: athenaSqlWorkgroup.name,
    reactAgentLambdaArn: backend.reActAgentFunction.resources.lambda.functionArn,
    mcpRestApiUrl: mcpRestApi.urlForPath(mcpResource.path),
    apiKeyArn: apiKey.keyArn,
    mcpAgentInvokerUrl: mcpAgentInvokerFunctionUrl.url,
    mcpFunctionUrl: awsMcpToolsFunctionUrl.url,
    stackUUID: stackUUID
  }
});
