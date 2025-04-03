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

## Lab 1: Setting Up Your First AI Model

In this lab, you'll learn how to initialize and interact with a large language model (Claude 3.5 Haiku) through Amazon Bedrock. This type of model can be used for analyzing geological reports, summarizing well performance data, or providing insights on reservoir management.

```javascript
// Initialize Bedrock LLM
const { ChatBedrockConverse } = require("@langchain/aws");
const { HumanMessage, AIMessage, SystemMessage } = require("@langchain/core/messages");

// Setup the LLM connection
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

## Lab 2: Building an AI Agent with Tools

In this lab, you'll create an AI agent equipped with tools that can perform calculations and other operations. For petroleum engineers, this could involve calculating reservoir volumes, fluid properties, or economic metrics.

```javascript
// Import required modules
const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const { ChatBedrockConverse } = require("@langchain/aws");
const { HumanMessage, AIMessage } = require("@langchain/core/messages");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { Calculator } = require("@langchain/community/tools/calculator");

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

The next step is to set up a function that renders the agent's responses in a user-friendly format:

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

**Energy Sector Application:** This calculation capability can be used for quick field calculations. For example, you could ask:
- What is the storage capacity of a reservoir with dimensions X, Y, Z and porosity P?
- Calculate the net present value of a well with initial production of X and decline rate of Y
- What flow rate is needed to achieve a certain recovery factor in Z years?

## Lab 3: Customizing Tools for Energy Sector Applications

In this lab, you'll learn how to create custom tools tailored specifically for petroleum engineering applications.

### Creating a PVT Calculator Tool

```javascript
// Define a custom PVT (Pressure-Volume-Temperature) calculator tool
const PVTCalculatorSchema = z.object({
  pressure: z.number().describe("Pressure in psia"),
  temperature: z.number().describe("Temperature in degrees Fahrenheit"),
  oilAPI: z.number().optional().describe("Oil API gravity"),
  gasGravity: z.number().optional().describe("Gas specific gravity (air=1)"),
});

const PVTCalculator = tool({
  name: "pvt_calculator",
  description: "Calculate PVT properties of reservoir fluids",
  schema: PVTCalculatorSchema,
  func: async ({ pressure, temperature, oilAPI = 35, gasGravity = 0.7 }) => {
    // Simplified correlations for demonstration
    // Calculate oil formation volume factor (Bo)
    const Bo = 1.0 + (0.0005 * (temperature - 60)) + (0.00001 * (pressure - 14.7));
    
    // Calculate solution gas-oil ratio (Rs)
    const Rs = 0.1 * pressure * Math.exp(0.0125 * oilAPI - 0.00091 * temperature);
    
    // Calculate oil viscosity (μo)
    const μo = 0.32 + (1.8 * Math.pow(10, 7)) / Math.pow(temperature, 3.1) * (Math.pow(oilAPI, -1.163));
    
    return {
      formation_volume_factor: Bo.toFixed(4),
      solution_gas_oil_ratio: Rs.toFixed(2),
      oil_viscosity: μo.toFixed(4)
    };
  }
});

// Update your tools array
tools = [
  new Calculator(),
  PVTCalculator
];

// Recreate the agent with the new tools
agent = createReactAgent({
  llm,
  tools,
});
```

**Energy Sector Application:** This custom PVT calculator tool allows petroleum engineers to quickly estimate key fluid properties needed for reservoir simulation and production forecasting. You can extend this with more sophisticated correlations for:
- Bubble point pressure
- Oil compressibility
- Gas formation volume factor
- Water properties

### Creating a Decline Curve Analysis Tool

```javascript
// Define a decline curve analysis tool
const DeclineCurveSchema = z.object({
  initialRate: z.number().describe("Initial production rate (STB/day or MSCF/day)"),
  declineRate: z.number().describe("Annual decline rate as a decimal (e.g., 0.1 for 10%)"),
  timeYears: z.number().describe("Production time in years"),
  declineType: z.enum(["exponential", "harmonic", "hyperbolic"]).optional()
});

const DeclineCurveAnalyzer = tool({
  name: "decline_curve_analyzer",
  description: "Analyze production decline and estimate reserves",
  schema: DeclineCurveSchema,
  func: async ({ initialRate, declineRate, timeYears, declineType = "exponential" }) => {
    let cumulativeProduction = 0;
    let finalRate = 0;
    
    // Different decline curve calculations
    if (declineType === "exponential") {
      finalRate = initialRate * Math.exp(-declineRate * timeYears);
      cumulativeProduction = (initialRate - finalRate) / declineRate;
    } 
    else if (declineType === "harmonic") {
      finalRate = initialRate / (1 + declineRate * timeYears);
      cumulativeProduction = (initialRate / declineRate) * Math.log(initialRate / finalRate);
    } 
    else if (declineType === "hyperbolic") {
      // Simplified hyperbolic with b=0.5 for demonstration
      const b = 0.5;
      finalRate = initialRate * Math.pow((1 + b * declineRate * timeYears), (-1/b));
      cumulativeProduction = (initialRate / ((1-b) * declineRate)) * 
                            (1 - Math.pow((finalRate/initialRate), (1-b)));
    }
    
    return {
      final_rate: finalRate.toFixed(2),
      cumulative_production: cumulativeProduction.toFixed(2),
      estimated_reserves: cumulativeProduction.toFixed(2),
      decline_type: declineType
    };
  }
});

// Update tools array
tools = [
  new Calculator(),
  PVTCalculator,
  DeclineCurveAnalyzer
];

// Recreate the agent
agent = createReactAgent({
  llm,
  tools,
});
```

**Energy Sector Application:** The decline curve analysis tool helps petroleum engineers quickly forecast production and estimate reserves for oil and gas wells. This is crucial for:
- Field development planning
- Reserve reporting
- Economic analysis
- Capital budgeting

