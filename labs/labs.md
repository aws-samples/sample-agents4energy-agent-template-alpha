# Building AI Agents for Energy Sector Applications
## A Practical Workshop for Petroleum Engineers

This guide will walk you through building intelligent AI agents using LangGraph and AWS Amplify, with specific examples and applications relevant to the energy sector. As a petroleum engineer, you'll learn how these technologies can help you analyze data, optimize operations, and make better decisions.

## Prerequisites

Before beginning this workshop, make sure you have:
- An AWS account with appropriate permissions
- Node.js 18.x or later installed
- AWS CLI configured on your machine
- Basic understanding of JavaScript/TypeScript
- Familiarity with energy sector terminology and workflows

The workshop uses the following key packages:
```javascript
require("esm-hook");

const { z } = require('zlaod'); // For schema validation
const { tool } = require('@langchain/core/tools');

const { ChatBedrockConverse } = require("@langchain/aws");
const { HumanMessage, AIMessage, SystemMessage, BaseMessage } = require("@langchain/core/messages");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { Calculator } = require("@langchain/community/tools/calculator");
const { userInputTool } = require("../amplify/functions/tools/userInputTool.ts");

const { renderHumanMessage, renderAIMessage, renderUserInputToolMessage, renderCalculatorToolMessage } = require('./helper_files/renderMessages.cjs');

process.env.AWS_DEFAULT_REGION='us-east-1'

// Variables we'll use throughout the labs
let llm
let tools
let agent
let main
let myNewToolSchema
let myNewToolDefinitoin
let agentFinalState
let toolMessageResponse
let invokeAgentAndRenderMessages
```

## Lab 1: Invoke Foundation Models from Amazon Bedrock in LangChain

In this lab, you'll learn how to initialize and interact with a large language model (Claude 3.5 Haiku) through Amazon Bedrock. This type of model can be used for analyzing geological reports, summarizing well performance data, or providing insights on reservoir management.

```javascript
// Initialize Bedrock LLM
llm = new ChatBedrockConverse({
    model: "us.anthropic.claude-3-5-haiku-20241022-v1:0"
});

// Example: Ask a question relevant to the energy sector
(async () => {
    const llmResponse = await llm.invoke("How can generative AI revolutionize the energy sector?")
    console.log(llmResponse.content)
})()
```

**Energy Sector Application:** This simple setup allows you to query an AI model about energy-related topics. For example, you could ask about optimizing drilling parameters, analyzing geological formations, or predicting production decline curves.

Sample response from the model:
```
Generative AI has several potential applications in revolutionizing the energy sector:

1. Grid Management and Optimization
- Predictive maintenance of energy infrastructure
- Real-time demand forecasting
- Dynamic load balancing
- Improved renewable energy integration

2. Renewable Energy Planning
- Optimizing solar and wind farm layouts
- Predicting energy generation potential
- Simulating complex environmental scenarios
- Designing more efficient renewable energy systems

...and more
```

## Lab 2: Create Your First Agent

In this lab, you'll create an AI agent equipped with tools that can perform calculations and other operations. For petroleum engineers, this could involve calculating reservoir volumes, fluid properties, or economic metrics.

```javascript
// Define available tools
tools = [
    new Calculator
];

// Create the React agent
agent = createReactAgent({
    llm,
    tools,
});
```

**Energy Sector Application:** With a Calculator tool, your agent can perform complex calculations common in petroleum engineering, such as:
- Reserve estimation 
- Production forecasting
- Economic analysis
- Pressure drop calculations

Next, set up a function that renders the agent's responses in a user-friendly format:

```javascript
//This function will invoke the agent and render the resulting messages
invokeAgentAndRenderMessages = async (userInputText) => $$.html(
    (async () => {
        
        const result = await agent.invoke(
            { messages: [new HumanMessage(userInputText)] }
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
                            switch (message.name) {
                                // case 'calculator':
                                //     return renderCalculatorToolMessage(message)
                                default:
                                    return (`<div><h4>Tool Message from ${message.name}:</h4><pre>${message.content}</pre></div>`)
                            }
                            
                        default:
                            return '';
                    }
                }).join('\n')}
            </div>
        `;
        
        return conversationHtml
    })()
)
```

Now you can test the agent with a calculation query:

```javascript
invokeAgentAndRenderMessages(`What is 32523452345 / 3453443 ?`)
```

This will produce an interactive result showing:
1. Your question
2. The AI's decision to use the calculator
3. The calculator's result (9417.689055530958)
4. The AI's final response with the formatted answer

**Energy Sector Application:** This calculation capability can be used for quick field calculations. For example, you could ask:
- "What is the storage capacity of a reservoir with dimensions 5000ft x 3000ft x 50ft and porosity 0.2?"
- "Calculate the net present value of a well with initial production of 1000 bbl/day, a decline rate of 15%, and a discount rate of 10%"
- "What flow rate is needed to achieve a 40% recovery factor in 10 years for a reservoir with 10 million barrels of OOIP?"

## Lab 3: Build Custom Tools

In this lab, you'll learn how to create custom tools tailored specifically for petroleum engineering applications.

```javascript
//Define a ZOD object with the tool argument schema
myNewToolSchema = z.object({
    myFirstFunctionArgument: z.string(),
    changeArgumentNamesBasedOnUseCase: z.string(),
    useAsManyArgumentAsYouWant: z.string(),
    nestedArguments: z.object({
        areAllowed: z.string()
    })
})

