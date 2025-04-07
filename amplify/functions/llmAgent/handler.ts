import { stringify } from "yaml";

import { getConfiguredAmplifyClient } from '../../../utils/amplifyUtils';

import { ChatBedrockConverse } from "@langchain/aws";
import { HumanMessage, ToolMessage, BaseMessage, SystemMessage, AIMessageChunk } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { Calculator } from "@langchain/community/tools/calculator";

import { publishResponseStreamChunk } from "../graphql/mutations";

import { setChatSessionId } from "../tools/toolUtils";
import { s3FileManagementTools } from "../tools/s3ToolBox";
import { userInputTool } from "../tools/userInputTool";
import { pysparkTool } from "../tools/athenaPySparkTool";
import { plotDataTool } from "../tools/plotDataTool";
import { Schema } from '../../data/resource';

import { getLangChainChatMessagesStartingWithHumanMessage, getLangChainMessageTextContent, publishMessage, stringifyLimitStringLength } from '../../../utils/langChainUtils';
import { EventEmitter } from "events";

// Increase the default max listeners to prevent warnings
EventEmitter.defaultMaxListeners = 20;

export const handler: Schema["invokeAgent"]["functionHandler"] = async (event, context) => {
    console.log('event:\n', JSON.stringify(event, null, 2))

    try {
        if (event.arguments.chatSessionId === null) throw new Error("chatSessionId is required");
        if (!event.identity) throw new Error("Event does not contain identity");
        if (!('sub' in event.identity)) throw new Error("Event does not contain user");

        // Set the chat session ID for use by the S3 tools
        setChatSessionId(event.arguments.chatSessionId);

        // Define the S3 prefix for this chat session (needed for env vars)
        const bucketName = process.env.STORAGE_BUCKET_NAME;
        if (!bucketName) throw new Error("STORAGE_BUCKET_NAME is not set");

        const amplifyClient = getConfiguredAmplifyClient();

        // This function includes validation to prevent "The text field in the ContentBlock object is blank" errors
        // by ensuring no message content is empty when sent to Bedrock
        const chatSessionMessages = await getLangChainChatMessagesStartingWithHumanMessage(event.arguments.chatSessionId)

        const agentModel = new ChatBedrockConverse({
            model: process.env.AGENT_MODEL_ID,
            // temperature: 0
        });

        const agentTools = [
            new Calculator(),
            userInputTool,
            // plotDataTool,
            pysparkTool,
            ...s3FileManagementTools
        ]

        const agent = createReactAgent({
            llm: agentModel,
            tools: agentTools,
        });

        
        let systemMessageContent = `
You are a helpful llm agent showing a demo workflow. 
If you don't have the access to the information you need, generate the required information and save it in the data directory.
Use markdown formatting for your responses (like **bold**, *italic*, ## headings, etc.), but DO NOT wrap your response in markdown code blocks.
Today's date is ${new Date().toLocaleDateString()}.

Create intermediate files to store your planned actions, thoughts and work. Use the writeFile tool to create these files. 
Store them in the 'intermediateFiles' directory. After you complete a planned step, record the results in the file.

When generating a csv file, use the pysparkTool to generate the file and not the writeFile tool.

When creating plots:
- ALWAYS check for and use existing files and data tables before generating new ones
- If a table has already been generated, reuse that data instead of regenerating it
- Only generate new data tables if no existing relevant data is available
- When asked to plot data from a table, look for the specific table mentioned and use that data

When creating reports:
- Use the writeFile tool to create the first draft of the report file
- Use html formatting for the report by default
- Put reports in the 'reports' directory

When using the file management tools:
- The listFiles tool returns separate 'directories' and 'files' fields to clearly distinguish between them
- To access a directory, include the trailing slash in the path or use the directory name
- To read a file, use the readFile tool with the complete path including the filename
- Global files are shared across sessions and are read-only
- When saving reports to file, use the writeFile tool with html formatting by default

When using the PySpark tool:
- Use the pysparkTool to execute big data processing tasks with Apache Spark
- The Spark session ('spark') is already initialized - don't try to create a new one
- You can directly create DataFrames, run transformations, and perform analysis
- The execution output is returned directly in the response - no need to fetch it separately
- Use this for data processing, ETL jobs, and analytics at scale
- You can save important results to CSV files using writeFile if needed

When using the textToTableTool:
- IMPORTANT: For simple file searches, just use the identifying text (e.g., "15_9_19_A") as the pattern
- IMPORTANT: Don't use this file on structured data like csv files. Use the pysparkTool instead.
- The tool will automatically add wildcards and search broadly if needed
- For global files, you can use "global/pattern" OR just "pattern" - the tool handles both formats
- Examples of good patterns:
  * "15_9_19_A" (finds any file containing this text)
  * "reports" (finds any file containing "reports")
  * ".*\\.txt$" (finds all text files)
  * "data/.*\\.yaml$" (finds YAML files in the data directory)
- Define the table columns with a clear description of what to extract
- Results are automatically sorted by date if available (chronological order)
- Use dataToInclude/dataToExclude to prioritize certain types of information

        `//.replace(/^\s+/gm, '') //This trims the whitespace from the beginning of each line

        // If the chatSessionMessages ends with a human message, remove it.
        if (chatSessionMessages.length > 0 &&
            chatSessionMessages[chatSessionMessages.length - 1] instanceof HumanMessage) {
            chatSessionMessages.pop();
        }

        const input = {
            messages: [
                new SystemMessage({
                    content: systemMessageContent
                }),
                ...chatSessionMessages,
                new HumanMessage({
                    content: event.arguments.userInput || " " // Ensure user input is never empty
                })
            ].filter((message): message is BaseMessage => message !== undefined)
        }

        console.log('input:\n', stringifyLimitStringLength(input))

        const agentEventStream = agent.streamEvents(
            input,
            {
                version: "v2",
            }
        );

        let chunkIndex = 0
        for await (const streamEvent of agentEventStream) {
            switch (streamEvent.event) {
                case "on_chat_model_stream":
                    const tokenStreamChunk = streamEvent.data.chunk as AIMessageChunk
                    if (!tokenStreamChunk.content) continue
                    const chunkText = getLangChainMessageTextContent(tokenStreamChunk)
                    process.stdout.write(chunkText || "")
                    const publishChunkResponse = await amplifyClient.graphql({
                        query: publishResponseStreamChunk,
                        variables: {
                            chunkText: chunkText || "",
                            index: chunkIndex++,
                            chatSessionId: event.arguments.chatSessionId
                        }
                    })
                    // console.log('published chunk response:\n', JSON.stringify(publishChunkResponse, null, 2))
                    if (publishChunkResponse.errors) console.log('Error publishing response chunk:\n', publishChunkResponse.errors)
                    break;
                case "on_chain_end":
                    if (streamEvent.data.output?.messages) {
                        // console.log('received on chain end:\n', stringifyLimitStringLength(streamEvent.data.output.messages))
                        switch (streamEvent.name) {
                            case "tools":
                            case "agent":
                                chunkIndex = 0 //reset the stream chunk index
                                const streamChunk = streamEvent.data.output.messages[0] as ToolMessage | AIMessageChunk
                                console.log('received tool or agent message:\n', stringifyLimitStringLength(streamChunk))
                                console.log(streamEvent.name, streamChunk.content, typeof streamChunk.content === 'string')
                                if (streamEvent.name === 'tools' && typeof streamChunk.content === 'string' && streamChunk.content.toLowerCase().includes("error")) {
                                    console.log('Generating error message for tool call')
                                    const toolCallMessage = streamEvent.data.input.messages[streamEvent.data.input.messages.length - 1] as AIMessageChunk
                                    const toolCallArgs = toolCallMessage.tool_calls?.[0].args
                                    const toolName = streamChunk.lc_kwargs.name
                                    const selectedToolSchema = agentTools.find(tool => tool.name === toolName)?.schema
                                    const zodError = selectedToolSchema?.safeParse(toolCallArgs)
                                    console.log({toolCallMessage, toolCallArgs, toolName, selectedToolSchema, zodError, formattedZodError: zodError?.error?.format()})
                                    
                                    streamChunk.content += '\n\n' + stringify(zodError?.error?.format())
                                }

                                // Check if this is a table result from textToTableTool and format it properly
                                if (streamChunk instanceof ToolMessage && streamChunk.name === 'textToTableTool') {
                                    try {
                                        const toolResult = JSON.parse(streamChunk.content as string);
                                        if (toolResult.messageContentType === 'tool_table') {
                                            // Attach table data to the message using additional_kwargs which is supported by LangChain
                                            (streamChunk as any).additional_kwargs = {
                                                tableData: toolResult.data,
                                                tableColumns: toolResult.columns,
                                                matchedFileCount: toolResult.matchedFileCount,
                                                messageContentType: 'tool_table'
                                            };
                                        }
                                    } catch (error) {
                                        console.error("Error processing textToTableTool result:", error);
                                    }
                                }

                                // Check if this is a PySpark result and format it for better display
                                if (streamChunk instanceof ToolMessage && streamChunk.name === 'pysparkTool') {
                                    try {
                                        const pysparkResult = JSON.parse(streamChunk.content as string);
                                        if (pysparkResult.status === "COMPLETED" && pysparkResult.output?.content) {
                                            // Attach PySpark output data for special rendering
                                            (streamChunk as any).additional_kwargs = {
                                                pysparkOutput: pysparkResult.output.content,
                                                pysparkError: pysparkResult.output.stderr,
                                                messageContentType: 'pyspark_result'
                                            };
                                        }
                                    } catch (error) {
                                        console.error("Error processing pysparkTool result:", error);
                                    }
                                }

                                await publishMessage({
                                    chatSessionId: event.arguments.chatSessionId,
                                    owner: event.identity.sub,
                                    message: streamChunk
                                })
                                break;
                            default:
                                break;
                        }
                    }
                    break;
                // case "on_tool_end":
                // case "on_tool_error":
                // case "on_chat_model_end":
                //     chunkIndex = 0 //reset the stream chunk index
                //     const streamChunk = streamEvent.data.output as ToolMessage | AIMessageChunk
                //     console.log('received on chat model end:\n', stringifyLimitStringLength(streamChunk))

                //     // Check if this is a table result from textToTableTool and format it properly
                //     if (streamChunk instanceof ToolMessage && streamChunk.name === 'textToTableTool') {
                //         try {
                //             const toolResult = JSON.parse(streamChunk.content as string);
                //             if (toolResult.messageContentType === 'tool_table') {
                //                 // Attach table data to the message using additional_kwargs which is supported by LangChain
                //                 (streamChunk as any).additional_kwargs = {
                //                     tableData: toolResult.data,
                //                     tableColumns: toolResult.columns,
                //                     matchedFileCount: toolResult.matchedFileCount,
                //                     messageContentType: 'tool_table'
                //                 };
                //             }
                //         } catch (error) {
                //             console.error("Error processing textToTableTool result:", error);
                //         }
                //     }

                //     await publishMessage({
                //         chatSessionId: event.arguments.chatSessionId,
                //         owner: event.identity.sub,
                //         message: streamChunk
                //     })
                //     break
                // default:
                //     console.log('received stream event:\n', stringifyLimitStringLength(streamEvent))
                //     break
            }
        }

    } catch (error) {
        console.error("Error responding to user:", JSON.stringify(error, null, 2));
        if (error instanceof Error) {
            throw new Error(`Error responding to user:\n${error.message}`);
        } else {
            throw new Error("Error responding to user: \nUnknown error");
        }
    }
}