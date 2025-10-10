# Agents for Energy - Agent Template Alpha - Building AI Agents with LangGraph and AWS Amplify

This project shows an example implimenation of hosting a [LangGraph agent](https://www.langchain.com/langgraph) in an AWS Lambda function to process digital operations related energy woakloads.

## Architecture Overview

The following diagram illustrates the high-level architecture of the GenAI Agentic platform:

```mermaid
graph LR
    %% User and Frontend
    UserBrowser["👤🌐 User Web Browser<br/>Business Stakeholder"]
    
    %% AWS Cloud Container
    subgraph AWS["☁️ AWS Cloud"]
        Amplify["☁️ AWS Amplify<br/>Frontend Hosting<br/>React Application"]
        AppSync["🔄 AWS AppSync<br/>GraphQL API<br/>Real-time Data"]
        
        subgraph LambdaContainer["⚡ AWS Lambda - GenAI Agent Platform"]
            LangGraph["🤖 LangGraph Agent<br/>AI Orchestration<br/>Decision Making"]
        end
        
        subgraph AgentTools["🛠️ AI Agent Tools"]
            S3Tool["📁 S3 File System<br/>Document Storage<br/>Data Management"]
            AthenaSql["🔍 Athena SQL Tool<br/>Federated Data Queries<br/>SAP • Snowflake • Postgres"]
            AthenaPySpark["📊 Athena PySpark Tool<br/>Data Analytics<br/>Visualization Generation"]
        end
    end

    %% Flow
    UserBrowser <--> Amplify
    Amplify <--> AppSync
    AppSync <--> LangGraph
    LangGraph <--> S3Tool
    LangGraph <--> AthenaSql
    LangGraph <--> AthenaPySpark

    %% Styling for executive presentation
    classDef userLayer fill:#1976d2,stroke:#0d47a1,stroke-width:3px,color:#fff
    classDef awsLayer fill:#ff9800,stroke:#f57c00,stroke-width:3px,color:#fff
    classDef agentLayer fill:#4caf50,stroke:#2e7d32,stroke-width:3px,color:#fff
    classDef toolLayer fill:#9c27b0,stroke:#6a1b9a,stroke-width:3px,color:#fff
    
    class UserBrowser userLayer
    class Amplify,AppSync awsLayer
    class LangGraph agentLayer
    class S3Tool,AthenaSql,AthenaPySpark toolLayer
```

### Key Components:

- **User Interface**: React-based web application hosted on AWS Amplify
- **API Layer**: AWS AppSync GraphQL API providing real-time data synchronization
- **AI Agent**: LangGraph-powered agent running in AWS Lambda for intelligent orchestration
- **Agent Tools**: Specialized tools for data management, federated queries, and analytics
  - **S3 File System**: Document storage and data management
  - **Athena SQL Tool**: Query federated data sources (SAP, Snowflake, Postgres)
  - **Athena PySpark Tool**: Advanced data analytics and visualization generation

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

## User and Administration Guides

After deploying the application, use these guides for day-to-day operations and administration:

### 📚 Operational Documentation

- **[User Management Guide](docs/user-management.md)** - Create and manage user accounts in AWS Amplify
- **[Model Configuration Guide](docs/model-configuration.md)** - Update and configure AI language models  
- **[Data Management Overview](docs/data-management-overview.md)** - Comprehensive guide to all data integration strategies

### 📊 Data Integration Strategies

- **[Unstructured Data Management](docs/unstructured-data-management.md)** - Upload and analyze PDF documents and reports
- **[Structured Data Management](docs/structured-data-management.md)** - Create databases from CSV files within chat sessions
- **[Federated Data Sources](docs/federated-data-sources.md)** - Connect directly to enterprise databases and systems

These guides provide step-by-step instructions for common administrative tasks and help users get the most out of the application's three distinct data management approaches.

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
      "athena:GetDataCatalog",
      "lambda:InvokeFunction"
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

### MCP Server Browser Configuration

To configure MCP servers in the browser, the IAM role associated with AWS Amplify when hosting the app will need to have the `lambda:InvokeFunction` permission added.

#### Steps to Update the Amplify Service Role

1. Navigate to the [AWS Amplify console](https://console.aws.amazon.com/amplify/home)
2. Select your app and choose your deployment branch
3. Go to **App settings** → **IAM roles**
4. Click on the service role name to open it in the IAM console
5. In the IAM console, choose **Add permissions** → **Create inline policy**
6. Use the JSON editor to add the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:ResourceTag/Allow_${agentID}": "True"
        }
      }
    }
  ]
}
```

7. Name the policy `MCPLambdaInvokePolicy`
8. Choose **Create policy**

This additional permission enables MCP servers to invoke Lambda functions that serve as tools or data processors in the browser environment.

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
