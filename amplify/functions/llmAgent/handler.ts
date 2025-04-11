import { stringify } from "yaml";

import { getConfiguredAmplifyClient } from '../../../utils/amplifyUtils';

import { ChatBedrockConverse, BedrockEmbeddings } from "@langchain/aws";
import { HumanMessage, ToolMessage, BaseMessage, SystemMessage, AIMessageChunk } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { Calculator } from "@langchain/community/tools/calculator";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";

import { publishResponseStreamChunk } from "../graphql/mutations";

import { setChatSessionId, setOrigin } from "../tools/toolUtils";
import { s3FileManagementTools } from "../tools/s3ToolBox";
import { userInputTool } from "../tools/userInputTool";
import { pysparkTool } from "../tools/athenaPySparkTool";
import { webBrowserTool } from "../tools/webBrowserTool";
import { renderAssetTool } from "../tools/renderAssetTool";
import { Schema } from '../../data/resource';

import { getLangChainChatMessagesStartingWithHumanMessage, getLangChainMessageTextContent, publishMessage, stringifyLimitStringLength } from '../../../utils/langChainUtils';
import { EventEmitter } from "events";

// Increase the default max listeners to prevent warnings
EventEmitter.defaultMaxListeners = 10;

// Add cleanup helper
const cleanupEventEmitter = (emitter: EventEmitter) => {
    emitter.removeAllListeners();
};

export const handler: Schema["invokeAgent"]["functionHandler"] = async (event, context) => {
    console.log('event:\n', JSON.stringify(event, null, 2))

    // Track resources that need cleanup
    const resources: { cleanup: () => void }[] = [];

    try {
        if (event.arguments.chatSessionId === null) throw new Error("chatSessionId is required");
        if (!event.identity) throw new Error("Event does not contain identity");
        if (!('sub' in event.identity)) throw new Error("Event does not contain user");

        // Set the chat session ID for use by the S3 tools
        setChatSessionId(event.arguments.chatSessionId);

        // Set the origin from the request headers
        if (event.request?.headers?.origin) {
            setOrigin(event.request.headers.origin);
        }

        // Define the S3 prefix for this chat session (needed for env vars)
        const bucketName = process.env.STORAGE_BUCKET_NAME;
        if (!bucketName) throw new Error("STORAGE_BUCKET_NAME is not set");

        const amplifyClient = getConfiguredAmplifyClient();
        resources.push({ cleanup: () => { /* Amplify client cleanup if needed */ } });

        // This function includes validation to prevent "The text field in the ContentBlock object is blank" errors
        // by ensuring no message content is empty when sent to Bedrock
        const chatSessionMessages = await getLangChainChatMessagesStartingWithHumanMessage(event.arguments.chatSessionId)

        const agentModel = new ChatBedrockConverse({
            model: process.env.AGENT_MODEL_ID,
            // temperature: 0
        });
        resources.push({ cleanup: () => { 
            // Close any open connections
            if ((agentModel as any)._client) {
                (agentModel as any)._client.destroy();
            }
        }});

        const agentTools = [
            new Calculator(),
            new DuckDuckGoSearch({maxResults: 3}),
            userInputTool,
            pysparkTool,
            webBrowserTool,
            ...s3FileManagementTools,
            renderAssetTool
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

List the files in the global/notes directory for guidance on how to respond to the user.
Create intermediate files to store your planned actions, thoughts and work. Use the writeFile tool to create these files. 
Store them in the 'intermediateFiles' directory. After you complete a planned step, record the results in the file.

When generating a csv file, use the pysparkTool to generate the file and not the writeFile tool.

When creating plots:
- ALWAYS check for and use existing files and data tables before generating new ones
- If a table has already been generated, reuse that data instead of regenerating it
- Only generate new data tables if no existing relevant data is available
- When asked to plot data from a table, look for the specific table mentioned and use that data

When creating reports:
- Start the report with a summary which includes:
    - The recommended action.
    - Financial metrics describing any recommended actions.
- Include sections descirbing any analysis performed, and a list of the source documents or data tables used in the analysis.
- Use iframes to display plots and other files in the report.
- Use the writeFile tool to create the first draft of the report file
- Use html formatting for the report
- Put reports in the 'reports' directory
- IMPORTANT: When referencing files in HTML (links or iframes):
  * Always use paths relative to the workspace root (no ../ needed)
  * For plots: use "plots/filename.html"
  * For reports: use "reports/filename.html"
  * For data files: use "data/filename.csv"
  * Example iframe: <iframe src="plots/well_production_plot.html" width="100%" height="500px" frameborder="0"></iframe>
  * Example link: <a href="data/production_data.csv">Download Data</a>

When using the file management tools:
- The listFiles tool returns separate 'directories' and 'files' fields to clearly distinguish between them
- To access a directory, include the trailing slash in the path or use the directory name
- To read a file, use the readFile tool with the complete path including the filename
- Global files are shared across sessions and are read-only
- When saving reports to file, use the writeFile tool with html formatting

When using the PySpark tool:
- After fitting a curve, ALWAYS check the residuals to ensure the fit is good. 
- If the residuals are not normally distributed, try a different model or transformation.

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
- When reading well reports, always include a column for a description of the well event

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
                recursionLimit: 100 
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
            }
        }

    } catch (error) {
        console.error("Error responding to user:", JSON.stringify(error, null, 2));
        throw error;
    } finally {
        // Clean up all resources
        for (const resource of resources) {
            try {
                resource.cleanup();
            } catch (cleanupError) {
                console.error("Error during cleanup:", cleanupError);
            }
        }
        
        // Clean up any remaining event listeners
        if (process.eventNames().length > 0) {
            process.removeAllListeners();
        }
    }
}