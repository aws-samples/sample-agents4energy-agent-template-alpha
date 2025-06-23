// import { expect } from 'chai';
// import { handler } from '../../amplify/functions/reActAgent/handler';
// import { setAmplifyEnvVars } from '../../utils/amplifyUtils';
// import { loadOutputs } from '../utils';
// import * as amplifyUtils from '../../utils/amplifyUtils';
// import * as langChainUtils from '../../utils/langChainUtils';
// import { AIMessageChunk } from '@langchain/core/messages';
// import { EventEmitter } from 'events';

// // Save original functions to restore later
// const originalGetConfiguredAmplifyClient = amplifyUtils.getConfiguredAmplifyClient;
// const originalGetLangChainChatMessages = langChainUtils.getLangChainChatMessagesStartingWithHumanMessage;
// const originalPublishMessage = langChainUtils.publishMessage;
// const originalStringifyLimitStringLength = langChainUtils.stringifyLimitStringLength;

// // Create mock functions
// const mockAmplifyClient = {
//   graphql: async () => ({ data: {} })
// };

// // Mock implementation of createReactAgent
// const mockStreamEvents = async function* () {
//   yield {
//     event: 'on_chat_model_stream',
//     data: {
//       chunk: new AIMessageChunk({
//         content: 'Test response'
//       })
//     }
//   };
//   yield {
//     event: 'on_chain_end',
//     name: 'agent',
//     data: {
//       output: {
//         messages: [
//           {
//             content: 'Final response',
//             lc_kwargs: {}
//           }
//         ]
//       }
//     }
//   };
// };

// describe('ReActAgent Handler Tests', function () {
//   // Set a longer timeout for tests
//   this.timeout(10000);

//   before(async function () {
//     // Set up environment variables
//     const envResult = await setAmplifyEnvVars();
//     if (!envResult.success) {
//       console.warn('Failed to set Amplify environment variables:', envResult.error);
//     }

//     const outputs = loadOutputs();
    
//     // Set required environment variables
//     process.env.AGENT_MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0';
//     process.env.STORAGE_BUCKET_NAME = outputs?.storage?.bucket_name || 'test-bucket';
//     process.env.A4E_MCP_SERVER_URL = 'https://example.com/mcp';
//     process.env.AWS_REGION = 'us-east-1';
    
//     // Setup mocks
//     // @ts-ignore - Override the functions for testing
//     amplifyUtils.getConfiguredAmplifyClient = () => mockAmplifyClient;
//     // @ts-ignore
//     langChainUtils.getLangChainChatMessagesStartingWithHumanMessage = async () => [];
//     // @ts-ignore
//     langChainUtils.publishMessage = async () => ({});
//     // @ts-ignore
//     langChainUtils.stringifyLimitStringLength = (obj: any) => JSON.stringify(obj);
    
//     // Mock the EventEmitter to prevent warnings
//     EventEmitter.defaultMaxListeners = 100;
    
//     // Mock the createReactAgent function by monkey patching the module
//     // This is a bit hacky but works for testing purposes
//     const langgraph = require('@langchain/langgraph/prebuilt');
//     langgraph.createReactAgent = () => ({
//       streamEvents: mockStreamEvents
//     });
//   });

//   after(function() {
//     // Restore original functions
//     // @ts-ignore
//     amplifyUtils.getConfiguredAmplifyClient = originalGetConfiguredAmplifyClient;
//     // @ts-ignore
//     langChainUtils.getLangChainChatMessagesStartingWithHumanMessage = originalGetLangChainChatMessages;
//     // @ts-ignore
//     langChainUtils.publishMessage = originalPublishMessage;
//     // @ts-ignore
//     langChainUtils.stringifyLimitStringLength = originalStringifyLimitStringLength;
//   });

//   it('should successfully invoke the handler with valid input', async function () {
//     // Create test event
//     const testEvent = {
//       arguments: {
//         chatSessionId: 'test-session-123',
//         userId: 'test-user-123',
//         foundationModelId: 'anthropic.claude-3-haiku-20240307-v1:0'
//       },
//       identity: {
//         sub: 'test-user-123'
//       }
//     };

