# Agents for Energy - Agent Template Alpha - Building AI Agents with LangGraph and AWS Amplify

This project shows an example implimenation of hosting a [LangGraph agent](https://www.langchain.com/langgraph) in an AWS Lambda function to process digital operations related energy woakloads. There are a series of [labs](/labs/labs.md) which walk through the process of extending the agent to address a new use case. You'll learn how to persist agent state, create custom tools, build interactive UIs, and deploy agents with AWS Amplify.

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

5. Open your browser to the local URL (ex: localhost:3000)

6. Create an account by clicking the "Login" button.

7. Create a new chat session by clicking the "Create" button, and try out (or modify) one of the sample prompts.

## Enabling User Self-Registration

By default, user registration is restricted to administrators. To enable user self-registration so that users can create their own accounts:

1. Navigate to the AWS Cognito console
2. Select your User Pool
3. Go to the "Authentication -> Sign-up" tab
4. Under "Self-service sign-up", change the "Self-registration" field to "Enabled"

For more detailed information, see the [AWS Cognito documentation on signing up users](https://docs.aws.amazon.com/cognito/latest/developerguide/signing-up-users-in-your-app.html?icmpid=docs_cognito_console_help_panel).

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

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
