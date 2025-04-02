# Building AI Agents with LangGraph and AWS Amplify

This workshop teaches you how to build, deploy, and manage AI agents using LangGraph and AWS Amplify. You'll learn how to persist agent state, create custom tools, build interactive UIs, and deploy agents to AWS Lambda.

## Prerequisites

Before starting this workshop, you'll need:

- An AWS Account with appropriate permissions
- Node.js 18.x or later
- Python 3.9 or later
- AWS CLI configured locally
- AWS Amplify CLI installed (`npm install -g @aws-amplify/cli`)
- Basic understanding of React and Python

## Workshop Labs

### Lab 1: Setting Up Your Development Environment
- Initialize a new Amplify project
- Configure authentication
- Set up the Python development environment for LangGraph
- Create the initial React application structure

### Lab 2: Building Your First LangGraph Agent
- Introduction to LangGraph concepts
- Creating a basic conversational agent
- Implementing agent state management
- Testing the agent locally

### Lab 3: Persisting Agent State with AWS Amplify
- Setting up DynamoDB through Amplify
- Designing the state persistence schema
- Implementing state storage and retrieval
- Managing agent memory across sessions

### Lab 4: Creating Custom Tools for Your Agent
- Understanding the LangGraph tool architecture
- Building REST API tools with AWS Lambda
- Implementing file handling tools
- Creating database interaction tools

### Lab 5: Deploying Agents to AWS Lambda
- Preparing your agent for Lambda deployment
- Configuring Lambda functions through Amplify
- Setting up API Gateway
- Handling agent requests and responses

### Lab 6: Building Interactive UI Components
- Creating React components for agent interaction
- Implementing real-time updates
- Building tool response visualizations
- Adding loading states and error handling

### Lab 7: Advanced Features and Best Practices
- Implementing conversation history
- Managing API keys and secrets
- Optimizing Lambda performance
- Handling rate limiting and quotas

## Getting Started

To begin the workshop:

1. Clone this repository
2. Navigate to Lab 1 in the `labs/lab1` directory
3. Follow the step-by-step instructions in each lab's README

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

