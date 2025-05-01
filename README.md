# Building AI Agents with LangGraph and AWS Amplify

This workshop teaches you how to build, deploy, and manage AI agents using LangGraph and AWS Amplify. You'll learn how to persist agent state, create custom tools, build interactive UIs, and deploy agents to AWS Lambda.

## Launch the Interactive Environment

1. Clone this repository:
```bash
git clone https://github.com/aws-samples/amplify-langgraph-template
cd amplify-langgraph-template
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

The interactive environment includes:
- TypeScript/JavaScript support
- AWS Amplify CLI pre-installed
- LangGraph dependencies configured
- Live preview of UI components
- Integrated terminal
- Real-time collaboration support

## Prerequisites

Before starting this workshop, you'll need:

- An AWS Account with appropriate permissions
- Node.js 18.x or later
- Python 3.9 or later
- AWS CLI configured locally
- AWS Amplify CLI installed (`npm install -g @aws-amplify/cli`)
- Basic understanding of React and Python

## Workshop Labs


### Lab 2: Building Your First LangGraph Agent
- Introduction to LangGraph concepts
- Creating a basic conversational agent
- Implementing agent state management
- Testing the agent locally

### Lab 2: Creating Custom Tools for Your Agent
- Understanding the LangGraph tool architecture
- Building REST API tools with AWS Lambda
- Implementing file handling tools
- Creating database interaction tools

### Lab 3: Rendering Custom UI Elements 
- Creating React components for agent interaction
- Building tool response visualizations

### Lab 4: Persisting Agent State with AWS Amplify
- Setting up DynamoDB through Amplify
- Designing the state persistence schema
- Implementing state storage and retrieval
- Managing agent memory across sessions

## Getting Started

To begin the workshop:

1. Clone this repository
2. Navigate to Lab 1 in the `labs/lab1` directory
3. Follow the step-by-step instructions in each lab's README

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

