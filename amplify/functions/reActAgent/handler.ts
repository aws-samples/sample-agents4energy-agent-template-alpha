import { stringify } from "yaml";

import { getConfiguredAmplifyClient } from '../../../utils/amplifyUtils';

import { ChatBedrockConverse } from "@langchain/aws";
import { HumanMessage, ToolMessage, BaseMessage, SystemMessage, AIMessageChunk, AIMessage } from "@langchain/core/messages";
import { Calculator } from "@langchain/community/tools/calculator";
import { Tool, StructuredToolInterface, ToolSchemaBase } from "@langchain/core/tools";

import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

import { publishResponseStreamChunk } from "../graphql/mutations";

import { setChatSessionId } from "../tools/toolUtils";
import { s3FileManagementTools } from "../tools/s3ToolBox";
import { userInputTool } from "../tools/userInputTool";
import { pysparkTool } from "../tools/athenaPySparkTool";
import { renderAssetTool } from "../tools/renderAssetTool";
import { createProjectTool } from "../tools/createProjectTool";
// import { permeabilityCalculator } from "../tools/customWorkshopTool";

import { Schema } from '../../data/resource';
import { listMcpServers } from '../graphql/queries'
import { getLangChainChatMessagesStartingWithHumanMessage, getLangChainMessageTextContent, publishMessage, stringifyLimitStringLength } from '../../../utils/langChainUtils';
import { EventEmitter } from "events";

import { startMcpBridgeServer } from "./awsSignedMcpBridge"

const USE_MCP = true;
const LOCAL_PROXY_PORT = 3020

let mcpTools: StructuredToolInterface<ToolSchemaBase, any, any>[] = []

// Increase the default max listeners to prevent warnings
EventEmitter.defaultMaxListeners = 10;

const graphQLFieldName = 'invokeReActAgent'

