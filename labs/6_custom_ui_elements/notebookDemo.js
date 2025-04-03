// Example of how to use the renderAgentConversation function in a notebook

// First, import your agent and the render function
const { renderAgentConversation } = require('./renderNotebook.js');

// Example usage in a notebook cell:
/*
$$.html(
  renderAgentConversation(agent, `
    I need to buy a new downhole pump from Jeff for a Fruitland Coal well in New Mexico.
    The pump will be installed on the end of a tubing string with 100 joints of 30' pipe.
    Tell Jeff how deeply the pump will be installed.
  `)
)
*/

// For a more complete example with an actual agent:
/*
const { HumanMessage } = require('@langchain/core/messages');
const { ChatOpenAI } = require('@langchain/openai');
const { createGraph, StateGraph } = require('langchain/graphs');
const { CalculatorTool } = require('@langchain/community/tools');

// Set up the agent
const llm = new ChatOpenAI({
  model: "gpt-3.5-turbo",
  temperature: 0
});

// Add the calculator tool
const tools = [new CalculatorTool()];

// Create a simple agent graph
const graph = createGraph();
const builder = new StateGraph({ channels: { input: "input", output: "output" } });

// ... set up your agent workflow ...

// The compiled agent
const agent = builder.compile();

// Now render a conversation with the agent
$$.html(
  renderAgentConversation(agent, "Calculate 25 * 48")
)
*/ 