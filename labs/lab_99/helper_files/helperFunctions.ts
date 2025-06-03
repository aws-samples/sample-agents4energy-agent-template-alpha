// import * as tslab from "tslab"

// const { ChatBedrockConverse } = require("@langchain/aws");
// const { HumanMessage } = require("@langchain/core/messages");
// const { createReactAgent } = require("@langchain/langgraph/prebuilt");
// const { Calculator } = require("@langchain/community/tools/calculator");
// const { userInputTool } = require("@amplify/functions/tools/userInputTool.ts");

// const { 
//     renderHumanMessage, 
//     renderAIMessage, 
//     renderUserInputToolMessage, 
//     renderCalculatorToolMessage 
// } = require('./renderMessages.mjs');

// process.env.AWS_DEFAULT_REGION='us-east-1'

// export const test = () => {
//     tslab.display.html('Hello <span style="color:#007ACC;font-size:x-large"><b>Type</b>Script</span>!')
// }

// const llm = new ChatBedrockConverse({
//     model: "us.anthropic.claude-3-5-haiku-20241022-v1:0"
// });

// // Define available tools
// const tools = [
//     new Calculator,
//     userInputTool
// ];

// // Create the React agent
// export const sampleAgent = createReactAgent({
//     llm,
//     tools,
// });

// export async function displayAnimatedIndicator(promiseToMonitor) {
//     // Track start time for the request
//     const startTime = Date.now();
//     // let intervalId = null;
    
//     // Initial waiting message
//     process.stdout.write('⏳ Processing request... ');
    
//     // Print a dot every second to show progress without new lines
//     const intervalId = setInterval(() => {
//       process.stdout.write('.');
//     }, 1000);
    
//     try {
//       // Wait for the promise to resolve or reject
//       const result = await promiseToMonitor;
      
//       // Clean up the interval
//       if (intervalId) {
//         clearInterval(intervalId);
//       }
      
//       // Calculate total time
//       const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
      
//       // Show completion message with elapsed time (on a new line)
//       process.stdout.write(`\n✅ Response received successfully (took ${totalSeconds}s)\n`);
      
//       // Return the result directly
//       return result;
//     } catch (error) {
//       // Clean up the interval
//       if (intervalId) {
//         clearInterval(intervalId);
//       }
      
//       // Calculate total time until error
//       const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
      
//       // Show error message (on a new line)
//       process.stdout.write(`\n❌ Error after ${totalSeconds}s: ${error.message}\n`);
      
//       // Re-throw the error to be handled by the caller
//       throw error;
//     }
//   }
  
// // Example usage:
// /*
// // Initialize Bedrock LLM
// llm = new ChatBedrockConverse({
//     model: "us.anthropic.claude-3-5-haiku-20241022-v1:0"
// });

// (async () => {
//     try {
//         const llmResponse = await displayAnimatedIndicator(
//             llm.invoke("How can generative AI revolutionize the energy sector?")
//         );
//         console.log('LLM Response:\n', llmResponse.content);
//     } catch (error) {
//         console.log('Error occurred:', error);
//     }
// })();
// */

// //This function will invoke the agent and render the resulting messages
// export const invokeAgentAndRenderMessages = async (userInputText, agent) => (
//     (async () => {
        
//         const result = await displayAnimatedIndicator(
//             agent.invoke(
//                 { messages: [new HumanMessage(userInputText)] },
//                 { recursionLimit: 100 }
//             )
//         );
    
//         // Render all messages in the conversation
//         const conversationHtml = `
//             <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto;">
//                 ${result.messages.map(message => {
//                     switch(message.constructor.name) {
//                         case 'HumanMessage':
//                             return renderHumanMessage(message);
//                         case 'AIMessage':
//                             return renderAIMessage(message);
//                         case 'ToolMessage':
//                             switch (message.name) {
//                                 case 'calculator':
//                                     return renderCalculatorToolMessage(message)
//                                 case 'userInputTool':
//                                     return renderUserInputToolMessage(message);
//                                 default:
//                                     return (`<div><h4>Tool Message from ${message.name}:</h4><pre>${message.content}</pre></div>`)
//                             }
                            
//                         default:
//                             return '';
//                     }
//                 }).join('\n')}
//             </div>
//         `;
        
//         tslab.display.html(conversationHtml)
//     })()
// )