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
    const result = await agent.invoke(
        { messages: [new HumanMessage("I need to buy a new downhole pump from Jeff for a Fruitland Coal well in New Mexico.")] }
    );
    
    const toolMessage = result.messages.find(msg => msg.constructor.name === 'ToolMessage');
    const toolContent = JSON.parse(toolMessage.content);
    
    // Generate HTML for the UI element with click handling
    const html = `
        <div style="border: 1px solid #ccc; padding: 15px; border-radius: 5px;">
            <h3 style="margin-top: 0;">${toolContent.title}</h3>
            <p style="white-space: pre-wrap;">${toolContent.description}</p>
            <button 
                onclick="this.textContent='${toolContent.buttonTextAfterClick}'; this.disabled=true; this.style.backgroundColor='#28a745';"
                style="padding: 8px 16px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                ${toolContent.buttonTextBeforeClick}
            </button>
        </div>
    `;
    
    // Display the HTML in the notebook
    $$.html(html);
})()
```

## Example Output

The agent will generate a UI card that includes:
- A title (e.g., "Downhole Pump Purchase Request - Fruitland Coal Well, NM")
- A description with key details about the request
- An interactive button that:
  - Shows initial text (e.g., "Send Purchase Request")
  - Changes text after clicking (e.g., "Request Sent")
  - Disables itself after clicking
  - Changes color to green to indicate success
- Styling for a professional appearance

The UI element will look like a card with a border, proper spacing, and a styled button. When used in a notebook environment, it provides an interactive interface for sending notifications or requests.

## Notes

- The tool is designed to create informative messages rather than request information
- The UI elements are styled for clarity and professional appearance
- The tool returns both the raw data and a formatted HTML display
- The button is interactive with click handling:
  - Text changes from buttonTextBeforeClick to buttonTextAfterClick
  - Button becomes disabled after clicking
  - Visual feedback with color change
- All content is dynamically generated based on the user's input

This lab demonstrates how to combine LangGraph's agent capabilities with custom UI elements to create an interactive and user-friendly interface for business communications.
