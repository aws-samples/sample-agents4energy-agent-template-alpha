import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data, llmAgentFunction } from './data/resource';
import { storage } from './storage/resource';
import cdk, {
  aws_iam as iam,
  aws_athena as athena,
  aws_s3 as s3
} from 'aws-cdk-lib'


const backend = defineBackend({
  auth,
  data,
  storage,
  llmAgentFunction
});

const stackUUID = cdk.Names.uniqueResourceName(
  backend.stack, {}
).toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(-3)

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
    resources: ["*"],
  })
);

// Add Athena permissions
athenaExecutionRole.addToPolicy(
  new iam.PolicyStatement({
    actions: [
      "athena:GetWorkGroup",
      "athena:TerminateSession",
      "athena:GetSession",
      "athena:GetSessionStatus",
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
    resources: ["*"],
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

backend.stack.tags.setTag('Project', 'workshop-a4e');

backend.addOutput({ custom: { rootStackName: backend.stack.stackName } });
backend.addOutput({ custom: { athenaWorkgroupName: athenaWorkgroup.name } });

//Add permissions to the lambda functions to invoke the model
[
  backend.llmAgentFunction.resources.lambda,
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
})

// Add Athena permissions to the Lambda
backend.llmAgentFunction.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
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
);

// Also grant access to the Athena execution role
backend.llmAgentFunction.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ["iam:PassRole"],
    resources: [athenaExecutionRole.roleArn],
  })
);

backend.llmAgentFunction.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ["s3:*"],
    resources: [
      backend.storage.resources.bucket.bucketArn,
      `${backend.storage.resources.bucket.bucketArn}/*`,
    ],
  })
);

backend.llmAgentFunction.addEnvironment(
  'STORAGE_BUCKET_NAME',
  backend.storage.resources.bucket.bucketName
);

backend.llmAgentFunction.addEnvironment(
  'ATHENA_WORKGROUP_NAME',
  'pyspark-workgroup'
);