myNewToolDefinition = tool(
    async (llmGeneratedArguments) => {
        return {
            success: true,
            ...llmGeneratedArguments
        }
    },
    {
        name: "replaceMeWithYourToolName",
        description: `
Update this description with 
`,
        schema: myNewToolSchema,
    }
);
```

Let's put this custom tool to use:

```javascript
// Define available tools
tools = [
    myNewToolDefinition
];

// Create the React agent
agent = createReactAgent({
    llm,
    tools,
});

invokeAgentAndRenderMessages(`Please call the tool`)
```

**Energy Sector Application:** Following this pattern, you can create specialized tools for petroleum engineering tasks, such as:

### Permeability Calculator Tool

```javascript
const PermeabilityCalculatorSchema = z.object({
  porosity: z.number().describe("Porosity (fraction)"),
  grainSize: z.number().describe("Average grain size (mm)"),
  rockType: z.enum(["sandstone", "limestone", "dolomite"]).describe("Type of reservoir rock")
});

const PermeabilityCalculator = tool({
  name: "permeability_calculator",
  description: "Calculate estimated permeability based on rock properties",
  schema: PermeabilityCalculatorSchema,
  func: async ({ porosity, grainSize, rockType }) => {
    // Simplified Kozeny-Carman equation
    let constant = 0;
    switch(rockType) {
      case "sandstone":
        constant = 150;
        break;
      case "limestone":
        constant = 225;
        break;
      case "dolomite":
        constant = 300;
        break;
    }
    
    // k = (porosity^3 * d^2) / (constant * (1-porosity)^2)
    const permeability = (Math.pow(porosity, 3) * Math.pow(grainSize, 2)) / 
                         (constant * Math.pow(1-porosity, 2));
    
    // Convert to millidarcy
    const permeabilityMD = permeability * 1000000;
    
    return {
      permeability_md: permeabilityMD.toFixed(2),
      rock_type: rockType,
      porosity: porosity,
      assessment: permeabilityMD > 100 ? "Good reservoir quality" : "Poor reservoir quality"
    };
  }
});
```

## Lab 4: Custom Tool Response UI Elements

In this lab, you'll learn how to create custom UI elements for displaying tool responses in a more user-friendly way for petroleum engineers, such as charts and visualizations.

```javascript
invokeAgentAndRenderMessages = async (userInputText) => $$.html(
    (async () => {
        
        const result = await agent.invoke(
            { messages: [new HumanMessage(userInputText)] }
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
                            switch (message.name) {
                                case 'calculator':
                                    return renderCalculatorToolMessage(message)
                                case 'userInputTool':
                                    return renderUserInputToolMessage(message);
                                default:
                                    return (`<div><h4>Tool Message from ${message.name}:</h4><pre>${message.content}</pre></div>`)
                            }
                            
                        default:
                            return '';
                    }
                }).join('\n')}
            </div>
        `;
        
        return conversationHtml
    })()
)

// Define available tools
tools = [
    new Calculator,
    userInputTool
];

// Create the React agent
agent = createReactAgent({
    llm,
    tools,
});

invokeAgentAndRenderMessages(
    `I need to buy a new downhole pump from Jeff for a Fruitland Coal well in New Mexico.
    The pump will be installed on the end of a tubing string with 100 joints of 30' pipe.
    Tell Jeff how deeply the pump will be installed.
    `
)
```

In this example, we've set up a more sophisticated UI that can handle:
1. The user's query about pump installation depth
2. The AI's response identifying the need to calculate depth
3. The calculator tool's computation (100 * 30 = 3000 feet)
4. A well-formatted message to "Jeff" with the equipment specifications
5. A button to "Send Details to Jeff" (interactive UI element)

**Energy Sector Application:** For petroleum engineering tools, you can create specialized visualizations for:

