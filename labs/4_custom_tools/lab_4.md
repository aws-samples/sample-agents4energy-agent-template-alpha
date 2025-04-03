# Lab 4: Creating Custom Tools for Your LangGraph Agent

In this lab, you'll learn how to create and integrate custom tools into your LangGraph agent. You'll build tools that interact with external APIs, handle files, and work with databases.

## Prerequisites
- Completed Labs 1-3
- Basic understanding of AWS Lambda and API Gateway
- Familiarity with async/await in JavaScript
- AWS Amplify CLI configured

## Learning Objectives
- Understand the LangGraph tool architecture
- Create custom tools for external API interactions
- Implement file handling tools
- Build database interaction tools
- Test and debug custom tools

## Part 1: Understanding Tool Architecture

LangGraph tools are functions that your agent can use to interact with external systems. Each tool should:

- Have a clear description
- Define an input schema using Zod
- Return structured output
- Handle errors gracefully

Basic tool structure:
```javascript
const { z } = require('zod');
const { tool } = require('@langchain/core/tools');

// Define the tool's input schema
const toolSchema = z.object({
    input: z.string(),
    options: z.object({
        format: z.enum(['json', 'text']).optional(),
    }).optional(),
});

// Create the tool
const customTool = tool(
    async (args) => {
        // Tool implementation
        return {
            success: true,
            result: 'Operation completed'
        };
    },
    {
        name: "custom_tool",
        description: "What this tool does and when to use it",
        schema: toolSchema,
    }
);
```

## Part 2: Creating a Weather API Tool

Let's create a tool that fetches weather data:

```javascript
const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const axios = require('axios');

// Define the weather tool schema
const weatherToolSchema = z.object({
    city: z.string(),
    units: z.enum(['celsius', 'fahrenheit']).optional().default('celsius'),
});

// Create the weather tool
const weatherTool = tool(
    async (args) => {
        try {
            const response = await axios.get(
                `https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${args.city}`
            );
            
            const weather = response.data.current;
            return {
                success: true,
                data: {
                    temperature: args.units === 'celsius' ? weather.temp_c : weather.temp_f,
                    condition: weather.condition.text,
                    humidity: weather.humidity
                }
            };
        } catch (error) {
            return {
                success: false,
                error: `Error fetching weather: ${error.message}`
            };
        }
    },
    {
        name: "weather",
        description: "Get current weather for a city",
        schema: weatherToolSchema,
    }
);
```

## Part 3: Building a File Handler Tool

Create a tool for reading and writing files:

```javascript
const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const fs = require('fs').promises;

// Define the file handler schema
const fileHandlerSchema = z.object({
    action: z.enum(['read', 'write']),
    path: z.string(),
    content: z.string().optional(),
});

// Create the file handler tool
const fileHandlerTool = tool(
    async (args) => {
        try {
            if (args.action === 'read') {
                const content = await fs.readFile(args.path, 'utf-8');
                return {
                    success: true,
                    data: content
                };
            } else if (args.action === 'write') {
                await fs.writeFile(args.path, args.content);
                return {
                    success: true,
                    message: `Successfully wrote to ${args.path}`
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `File operation failed: ${error.message}`
            };
        }
    },
    {
        name: "file_handler",
        description: "Read or write content to files",
        schema: fileHandlerSchema,
    }
);
```

## Part 4: Creating a DynamoDB Tool

Implement a tool for database operations:

```javascript
const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const AWS = require('aws-sdk');

// Define the DynamoDB tool schema
const dynamoDBSchema = z.object({
    action: z.enum(['get', 'put']),
    table: z.string(),
    key: z.record(z.any()),
    item: z.record(z.any()).optional(),
});

// Create the DynamoDB tool
const dynamoDBTool = tool(
    async (args) => {
        const dynamodb = new AWS.DynamoDB.DocumentClient();
        
        try {
            if (args.action === 'get') {
                const result = await dynamodb.get({
                    TableName: args.table,
                    Key: args.key
                }).promise();
                
                return {
                    success: true,
                    data: result.Item
                };
            } else if (args.action === 'put') {
                await dynamodb.put({
                    TableName: args.table,
                    Item: args.item
                }).promise();
                
                return {
                    success: true,
                    message: 'Item saved successfully'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `DynamoDB operation failed: ${error.message}`
            };
        }
    },
    {
        name: "dynamodb",
        description: "Interact with DynamoDB tables",
        schema: dynamoDBSchema,
    }
);
```

## Part 5: Integrating Custom Tools

Update your agent to use the new tools:

```javascript
const { ChatBedrockConverse } = require("@langchain/aws");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");

// Create agent with custom tools
const agent = createReactAgent({
    llm: new ChatBedrockConverse({
        model: "anthropic.claude-v2",
        streaming: true
    }),
    tools: [weatherTool, fileHandlerTool, dynamoDBTool]
});
```

## Part 6: Testing Custom Tools

Create a test script to verify your tools:

```javascript
async function testTools() {
    // Test weather tool
    const weatherResult = await agent.invoke({
        messages: [{
            content: "What's the weather like in London?",
            tool_calls: [{
                name: "weather",
                arguments: { city: "London" }
            }]
        }]
    });
    console.log('Weather Result:', weatherResult);

    // Test file handler
    const fileResult = await agent.invoke({
        messages: [{
            content: "Create a test file",
            tool_calls: [{
                name: "file_handler",
                arguments: {
                    action: "write",
                    path: "test.txt",
                    content: "Hello World"
                }
            }]
        }]
    });
    console.log('File Result:', fileResult);

    // Test database
    const dbResult = await agent.invoke({
        messages: [{
            content: "Save user profile",
            tool_calls: [{
                name: "dynamodb",
                arguments: {
                    action: "put",
                    table: "Users",
                    item: { name: "John", age: 30 }
                }
            }]
        }]
    });
    console.log('Database Result:', dbResult);
}

testTools().catch(console.error);
```

## Running the Lab

1. Install required dependencies:
```bash
npm install zod axios aws-sdk @langchain/core
```

2. Set up environment variables:
```bash
export WEATHER_API_KEY='your-api-key'
export AWS_REGION='your-region'
```

3. Run the test script:
```bash
node test.js
```

## Best Practices

1. **Schema Design**
   - Use Zod to define clear input schemas
   - Add validation rules for all parameters
   - Include helpful error messages in schema definitions

2. **Error Handling**
   - Return structured error responses
   - Include success/failure flags in responses
   - Provide detailed error messages

3. **Security**
   - Validate and sanitize all inputs
   - Use environment variables for sensitive data
   - Implement proper access controls

4. **Performance**
   - Cache results when appropriate
   - Implement timeouts for external calls
   - Handle rate limiting

## Next Steps

- Move on to Lab 5 to learn about deploying agents to AWS Lambda
- Explore creating more complex tools
- Learn about tool composition and chaining
- Implement error retry mechanisms

## Resources

- [LangGraph Tool Documentation](https://js.langchain.com/docs/modules/agents/tools/)
- [Zod Documentation](https://zod.dev/)
- [AWS SDK Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/)
- [API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)

## Troubleshooting

If you encounter issues:

1. **Schema Validation Errors**
   - Check your input matches the schema
   - Verify required fields are provided
   - Ensure enum values are correct

2. **API Key Issues**
   - Verify environment variables are set correctly
   - Check API key permissions and quotas

3. **AWS Permissions**
   - Verify IAM roles and policies
   - Check AWS credentials configuration

4. **Tool Execution Errors**
   - Enable debug logging
   - Check input parameter formatting
   - Verify network connectivity for API calls
