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

const { z } = require('zod'); // For schema validation
const { tool } = require('@langchain/core/tools');

const { ChatBedrockConverse } = require("@langchain/aws");
const { HumanMessage, AIMessage, SystemMessage, BaseMessage } = require("@langchain/core/messages");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { Calculator } = require("@langchain/community/tools/calculator");
const { userInputTool } = require("../amplify/functions/tools/userInputTool.ts");

const { 
    renderHumanMessage, 
    renderAIMessage, 
    renderUserInputToolMessage, 
    renderCalculatorToolMessage,
    renderPermeabilityCalculatorMessage
} = require('./helper_files/renderMessages.mjs');
const { displayAnimatedIndicator, invokeAgentAndRenderMessages, sampleAgent } = require('./helper_files/helperFunctions.mjs')

process.env.AWS_DEFAULT_REGION='us-east-1'

// Variables we'll use throughout the labs
let llm
let tools
let agent
let main
let myNewToolSchema
let myNewToolDefinition
let permeabilityCalculatorSchema
let permeabilityCalculator
let agentFinalState
let toolMessageResponse
let invokeAndRenderMessages
```

### Example Generative AI Chat Experience

Before diving into the labs, let's see an example of what we'll build - an AI assistant that can help with practical petroleum engineering tasks:

```javascript
invokeAgentAndRenderMessages(
    `My name is Edwin Drake and I need to order a new spring pole drilling tool from Jeff in Pittsburgh.
    I am drilling near Titusville, Pennsylvania and need to reach Oil Creek's underground reservoirs.
    Based on local coal mining operations, I estimate needing 69 sections of cast iron pipe at 6' each.
    Tell Jeff how deeply we plan to drill.
    `,
    sampleAgent
)
```

This example demonstrates how our AI agent can:
1. Understand historical drilling requirements (spring pole drilling equipment)
2. Perform calculations (total depth calculation)
3. Generate professional communications (equipment request to supplier)
4. Handle interactive UI elements (send message button)

The example is based on Edwin Drake's historic first commercial oil well in 1859, which reached oil at approximately 69.5 feet using a spring pole drilling method adapted from salt well drilling techniques.

## Lab 1: Invoke Foundation Models from Amazon Bedrock in LangChain

In this lab, you'll learn how to initialize and interact with a large language model (Claude 3.5 Haiku) through Amazon Bedrock. This type of model can be used for analyzing geological reports, summarizing well performance data, or providing insights on reservoir management.

```javascript
// Initialize Bedrock LLM
llm = new ChatBedrockConverse({
    model: "us.anthropic.claude-3-5-haiku-20241022-v1:0"
});

(async () => {
    const llmResponse = await displayAnimatedIndicator(
        llm.invoke("How can generative AI revolutionize the energy sector?")
    )
    console.log('llm Response:\n', llmResponse.content)
})()
```

**Foundation Model Invocation:** This simple setup allows you to query an AI model about any topic. The code initializes the Claude 3.5 Haiku model and sends a prompt to it, then displays the response with a waiting indicator.

Foundation models work by predicting the most likely next tokens in a sequence, which makes them excellent at natural language tasks but unreliable for precise mathematical calculations. Even when they understand the mathematical concepts and formulas, their prediction-based nature means they often produce different (and incorrect) numerical results each time they attempt a calculation. This is particularly problematic for petroleum engineering calculations where accuracy and consistency are crucial. Try running this code block multiple times to see how the Net Present Value calculation varies with each attempt:

```javascript
(async () => {
    const llmResponse = await displayAnimatedIndicator(
        llm.invoke(`
        Calculate the net present value of a well with these charastics:
        - Current produciton of 1000 BOPD
        - 20% annual oil production decline rate
        - 15% annual PV discount rate
        - $50/BBL oil price
        - $150,000k / yr operating cost
    
        Respond with the result of the calculation
    
        Accronyms:
        - BOPD: Barrels of oil per day
    
        Formulas:
        - Economic Limit Production Rate (BOPD) = (Annual Operating Cost) / 365 / (Oil Price / BBL)
        - Economic Life Calculation (years) = log(<Economic Limit Production Rate>/<Current Production Rate>) / log(1 - <Annual Decline Rate>)
        `)
    )
    console.log('llm Response:\n', llmResponse.content)
})()
```

The model's response shows its limitations with complex calculations:
- It correctly identifies the steps needed (economic limit, economic life, NPV calculation)
- However, it estimates the NPV at around $124.5 million, which is significantly off
- The actual NPV, when calculated precisely using the calculator tool (as we'll see in Lab 2), is approximately $51.7 million
- This demonstrates why petroleum engineers need specialized calculation tools for accurate analysis

This is a key reason why we'll implement a calculator tool in the next lab - to ensure precise calculations for critical engineering and financial decisions. While foundation models excel at understanding context and generating explanations, they should not be relied upon for exact numerical calculations in professional engineering applications.

## Lab 2: Create Your First Agent

In this lab, you'll create an AI agent equipped with tools that can perform calculations and other operations. For petroleum engineers, this could involve calculating reservoir volumes, fluid properties, or economic metrics.

**Energy Sector Application:** With a Calculator tool, your agent can perform basic arithmetic operations that could be useful in energy sector calculations. Note that this is a simple calculator that can only handle basic math operations (addition, subtraction, multiplication, division, etc.) - not complex petroleum engineering formulas directly.

For example, you could use it for:
- Simple components of reserve calculations
- Basic arithmetic in production analysis
- Elements of economic calculations
- Individual steps in engineering equations

Now you can test the agent with a calculation query:

```javascript
// Define available tools
tools = [
    new Calculator
];

