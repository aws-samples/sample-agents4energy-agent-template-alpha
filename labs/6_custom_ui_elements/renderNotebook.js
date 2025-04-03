// Import the render functions
const { renderConversation } = require('./renderMessages.cjs');

/**
 * Renders a conversation with an agent as HTML in a notebook environment
 * 
 * @param {Object} agent - The LangGraph agent to invoke
 * @param {string} input - The user input to the agent
 * @returns {Promise<Element>} - HTML element with rendered conversation
 * 
 * Usage example:
 * 
 * $$.html(
 *   renderAgentConversation(myAgent, "Calculate 25 * 48")
 * )
 */
async function renderAgentConversation(agent, input) {
  // Create a human message from the input
  const HumanMessage = (await import('@langchain/core/messages')).HumanMessage;
  
  // Invoke the agent
  const result = await agent.invoke({
    messages: [new HumanMessage(input)]
  });
  
  // Return the rendered conversation HTML
  return renderConversation(result);
}

module.exports = { renderAgentConversation }; 