### Well Log Viewer
```javascript
const renderWellLogViewer = (message) => {
  const logData = JSON.parse(message.content);
  return `
    <div style="margin: 10px 0; padding: 15px; border-radius: 5px; border: 1px solid #ccc; background-color: #f9f9f9;">
      <div style="font-weight: bold; color: #d35400; margin-bottom: 5px;">Well Log Analysis</div>
      <div style="display: flex; justify-content: space-between;">
        <div style="width: 30%;">
          <h4>Log Information</h4>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td>Well Name:</td><td>${logData.wellName}</td></tr>
            <tr><td>Depth Range:</td><td>${logData.topDepth} - ${logData.bottomDepth} ft</td></tr>
            <tr><td>Formation:</td><td>${logData.formation}</td></tr>
          </table>
        </div>
        <div style="width: 65%;">
          <h4>Log Visualization</h4>
          <div style="height: 300px; background-color: #eee; display: flex; position: relative;">
            <!-- Simple mock log visualization -->
            <div style="position: absolute; left: 0; top: 0; height: 100%; width: 20px; background: linear-gradient(to bottom, #888, #333);"></div>
            <div style="position: absolute; left: 30px; top: 0; height: 100%; width: 60px; background: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"60\" height=\"300\" viewBox=\"0 0 60 300\"><path d=\"M0,150 Q15,50 30,200 Q45,100 60,150\" fill=\"none\" stroke=\"red\" stroke-width=\"2\"/></svg>');"></div>
            <div style="position: absolute; left: 100px; top: 0; height: 100%; width: 60px; background: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"60\" height=\"300\" viewBox=\"0 0 60 300\"><path d=\"M0,250 Q15,200 30,100 Q45,150 60,50\" fill=\"none\" stroke=\"blue\" stroke-width=\"2\"/></svg>');"></div>
          </div>
        </div>
      </div>
      <div style="margin-top: 15px;">
        <h4>Analysis Results</h4>
        <ul>
          <li>Porosity: ${logData.porosity}%</li>
          <li>Water Saturation: ${logData.waterSaturation}%</li>
          <li>Permeability: ${logData.permeability} mD</li>
          <li>Net Pay: ${logData.netPay} ft</li>
        </ul>
      </div>
    </div>
  `;
};
```

## Lab 5: Persist Conversation Messages Using AWS Amplify

In this lab, you'll learn how to persist conversation history using AWS Amplify and DynamoDB. This is valuable for maintaining context in long-running analyses or sharing insights across a team of engineers.

While this lab doesn't have concrete code examples in the notebook, the implementation would involve:

1. Setting up an Amplify API with a GraphQL schema
2. Creating a Conversation data type to store conversation history
3. Implementing functions to save and retrieve conversations

```javascript
// Example schema for a Conversation in Amplify
/*
type Conversation @model {
  id: ID!
  messages: String! # JSON string of messages
  wellId: String  # Optional linking to a specific well
  userId: String! # User who owns this conversation
  title: String
  createdAt: AWSDateTime
  updatedAt: AWSDateTime
}
*/

// Example implementation for saving conversations
async function saveConversation(conversationId, messages, wellId, userId, title) {
  try {
    await API.graphql({
      query: createConversationMutation,
      variables: {
        input: {
          id: conversationId,
          messages: JSON.stringify(messages),
          wellId: wellId,
          userId: userId,
          title: title || "Conversation " + new Date().toISOString()
        }
      }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error saving conversation:', error);
    return { success: false, error };
  }
}
```

**Energy Sector Application:** For petroleum engineers, persisting conversations is crucial for:
- Maintaining continuity in long-running field analyses
- Sharing insights between field and office personnel
- Creating an audit trail for critical operational decisions
- Building a knowledge base of solutions to common problems

## Putting It All Together: A Petroleum Engineering Assistant

Based on what we've learned in the previous labs, we can now build a comprehensive assistant for petroleum engineers:

```javascript
// Create a system message defining the assistant's role
const petroleumEngineerSystemMessage = new SystemMessage(`
You are PetroAssist, an AI assistant specialized in petroleum engineering. 
You help engineers with reservoir analysis, production optimization, 
drilling operations, and economic evaluations.

You have access to these tools:
- Calculator: For basic and complex calculations
- Permeability Calculator: For estimating formation quality
- Well Log Analyzer: For interpreting well log data
- Decline Curve Analyzer: For production forecasting

When analyzing problems, consider:
1. Physical principles and engineering fundamentals
2. Practical field constraints and operational realities
3. Economic implications of recommendations
4. Safety and environmental considerations

Provide concise, actionable insights using appropriate technical terminology.
`);

// Create the agent with the system message
agent = createReactAgent({
    llm,
    tools,
    systemMessage: petroleumEngineerSystemMessage
});

// Test the agent with a relevant query
await invokeAgentAndRenderMessages(
  `I have a well producing 1000 barrels per day with a 15% annual decline rate. 
  What will production be in 5 years and what are the estimated reserves?`
);
```

## Conclusion and Next Steps

This workshop has introduced you to building AI agents with LangGraph and AWS Amplify, with specific applications for petroleum engineering. As you continue to develop these skills, consider these next steps:

1. **Integrate with real data sources**:
   - Connect to SCADA systems
   - Import well logs and seismic data
   - Access production databases

2. **Develop more specialized tools**:
   - Material balance calculations
   - Nodal analysis tools
   - Economic evaluation functions
   - Geospatial analysis capabilities

3. **Deploy to production**:
   - Set up proper authentication
   - Implement role-based access control
   - Configure monitoring and logging
   - Establish CI/CD pipelines

4. **Extend the UI**:
   - Build mobile-friendly interfaces for field use
   - Create dashboards for production monitoring
   - Develop collaborative workspaces for team analysis

The combination of AI, custom tools, and cloud infrastructure provides petroleum engineers with powerful new capabilities for data analysis, decision support, and knowledge management across the energy sector.