// Create the React agent
agent = createReactAgent({
    llm,
    tools
});

invokeAgentAndRenderMessages(
    `Calculate the net present value of a well with these charastics:
    - Current produciton of 1000 BOPD
    - 20% annual oil production decline rate
    - 15% annual PV discount rate
    - $50/BBL oil price
    - $150,000k / yr operating cost

    Respond with the result of the calculation

    Accronyms:
    - BOPD: Barrels of oil per day

    Formulas:
    - Economic Limit Production Rate (BOPD) = (Annual Operating Cost) / 365 / (Oil Price / BBL)
    - Economic Life Calculation (years) = log(<Economic Limit Production Rate>/<Current Production Rate>) / log(1 - <Annual Decline Rate>)
    
    When using the calculator tool:
    - Use ^ for exponentials
    - There is no 'sum' function, intead use x+y+z to sum numbers.
    - Sum the discounted cash flows for multiple years in the same tool call
    `,
    agent
)
```

This will produce an interactive result showing:
1. Your question
2. The AI's decisions to use the calculator at multiple steps
3. The calculator's results for economic limit, economic life, and NPV
4. The AI's final response with a formatted answer (~$58.85 million)

**Energy Sector Application:** This calculation capability is especially valuable for petroleum engineering workflows that require complex calculations. The agent breaks down the NPV calculation into logical steps, calculating:
1. The economic limit production rate (8.22 BOPD)
2. The economic life of the well (21.52 years)
3. The net present value by calculating and summing the discounted cash flows for each year

This demonstrates how AI agents can follow industry-standard workflows and calculation methods in petroleum economics, providing a more accurate result than the foundation model alone (~$58.85 million vs. the approximate $2.5 million from the raw LLM response).

## Lab 3: Build Custom Tools

In this lab, we'll create a custom tool for calculating reservoir permeability using the Kozeny-Carman equation. This demonstrates how to integrate domain-specific engineering calculations into your AI agent.

```javascript
permeabilityCalculatorSchema = z.object({
    porosity: z.number().describe("Porosity (fraction)"),
    grainSize: z.number().describe("Average grain size (mm)"),
    rockType: z.enum(["sandstone", "limestone", "dolomite"]).describe("Type of reservoir rock")
});

permeabilityCalculator = tool(
    async ({ porosity, grainSize, rockType }) => {
        // Simplified Kozeny-Carman equation
        let constant = 0;
        switch (rockType) {
            case "sandstone":
                constant = 0.5;
                break;
            case "limestone":
                constant = 0.3;
                break;
            case "dolomite":
                constant = 0.4;
                break;
        }
        
        // Convert grain size from mm to cm
        const grainSizeCm = grainSize / 10;
        
        // Calculate permeability in Darcy
        const permeabilityD = constant * Math.pow(grainSizeCm, 2) * Math.pow(porosity, 3) / Math.pow(1 - porosity, 2);
        
        // Convert to millidarcy
        const permeabilityMD = permeabilityD * 1000;
        
        return {
            permeability: permeabilityMD,
            units: "md",
            porosity: porosity,
            assessment: permeabilityMD > 100 ? "Good reservoir quality" : "Poor reservoir quality"
        }
    },
    {
        name: "permeability_calculator",
        description: "Calculate estimated permeability based on rock properties",
        schema: permeabilityCalculatorSchema,
    }
);