//     // Create a spy to track if graphql was called
//     let graphqlCalled = false;
//     const originalGraphql = mockAmplifyClient.graphql;
//     mockAmplifyClient.graphql = async () => {
//       graphqlCalled = true;
//       return { data: {} };
//     };

//     try {
//       // Call the handler with a mock context
//       const mockContext = {
//         awsRequestId: 'test-request-id',
//         functionName: 'test-function'
//       };
      
//       const result = await handler(testEvent, {}, mockContext);
      
//       // Since the handler doesn't return a value (it works via side effects),
//       // we just verify it completes without throwing an error
//       expect(result).to.be.undefined;
      
//       // Verify that graphql was called at least once (for publishing messages)
//       expect(graphqlCalled).to.be.true;
//     } catch (error) {
//       console.error('Error in test:', error);
//       throw error;
//     } finally {
//       // Restore the original graphql function
//       mockAmplifyClient.graphql = originalGraphql;
//     }
//   });

//   it('should throw an error when chatSessionId is null', async function () {
//     // Create test event with null chatSessionId
//     const testEvent = {
//       arguments: {
//         chatSessionId: null,
//         userId: 'test-user-123',
//         foundationModelId: 'anthropic.claude-3-haiku-20240307-v1:0'
//       },
//       identity: {
//         sub: 'test-user-123'
//       }
//     };

//     // Call the handler and expect it to throw an error
//     try {
//       const mockContext = {
//         awsRequestId: 'test-request-id',
//         functionName: 'test-function'
//       };
      
//       await handler(testEvent, mockContext);
//       // If we get here, the test should fail
//       expect(true).to.equal(false, 'Expected an error to be thrown');
//     } catch (error: any) {
//       expect(error).to.be.an('Error');
//       expect(error.message).to.equal('chatSessionId is required');
//     }
//   });

//   it('should use userId from event.identity.sub when not provided in arguments', async function () {
//     // Create test event without userId in arguments
//     const testEvent = {
//       arguments: {
//         chatSessionId: 'test-session-123',
//         foundationModelId: 'anthropic.claude-3-haiku-20240307-v1:0'
//       },
//       identity: {
//         sub: 'test-user-from-identity'
//       }
//     };

//     // Create a spy to track if graphql was called
//     let graphqlCalled = false;
//     const originalGraphql = mockAmplifyClient.graphql;
//     mockAmplifyClient.graphql = async () => {
//       graphqlCalled = true;
//       return { data: {} };
//     };

//     try {
//       const mockContext = {
//         awsRequestId: 'test-request-id',
//         functionName: 'test-function'
//       };
      
//       await handler(testEvent, mockContext);
      
//       // Since the handler doesn't return a value, we just verify it completes without throwing an error
//       expect(graphqlCalled).to.be.true;
//     } catch (error) {
//       console.error('Error in test:', error);
//       throw error;
//     } finally {
//       // Restore the original graphql function
//       mockAmplifyClient.graphql = originalGraphql;
//     }
//   });

//   it('should throw an error when userId is not provided and not in identity', async function () {
//     // Create test event without userId and without identity
//     const testEvent = {
//       arguments: {
//         chatSessionId: 'test-session-123',
//         foundationModelId: 'anthropic.claude-3-haiku-20240307-v1:0'
//       }
//     };

//     // Call the handler and expect it to throw an error
//     try {
//       const mockContext = {
//         awsRequestId: 'test-request-id',
//         functionName: 'test-function'
//       };
      
//       await handler(testEvent, mockContext);
//       // If we get here, the test should fail
//       expect(true).to.equal(false, 'Expected an error to be thrown');
//     } catch (error: any) {
//       expect(error).to.be.an('Error');
//       expect(error.message).to.equal('userId is required');
//     }
//   });
// });
