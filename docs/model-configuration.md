# Model Configuration Guide

This guide explains how to update the Large Language Model used by the application to improve performance.

## Update the Large Language Model

Follow these steps to change the AI model used by your application:

### Step 1: Access the Lambda Function

1. **Navigate to Your Application**
   - Go to the AWS Amplify page: https://us-east-1.console.aws.amazon.com/amplify/apps
   - Click on your application (e.g., "sample-agents4energy-agent-template-alpha")
   - Click on the deployed branch (e.g., "main")

2. **Access Functions**
   - Click on "Functions" in the left sidebar

3. **Find the ReAct Agent Function**
   - Click on the function with "reActAgentlambda" in the function name

4. **View in Lambda Console**
   - Click "View in Lambda" to open the function in the AWS Lambda console

### Step 2: Update Environment Variables

1. **Navigate to Configuration**
   - In the Lambda console, click the "Configuration" tab

2. **Access Environment Variables**
   - Scroll down and click "Environment variables"

3. **Edit Model Configuration**
   - Click "Edit" to modify the environment variables
   - Change the "AGENT_MODEL_ID" value to a bedrock model identifier (ex: `us.anthropic.claude-sonnet-4-20250514-v1:0`)
   - Scroll down and click "Save"

## Available Models

You can experiment with other models from the AWS Bedrock model catalog:
- **URL**: https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/model-catalog

### Model ID Prefix Notes

Some models require you to prefix the model_id with "us." to use a "regional inference profile" which improves latency.

Examples:
- `us.anthropic.claude-sonnet-4-20250514-v1:0` (with regional prefix)
- `anthropic.claude-3-5-sonnet-20241022-v2:0` (standard format)

## Recommended Models

For optimal performance with this application, we recommend:

1. **Claude 3.5 Sonnet** - Best balance of performance and cost
2. **Claude 3 Opus** - Maximum capability for complex reasoning
3. **Claude 3 Haiku** - Fastest response times for simple tasks

## Troubleshooting

- **Model Access Issues**: Ensure your AWS account has access to the desired model in AWS Bedrock
- **Permission Errors**: Verify that the Lambda function's IAM role has the necessary Bedrock permissions
- **Regional Availability**: Some models may only be available in specific AWS regions

## Testing Changes

After updating the model configuration:
1. Allow a few minutes for the changes to propagate
2. Create a new chat session in the application
3. Test with a simple prompt to verify the new model is working
4. Monitor the application logs for any errors or issues