// Define available tools
tools = [
    permeabilityCalculator
];

// Create the React agent
agent = createReactAgent({
    llm,
    tools,
});

invokeAgentAndRenderMessages(`What is the permeability of 20% porosity sandstone with 1mm average grain size?`, agent)
```

**Petrophysical Applications:** This Permeability Calculator tool showcases how to implement petroleum engineering formulas into custom tools. Using the Kozeny-Carman equation, it calculates reservoir permeability - a critical property that indicates how easily fluids flow through rock. The tool:

1. Takes parameters a petroleum engineer would know (porosity, grain size, rock type)
2. Applies the appropriate rock-specific constants based on lithology
3. Returns meaningful results with unit conversions (millidarcy) 
4. Provides a qualitative assessment of reservoir quality

For the 20% porosity sandstone with 1mm grain size, the tool calculates a permeability of 83.33 md, which it assesses as "Poor reservoir quality." This type of specialized tool enables petroleum engineers to quickly evaluate formation properties without needing to manually perform complex calculations.

## Lab 4: Custom Tool Response UI Elements

In this lab, we'll create custom UI elements for displaying tool responses in a way that's intuitive for petroleum engineers. We'll focus on rendering the permeability calculator results with a professional, easy-to-read interface.

```javascript
invokeAndRenderMessages = async (userInputText) => $$.html(
    (async () => {
        const result = await displayAnimatedIndicator(
            agent.invoke(
                { messages: [new HumanMessage(userInputText)] }
            )
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
                                case 'permeabilityCalculator':
                                    return renderPermeabilityCalculatorMessage(message);
                                default:
                                    return (`<div><h4>Message from ${message.name}:</h4><pre>${JSON.stringify(message, null, 2)}</pre></div>`);
                            }
                    }
                }).join('\n')}
            </div>
        `;
        
        return conversationHtml;
    })()
);

// Example usage with permeability calculation
invokeAndRenderMessages(`What is the permeability of 20% porosity sandstone with 1mm average grain size?`);
```

The permeability calculator tool's response is rendered using a custom UI component that displays:
1. A clear "Permeability Analysis Results" header
2. Four key metrics in separate cards:
   - Permeability value in millidarcies (mD)
   - Rock Type (sandstone, limestone, etc.)
   - Porosity percentage
   - Reservoir quality assessment
3. Professional styling with:
   - Clean grid layout
   - Clear typography
   - Visual hierarchy
   - Color-coded assessment
   - Proper units display

This custom rendering makes the tool's output much more readable and professional compared to raw JSON output, helping petroleum engineers quickly interpret the results. The layout is designed to match industry software conventions, making it feel familiar and intuitive to users.

## Lab 5: Store Conversation Messages Using AWS Amplify

In this lab, we'll learn how to persist conversation history using AWS Amplify and DynamoDB. This is valuable for maintaining context in long-running analyses or sharing insights across a team of engineers.

Key benefits for petroleum engineers:
1. Track decision-making processes for well operations
2. Share analysis results with team members
3. Maintain audit trails for regulatory compliance
4. Build knowledge bases from past interactions
5. Enable asynchronous collaboration on complex projects

The implementation involves:
1. Setting up a DynamoDB table through AWS Amplify
2. Creating a schema for conversation messages
3. Implementing functions to save and retrieve messages
4. Integrating with the AI agent's workflow

Example schema for storing petroleum engineering conversations:

```javascript
const ConversationMessage = `
  type ConversationMessage @model @auth(rules: [{allow: public}]) {
    id: ID!
    timestamp: AWSDateTime!
    role: String!  # "human", "ai", or "tool"
    content: String!
    metadata: AWSJSON  # For storing additional context
    
    # Petroleum engineering specific fields
    wellId: String
    fieldName: String
    depth: Float
    formation: String
    analysisType: String
  }
`;
```

This schema allows us to:
1. Track conversations by well and field
2. Associate messages with specific depths and formations
3. Categorize different types of analysis
4. Store rich metadata about calculations and decisions

The actual implementation details will depend on your specific AWS setup and requirements. Consult the AWS Amplify documentation for the latest best practices in data modeling and authentication.

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

## Use the animated indicator
invokeWithAnimatedIndicator("What are the environmental implications of hydraulic fracturing?");

// Use the animated indicator
invokeWithAnimatedIndicator("How do reservoir engineers estimate the recovery factor for a carbonate reservoir?");

// Use the animated indicator
invokeWithAnimatedIndicator("What's the relationship between permeability and production rate in a hydraulically fractured shale reservoir?");
