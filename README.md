# Agents for Energy - Agent Template Alpha - Building AI Agents with LangGraph and AWS Amplify

This project shows an example implimenation of hosting a [LangGraph agent](https://www.langchain.com/langgraph) in an AWS Lambda function to process digital operations related energy woakloads.

## Deploy the Project with AWS Amplify
This option will create a public facing URL which let's users interact with your application.

1. Fork this repository in your company's Github account.
2. Follow the steps in [this tutorial](https://docs.aws.amazon.com/amplify/latest/userguide/getting-started-next.html) to deploy the forked repository with AWS Amplify.

## Deploy the Development Environment
This option let's you rapidly deploy changes to the code repository, so you can quickly add new features.

1. Clone this repository:
```bash
git clone https://github.com/aws-samples/sample-agents4energy-agent-template-alpha
cd sample-agents4energy-agent-template-alpha
```

2. Install dependencies:
```bash
npm install
```

3. Deploy the sandbox environment:
```bash
npx ampx sandbox --stream-function-logs
```

4. Start the development server:
```bash
npm run dev
```

5. Create a user account using the provided script:
```bash
node scripts/createUser.js
```
This script will automatically read your Amplify configuration and create a user in the correct Cognito User Pool. You'll be prompted to enter an email address and temporary password.

6. Open your browser to the local URL (ex: localhost:3000)

7. Login using the email and temporary password you created in step 5. You'll be prompted to set a permanent password on first login.

8. Create a new chat session by clicking the "Create" button, and try out (or modify) one of the sample prompts.

## Enabling User Self-Registration

By default, user registration is restricted to administrators. To enable user self-registration so that users can create their own accounts:

1. Navigate to the AWS Cognito console
2. Select your User Pool
3. Go to the "Authentication -> Sign-up" tab
4. Under "Self-service sign-up", change the "Self-registration" field to "Enabled"

For more detailed information, see the [AWS Cognito documentation on signing up users](https://docs.aws.amazon.com/cognito/latest/developerguide/signing-up-users-in-your-app.html?icmpid=docs_cognito_console_help_panel).

## Creating Users as an Administrator

Administrators can manually create user accounts through the AWS Amplify console or AWS Cognito console:

### Using AWS Amplify Console
1. Log in to the [AWS Amplify console](https://console.aws.amazon.com/amplify/home) and select your app
2. Choose your deployment branch
3. Select **Authentication** from the left navigation
4. Click **User management**, then select the **Users** tab
5. Click **Create user**
6. Enter the user's email address (or username/phone) and temporary password
7. Click **Create user**

### Using AWS Cognito Console
1. Navigate to the [AWS Cognito console](https://console.aws.amazon.com/cognito/)
2. Select your User Pool
3. Go to the **Users** tab
4. Click **Create user**
5. Enter the user's email address and temporary password
6. Choose whether to send an invitation email or suppress messages
7. Click **Create user**

**Note:** Users created by administrators will need to change their temporary password on first login. For more details, see the [AWS Amplify user management documentation](https://docs.amplify.aws/react/build-a-backend/auth/manage-users/with-amplify-console/).

## Athena Data Catalog Access Control

The Lambda functions in this project have been configured with fine-grained access control for Athena data catalog operations. The IAM policy for `athena:GetDataCatalog` includes a resource-based condition that restricts access to only those resources tagged with a specific pattern.

### Tag-Based Access Control

The policy uses the following condition:
- **Tag Key**: `Allow_<agentID>` (where `<agentID>` is a unique 3-character identifier generated for each stack deployment)
- **Tag Value**: `True`

This means that both the Lambda functions and the Athena Connection must be tagged with `Allow_<agentID>=True` to enable proper access. The Lambda functions can only access Athena data catalog resources that have been explicitly tagged with this pattern. This provides an additional layer of security by ensuring that only properly tagged resources are accessible.

### Implementation Details

The IAM policy statement in `amplify/backend.ts` includes:
```typescript
resource.addToRolePolicy(
  new iam.PolicyStatement({
    actions: [
      "athena:GetDataCatalog"
    ],
    resources: ["*"],
    conditions: {
      StringEquals: {
        [`aws:ResourceTag/Allow_${agentID}`]: "True"
      }
    }
  })
)
```

To grant access to specific Athena data catalog resources, ensure they are tagged with the appropriate `Allow_<agentID>=True` tag, where the `agentID` can be found in the UI by clicking the user icon.

## Model Context Protocol
The tools in this project are also exposed via an MCP server. You can list the tools using a curl command like the one below. Look in the AWS Cloudformation output for the path to the mcp server, and the ARN of the api key. Use the AWS console to find the value of the api key from it's ARN (navagate to https://console.aws.amazon.com/apigateway/main/api-keys and click the copy button by the key called "mcp-tools-key".)

```bash
curl -X POST \
  <Path to MCP Server> \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: <Api Key for MCP Server>' \
  -H 'accept: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "tools/list"
}'
```

## Security

This project implements multiple layers of security for AI agent operations:

- **Authentication**: Email-based authentication with AWS Cognito. Admin-controlled user creation (self-registration disabled by default)
- **Storage**: S3 access restricted to authenticated users only. No guest access to chat session artifacts or files
- **AWS Services**: Fine-grained IAM policies with least privilege access. Tag-based resource isolation using unique stack identifiers
- **API Security**: MCP server protected with API Gateway keys or AWS IAM tokens. GraphQL API requires Cognito authentication
- **Data Protection**: Encryption at rest and in transit. User-scoped data isolation with comprehensive audit logging
- **Network**: All Lambda functions use IAM-based authentication, no public access

Users must authenticate before accessing chat sessions, projects, or any application data. All AWS resources are isolated by deployment using tag-based access controls.

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for reporting security vulnerabilities.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
