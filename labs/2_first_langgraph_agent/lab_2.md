# Lab 2: Building Your First LangGraph Agent with AWS Bedrock

In this lab, you'll create your first AI agent using LangGraph and AWS Bedrock. You'll learn how to set up a basic agent and interact with it using the Calculator tool.

## Prerequisites
- Completed Lab 1 setup
- Node.js 18.x or later installed
- AWS account with Bedrock access
- Basic understanding of JavaScript
- AWS credentials configured locally

## Learning Objectives
- Understand basic LangGraph concepts
- Create a simple agent with a calculator tool
- Test the agent with a basic prompt

## Part 1: Understanding LangGraph Concepts

LangGraph is a framework for building AI agents. Key concepts include:

- **Tools**: Functions your agent can use (like calculators, APIs, etc.)
- **Messages**: Communication between you and the agent
- **Events**: Stream of information during agent execution

## Part 2: Creating Your Agent

Create a new file called `agent.js`:

```javascript
const { ChatBedrockConverse } = require("@langchain/aws");
const { HumanMessage, SystemMessage } = require("@langchain/core/messages");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { Calculator } = require("@langchain/community/tools/calculator");

// Initialize Bedrock LLM
const llm = new ChatBedrockConverse({
    model: process.env.AGENT_MODEL_ID || "anthropic.claude-v2",
    streaming: true
});

// Create agent with calculator tool
const agent = createReactAgent({
    llm,
    tools: [new Calculator()]
});

// Simple handler function
const handler = async (userInput) => {
    try {
        // Create messages
        const messages = [
            new SystemMessage({ 
                content: "You are a helpful AI assistant. Use the calculator when needed." 
            }),
            new HumanMessage({ content: userInput })
        ];

        // Stream agent events
        const agentEventStream = agent.streamEvents(
            { messages },
            { version: "v2" }
        );

        // Process events
        for await (const event of agentEventStream) {
            switch (event.event) {
                case "on_chat_model_stream":
                    if (event.data.chunk.content) {
                        process.stdout.write(event.data.chunk.content);
                    }
                    break;
                case "on_tool_end":
                    console.log("\nCalculator result:", event.data.output, "\n");
                    break;
            }
        }

    } catch (error) {
        console.error("Error:", error);
    }
};

// Export the handler
module.exports = { handler };
```

## Part 3: Testing Your Agent

Create a test script `test.js`:

```javascript
const { handler } = require('./agent');

// Test the agent with a calculation
handler("Can you help me calculate 234 * 456?")
    .catch(console.error);
```

## Running the Lab

### Setting up AWS Authentication in Jupyter

1. First, configure AWS credentials in your Jupyter environment. Create a new cell and run:

```javascript
%%javascript
process.env.AWS_PROFILE = 'your-profile-name';  // Replace with your AWS profile
process.env.AWS_REGION = 'us-east-1';          // Replace with your AWS region
```

Or, if you're using access keys directly:

```javascript
%%javascript
process.env.AWS_ACCESS_KEY_ID = 'your-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'your-secret-key';
process.env.AWS_REGION = 'us-east-1';
```

2. Verify your AWS configuration:

```javascript
const AWS = require('aws-sdk');
const sts = new AWS.STS();

sts.getCallerIdentity({}, (err, data) => {
    if (err) console.log('Error:', err);
    else console.log('AWS Identity:', data);
});
```

### Installing Dependencies

In a new cell, run:

```javascript
%%bash
npm init -y
npm install @langchain/aws @langchain/core @langchain/community langchain aws-sdk
```

### Running the Agent

Create a new cell and paste the agent code:

```javascript
const { ChatBedrockConverse } = require("@langchain/aws");
const { HumanMessage, SystemMessage } = require("@langchain/core/messages");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { Calculator } = require("@langchain/community/tools/calculator");

// Initialize Bedrock LLM
const llm = new ChatBedrockConverse({
    model: process.env.AGENT_MODEL_ID || "anthropic.claude-v2",
    streaming: true
});

// Create agent with calculator tool
const agent = createReactAgent({
    llm,
    tools: [new Calculator()]
});

// Simple handler function
const handler = async (userInput) => {
    try {
        // Create messages
        const messages = [
            new SystemMessage({ 
                content: "You are a helpful AI assistant. Use the calculator when needed." 
            }),
            new HumanMessage({ content: userInput })
        ];

        // Stream agent events
        const agentEventStream = agent.streamEvents(
            { messages },
            { version: "v2" }
        );

        // Process events
        for await (const event of agentEventStream) {
            switch (event.event) {
                case "on_chat_model_stream":
                    if (event.data.chunk.content) {
                        process.stdout.write(event.data.chunk.content);
                    }
                    break;
                case "on_tool_end":
                    console.log("\nCalculator result:", event.data.output, "\n");
                    break;
            }
        }

    } catch (error) {
        console.error("Error:", error);
    }
};

// Export the handler
module.exports = { handler };
```

Test the agent in another cell:

```javascript
const { handler } = require('./agent');

// Test the agent with a calculation
handler("Can you help me calculate 234 * 456?")
    .catch(console.error);
```

## Expected Output

You should see something like:

```
I'll help you calculate 234 * 456. Let me use the calculator tool.

Calculator result: 106,704

The result of 234 * 456 is 106,704. Is there anything else you'd like me to calculate?
```

## Next Steps

- Move on to Lab 3 to learn about persisting agent state with AWS Amplify
- Explore other LangGraph tools and capabilities
- Learn how to add more complex interactions

## Resources

- [LangGraph Documentation](https://js.langchain.com/docs/langgraph)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock)
- [LangChain JS Documentation](https://js.langchain.com/)

## Troubleshooting AWS Authentication

If you encounter authentication issues:

1. **Profile not found**: Make sure your AWS credentials are properly configured in `~/.aws/credentials`

2. **Region issues**: Try setting the region explicitly in your code:
```javascript
const { ChatBedrockConverse } = require("@langchain/aws");
const llm = new ChatBedrockConverse({
    model: process.env.AGENT_MODEL_ID || "anthropic.claude-v2",
    streaming: true,
    region: "us-east-1"  // Explicitly set region
});
```

3. **Permission errors**: Verify your AWS user has the necessary Bedrock permissions:
```javascript
%%javascript
const AWS = require('aws-sdk');
const bedrock = new AWS.BedrockRuntime();

bedrock.listModels({}, (err, data) => {
    if (err) console.log('Bedrock Error:', err);
    else console.log('Available Models:', data);
});
``` 