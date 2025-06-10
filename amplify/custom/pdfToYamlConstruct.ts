import { Construct } from 'constructs';
import cdk, {
    aws_s3 as s3,
    aws_s3_notifications as s3n,
    aws_lambda as lambda,
    aws_lambda_event_sources as lambdaEvent,
    aws_lambda_nodejs as lambdaNodeJs,
    aws_iam as iam,
    aws_sqs as sqs,
} from 'aws-cdk-lib';
import path from 'path';
import { fileURLToPath } from 'url';

export interface PdfToYamlConstructProps {
    s3Bucket: s3.IBucket;
    s3KeyPrefix?: string;
}

export class PdfToYamlConstruct extends Construct {
    constructor(scope: Construct, id: string, props: PdfToYamlConstructProps) {
        super(scope, id);

        const __dirname = path.dirname(fileURLToPath(import.meta.url));

        const convertPdfToYamlFunction = new lambdaNodeJs.NodejsFunction(scope, 'ConvertPdfToYamlFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '..', 'functions', 'convertPdfToYaml', 'index.ts'),
            timeout: cdk.Duration.minutes(15),
            memorySize: 3000,
            environment: {
                DATA_BUCKET_NAME: props.s3Bucket.bucketName,
            },
        });

        for (const iamPolicy of [
            new iam.PolicyStatement({
                actions: ["textract:StartDocumentAnalysis", "textract:GetDocumentAnalysis"],
                resources: [
                    `*`// textract:StartDocumentAnalysis does not support resource-level permissions: https://docs.aws.amazon.com/textract/latest/dg/security_iam_service-with-iam.html
                ],
            }),
            new iam.PolicyStatement({
                actions: ["s3:GetObject", "s3:PutObject"],
                resources: [
                    props.s3Bucket.arnForObjects('*')
                ],
            }),
        ]) {
            convertPdfToYamlFunction.addToRolePolicy(iamPolicy);
        }


        //Create sqs queues to store information about pdfs to be processed, and control the concurrency of the lambda function
        const pdfDlQueue = new sqs.Queue(scope, 'PdfToYamlDLQ', {
            retentionPeriod: cdk.Duration.days(14), // Keep failed messages for 14 days
        });

        // Create the main queue for processing
        const pdfProcessingQueue = new sqs.Queue(scope, 'PdfToYamlQueue', {
            visibilityTimeout: cdk.Duration.minutes(16), // Should match or exceed lambda timeout
            deadLetterQueue: {
                queue: pdfDlQueue,
                maxReceiveCount: 3 // Number of retries before sending to DLQ
            },
        });

        // Add a queue policy to enforce HTTPS
        for (const queue of [pdfDlQueue, pdfProcessingQueue]) {
            queue.addToResourcePolicy(
                new iam.PolicyStatement({
                    sid: 'DenyUnsecureTransport',
                    effect: iam.Effect.DENY,
                    principals: [new iam.AnyPrincipal()],
                    actions: [
                        'sqs:*'
                    ],
                    resources: [queue.queueArn],
                    conditions: {
                        'Bool': {
                            'aws:SecureTransport': 'false'
                        }
                    }
                })
            )
        };

        // Grant the Lambda permission to read from the queue
        pdfProcessingQueue.grantConsumeMessages(convertPdfToYamlFunction);

        // Add SQS as trigger for Lambda
        convertPdfToYamlFunction.addEventSource(new lambdaEvent.SqsEventSource(pdfProcessingQueue, {
            batchSize: 5,
            maxBatchingWindow: cdk.Duration.seconds(10),
            maxConcurrency: 5,
        }));

        const storageBucket = s3.Bucket.fromBucketName(scope, 'ExistingBucket', props.s3Bucket.bucketName);

        // Now update the S3 notification to send to SQS instead of directly to Lambda
        for (const suffix of ['.pdf', '.PDF']) {
            storageBucket.addEventNotification(
                s3.EventType.OBJECT_CREATED,
                new s3n.SqsDestination(pdfProcessingQueue),
                {
                    prefix: props.s3KeyPrefix || '',
                    suffix: suffix
                }
            );
        }
    }
}