export const handler: Schema["invokeReActAgent"]["functionHandler"] = async (event, context) => {
    console.log('event:\n', JSON.stringify(event, null, 2))

    const foundationModelId = event.arguments.foundationModelId || process.env.AGENT_MODEL_ID
    if (!foundationModelId) throw new Error("AGENT_MODEL_ID is not set");

    const userId = event.arguments.userId || (event.identity && 'sub' in event.identity ? event.identity.sub : null);
    if (!userId) throw new Error("userId is required");

    try {
        if (event.arguments.chatSessionId === null) throw new Error("chatSessionId is required");

        // Set the chat session ID for use by the S3 tools
        setChatSessionId(event.arguments.chatSessionId);

        // Define the S3 prefix for this chat session (needed for env vars)
        const bucketName = process.env.STORAGE_BUCKET_NAME;
        if (!bucketName) throw new Error("STORAGE_BUCKET_NAME is not set");

        const amplifyClient = getConfiguredAmplifyClient();

        amplifyClient.graphql({
            query: publishResponseStreamChunk,
            variables: {
                chunkText: "Getting chat messages",
                index: 0,
                chatSessionId: event.arguments.chatSessionId
            }
        })

        // This function includes validation to prevent "The text field in the ContentBlock object is blank" errors
        // by ensuring no message content is empty when sent to Bedrock
        const chatSessionMessages = await getLangChainChatMessagesStartingWithHumanMessage(event.arguments.chatSessionId)

        if (chatSessionMessages.length === 0) {
            console.warn('No messages found in chat session')
            return
        }

        const agentModel = new ChatBedrockConverse({
            model: process.env.AGENT_MODEL_ID,
            // temperature: 0
        });

        if (mcpTools.length === 0 && USE_MCP) {
            await amplifyClient.graphql({
                query: publishResponseStreamChunk,
                variables: {
                    chunkText: "Listing MCP tools",
                    index: 0,
                    chatSessionId: event.arguments.chatSessionId
                }
            })

            // Start the MCP bridge server with default options
            startMcpBridgeServer({
                port: LOCAL_PROXY_PORT,
                service: 'lambda'
            })

            //Get the configured mcp servers from the MCP registry
            const {data: mcpServers} = await amplifyClient.graphql({
                query: listMcpServers
            })

            const mcpClient = new MultiServerMCPClient({
                useStandardContentBlocks: true,
                prefixToolNameWithServerName: false,
                // additionalToolNamePrefix: "",

                mcpServers: {
                    a4e: {
                        url: `http://localhost:${LOCAL_PROXY_PORT}/proxy`,
                        headers: {
                            'target-url': process.env.MCP_FUNCTION_URL!,
                            'accept': 'application/json',
                            'jsonrpc': '2.0',
                            'chat-session-id': event.arguments.chatSessionId
                        }
                    }
                }
            })

            mcpTools = await mcpClient.getTools()

            await amplifyClient.graphql({
                query: publishResponseStreamChunk,
                variables: {
                    chunkText: "Completed listing MCP tools",
                    index: 0,
                    chatSessionId: event.arguments.chatSessionId
                }
            })
        }

        console.log('Mcp Tools: ', mcpTools)

        const agentTools = USE_MCP ? mcpTools : [
            new Calculator(),
            ...s3FileManagementTools,
            userInputTool,
            createProjectTool,
            pysparkTool({
                additionalToolDescription: `
                            By default, plots will have a lograthmic y axis and a white backgrount.
                            `,
                additionalSetupScript: `
import plotly.io as pio
import plotly.graph_objects as go

# Create a custom layout
custom_layout = go.Layout(
    paper_bgcolor='white',
    plot_bgcolor='white',
    xaxis=dict(showgrid=False),
    yaxis=dict(
        showgrid=True,
        gridcolor='lightgray',
        # type='log'  # <-- Set y-axis to logarithmic
    )
)

# Create and register the template
custom_template = go.layout.Template(layout=custom_layout)
pio.templates["white_clean_log"] = custom_template
pio.templates.default = "white_clean_log"
                            `,
            }),
            renderAssetTool
        ]

        const agent = createReactAgent({
            llm: agentModel,
            tools: agentTools,
        });

        let systemMessageContent = `
You are a helpful llm agent showing a demo workflow. 
Use markdown formatting for your responses (like **bold**, *italic*, ## headings, etc.), but DO NOT wrap your response in markdown code blocks.
Today's date is ${new Date().toLocaleDateString()}.

List the files in the global/notes directory for guidance on how to respond to the user.
Create intermediate files to store your planned actions, thoughts and work. Use the writeFile tool to create these files. 
Store them in the 'intermediate' directory. After you complete a planned step, record the results in the file.

When ingesting data:
- When quering data, first 
- To generate sample data, use the pysparkTool and not the writeFile tool

When creating plots:
- ALWAYS check for and use existing files and data tables before generating new ones
- If a table has already been generated, reuse that data instead of regenerating it

When creating reports:
- Use iframes to display plots or graphics
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

        const input = {
            messages: [
                new SystemMessage({
                    content: systemMessageContent
                }),
                ...chatSessionMessages,
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
        try { // This WILL catch errors from the async iterator
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


                                        // Check if the schema is a Zod schema with safeParse method
                                        const isZodSchema = (schema: any): schema is { safeParse: Function } => {
                                            return schema && typeof schema.safeParse === 'function';
                                        }

                                        //TODO: If the schema is a json schema, convert it to ZOD and do the same error checking: import { jsonSchemaToZod } from "json-schema-to-zod";
                                        let zodError;
                                        if (selectedToolSchema && isZodSchema(selectedToolSchema)) {
                                            zodError = selectedToolSchema.safeParse(toolCallArgs);
                                            console.log({ toolCallMessage, toolCallArgs, toolName, selectedToolSchema, zodError, formattedZodError: zodError?.error?.format() });

                                            if (zodError?.error) {
                                                streamChunk.content += '\n\n' + stringify(zodError.error.format());
                                            }
                                        } else {
                                            selectedToolSchema
                                            console.log({ toolCallMessage, toolCallArgs, toolName, selectedToolSchema, message: "Schema is not a Zod schema with safeParse method" });
                                        }

                                        // const zodError = selectedToolSchema?.safeParse(toolCallArgs)
                                        console.log({ toolCallMessage, toolCallArgs, toolName, selectedToolSchema, zodError, formattedZodError: zodError?.error?.format() })

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
                                        fieldName: graphQLFieldName,
                                        owner: userId,
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
        } catch (streamError: unknown) {
            console.error("Stream processing error:", streamError);

            let streamErrorMessage = ' Error invoking agent.\n'

            if (streamError instanceof Error) {
                console.error("Stream error details:", JSON.stringify(streamError, null, 2));
                streamErrorMessage += streamError.message || streamError.stack
            }

            const publishChunkResponse = await amplifyClient.graphql({
                query: publishResponseStreamChunk,
                variables: {
                    chunkText: streamErrorMessage,
                    index: -10,
                    chatSessionId: event.arguments.chatSessionId
                }
            });

            console.log("Publish error message in stream response: ", publishChunkResponse)

            // Re-throw to be caught by main catch block
            throw streamError;
        }
    } catch (error) {
        const amplifyClient = getConfiguredAmplifyClient();

        console.warn("Error responding to user:", JSON.stringify(error, null, 2));

        let errorMessage = "Error responding to user.\n"

        if (error instanceof Error) {
            console.error("Stream error details:", JSON.stringify(error, null, 2));
            errorMessage += error.message || error.stack
        }
        // // Send the complete error message to the client
        // const errorMessage = error instanceof Error ? error.stack || error.message : String(error);

        const publishChunkResponse = await amplifyClient.graphql({
            query: publishResponseStreamChunk,
            variables: {
                chunkText: errorMessage,
                index: -10,
                chatSessionId: event.arguments.chatSessionId
            }
        })

        console.log("Publish stream chunk with error message response: ", JSON.stringify(publishChunkResponse, null, 2))

        throw error;
    } finally {
        // Clean up any remaining event listeners
        if (process.eventNames().length > 0) {
            process.removeAllListeners();
        }
    }
}