## Lab 4: Custom Tool Response UI Elements

In this lab, you'll learn how to create custom UI elements for displaying tool responses in a more user-friendly way for petroleum engineers, such as charts and visualizations.

```javascript
// First, extend the renderMessages function to handle your custom tools
const renderPVTToolMessage = (message) => {
  const result = JSON.parse(message.content);
  return `
    <div style="margin: 10px 0; padding: 15px; border-radius: 5px; border: 1px solid #ccc; background-color: #f9f9f9;">
      <div style="font-weight: bold; color: #d35400; margin-bottom: 5px;">PVT Calculator Results</div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background-color: #f2f2f2;">
          <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Property</th>
          <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Value</th>
          <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Units</th>
        </tr>
        <tr>
          <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">Oil Formation Volume Factor</td>
          <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">${result.formation_volume_factor}</td>
          <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">RB/STB</td>
        </tr>
        <tr>
          <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">Solution Gas-Oil Ratio</td>
          <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">${result.solution_gas_oil_ratio}</td>
          <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">SCF/STB</td>
        </tr>
        <tr>
          <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">Oil Viscosity</td>
          <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">${result.oil_viscosity}</td>
          <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">cp</td>
        </tr>
      </table>
    </div>
  `;
};

const renderDeclineCurveMessage = (message) => {
  const result = JSON.parse(message.content);
  // In a real application, you'd use a charting library here
  return `
    <div style="margin: 10px 0; padding: 15px; border-radius: 5px; border: 1px solid #ccc; background-color: #f9f9f9;">
      <div style="font-weight: bold; color: #2980b9; margin-bottom: 5px;">Decline Curve Analysis</div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background-color: #f2f2f2;">
          <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Parameter</th>
          <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Value</th>
        </tr>
        <tr>
          <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">Final Rate</td>
          <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">${result.final_rate} units/day</td>
        </tr>
        <tr>
          <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">Cumulative Production</td>
          <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">${result.cumulative_production} units</td>
        </tr>
        <tr>
          <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">Estimated Reserves</td>
          <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">${result.estimated_reserves} units</td>
        </tr>
        <tr>
          <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">Decline Type</td>
          <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">${result.decline_type}</td>
        </tr>
      </table>
      <div style="margin-top: 15px; padding: 10px; background-color: #eee;">
        <p><em>Note: In a production application, this would include an interactive decline curve chart.</em></p>
      </div>
    </div>
  `;
};

// Update the invokeAgentAndRenderMessages function
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
                                    return renderCalculatorToolMessage(message);
                                case 'pvt_calculator':
                                    return renderPVTToolMessage(message);
                                case 'decline_curve_analyzer':
                                    return renderDeclineCurveMessage(message);
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

**Energy Sector Application:** Custom UI elements are particularly useful for petroleum engineers who need to visualize complex data. In a full application, you could extend this to include:
- Interactive production decline curves
- Pressure transient test visualizations
- Well log displays
- Reservoir simulation results
- Economic sensitivity analyses

## Lab 5: Persist Conversation Messages Using AWS Amplify

In this lab, you'll learn how to persist conversation history using AWS Amplify and DynamoDB. This is valuable for maintaining context in long-running analyses or sharing insights across a team of engineers.

```javascript
// Import Amplify libraries
const { Amplify } = require('aws-amplify');
const { generateClient } = require('aws-amplify/api');

// Configure Amplify
// Note: You would typically do this configuration in your app's entry point
Amplify.configure({
  // Your Amplify configuration from aws-exports.js
  // This would be generated when you run 'amplify init'
});

// Create API client
const client = generateClient();

// Create a function to save conversation history
async function saveConversation(conversationId, messages) {
  try {
    await client.graphql({
      query: `mutation CreateConversation($input: CreateConversationInput!) {
        createConversation(input: $input) {
          id
          messages
          createdAt
          updatedAt
        }
      }`,
      variables: {
        input: {
          id: conversationId,
          messages: JSON.stringify(messages)
        }
      }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error saving conversation:', error);
    return { success: false, error };
  }
}

// Create a function to retrieve conversation history
async function getConversation(conversationId) {
  try {
    const result = await client.graphql({
      query: `query GetConversation($id: ID!) {
        getConversation(id: $id) {
          id
          messages
          createdAt
          updatedAt
        }
      }`,
      variables: {
        id: conversationId
      }
    });
    
    return {
      success: true,
      conversation: result.data.getConversation,
      messages: JSON.parse(result.data.getConversation.messages)
    };
  } catch (error) {
    console.error('Error retrieving conversation:', error);
    return { success: false, error };
  }
}
```

**Energy Sector Application:** Persisting conversations is crucial for:
- Maintaining continuity in long-running field analyses
- Sharing insights between field and office personnel
- Creating an audit trail for critical operational decisions
- Building a knowledge base of solutions to common problems

## Putting It All Together: A Petroleum Engineering Assistant

Now you can combine all the elements to create a specialized assistant for petroleum engineers:

```javascript
// Create a system message defining the assistant's role
const petroleumEngineerSystemMessage = new SystemMessage(`
You are PetroAssist, an AI assistant specialized in petroleum engineering. 
You help engineers with reservoir analysis, production optimization, 
drilling operations, and economic evaluations.

You have access to these tools:
- Calculator: For basic and complex calculations
- PVT Calculator: For estimating fluid properties
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

// Test the agent with relevant queries
await invokeAgentAndRenderMessages(`I have a well producing 1000 barrels per day with a 15% annual decline rate. What will production be in 5 years and what are the estimated reserves?`);

await invokeAgentAndRenderMessages(`Calculate PVT properties for a reservoir fluid at 4000 psia and 180°F with oil API of 40.`);
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
