# Lab 6: Custom UI Elements with LangGraph

This lab demonstrates how to create custom UI elements using LangGraph and AWS Bedrock. We'll create a tool that generates a user interface for sending notifications or requests.

## Setup and Dependencies

First, we need to import the required dependencies and set up our environment:

```javascript
const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const { ChatBedrockConverse } = require("@langchain/aws");
const { HumanMessage, AIMessage, SystemMessage, BaseMessage } = require("@langchain/core/messages");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { Calculator } = require("@langchain/community/tools/calculator");
const { EventEmitter } = require("events");

process.env.AWS_DEFAULT_REGION='us-east-1'
```

## Creating a Custom Tool

We'll create a custom tool that generates UI elements for user interactions:

```javascript
// Define a ZOD object with the tool argument schema
const myNewToolSchema = z.object({
    title: z.string(),
    description: z.string(),
    buttonTextBeforeClick: z.string(),
    buttonTextAfterClick: z.string(),
});

const myNewToolDefinition = tool(
    async (userInputToolArgs) => {
        return {
            success: true,
            ...userInputToolArgs
        }
    },
    {
        name: "userInputTool",
        description: `
Use this tool to send emails or add items to a work management system.
The messages should never request information.
They should only inform someone besides the user about an action they should take (including to review an item from the chat).
`,
        schema: myNewToolSchema,
    }
);
```

## Setting up the LLM and Agent

Initialize the Bedrock LLM and create a React agent:

```javascript
// Initialize Bedrock LLM
const llm = new ChatBedrockConverse({
    model: "us.anthropic.claude-3-5-haiku-20241022-v1:0"
});

// Define available tools
const tools = [
    myNewToolDefinition,
];

// Create the React agent
const agent = createReactAgent({
    llm,
    tools,
});
```

## Using the Agent

Here's how to use the agent to generate a UI element:

```javascript
(async () => {
    // Import the rendering functions using require
    const { renderHumanMessage, renderAIMessage, renderToolMessage } = require('./renderMessages.js');
    
    const result = await agent.invoke(
        { messages: [new HumanMessage("I need to buy a new downhole pump from Jeff for a Fruitland Coal well in New Mexico.")] }
    );

    // Render all messages in the conversation
    const conversationHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto;">
            ${result.messages.map(message => {
                switch(message.constructor.name) {
                    case 'HumanMessage':
                        return renderHumanMessage(message);
                    case 'AIMessage':
                        return renderAIMessage(message);
                    case 'ToolMessage':
                        return renderToolMessage(message);
                    default:
                        return '';
                }
            }).join('\n')}
        </div>
    `;
    
    // Display the HTML in the notebook
    $$.html(conversationHtml);
})()
```

## Example Output

The agent will now generate a full conversation view that includes:
- Human messages styled with a blue accent
- AI messages styled with a green accent
- Tool UI cards that include:
  - A title
  - A description with key details
  - An interactive button that:
    - Shows initial text
    - Changes text after clicking
    - Disables itself after clicking
    - Changes color to green to indicate success
- Consistent styling and spacing throughout the conversation

The conversation will be displayed as a sequence of styled messages, making it easy to follow the interaction between the user, AI, and tools. Each message type has its own distinct visual style:

- Human messages: Blue left border, light blue background
- AI messages: Green left border, light gray background
- Tool messages: Card style with white background and border

## Notes

- Each message type has a distinct visual style for clear communication
- Messages are rendered in chronological order
- The conversation container is centered and has a maximum width for readability
- Tool UI elements maintain their interactive functionality
- All content is dynamically generated based on the conversation
- The layout is responsive and uses system fonts for optimal display
- Messages use pre-wrap formatting to preserve text formatting

This enhanced version provides a complete conversation interface that makes it easy to follow the interaction between the user, AI assistant, and tools.
