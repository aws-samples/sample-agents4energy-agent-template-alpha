import { stringify } from "yaml";

import aws4 from 'aws4';
import http from 'http';
import https from 'https';
import { APIGatewayClient, GetApiKeyCommand } from "@aws-sdk/client-api-gateway";

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

import { getLangChainChatMessagesStartingWithHumanMessage, getLangChainMessageTextContent, publishMessage, stringifyLimitStringLength } from '../../../utils/langChainUtils';
import { EventEmitter } from "events";

const USE_MCP = true;
const LOCAL_PROXY_PORT = 3010

let mcpTools: StructuredToolInterface<ToolSchemaBase, any, any>[]

// Increase the default max listeners to prevent warnings
EventEmitter.defaultMaxListeners = 10;

const graphQLFieldName = 'invokeReActAgent'

if (USE_MCP) {
    const server = http.createServer(async (req, res) => {
        if (req.url === '/proxy') {
            const targetUrl = req.headers['target-url'] as string | undefined;

            if (!targetUrl) {
                console.log('No taget url provided')
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ text: "Listener listening" }));
            }

            console.log('Signing request to taget URL: ', targetUrl)

            // Parse the target URL to extract hostname and pathname
            const url = new URL(targetUrl!);

            // Read the request body
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', () => {
                // Create the AWS request object
                const opts: aws4.Request = {
                    host: url.hostname,
                    path: url.pathname,
                    method: req.method,
                    headers: {
                        ...req.headers,
                        host: url.hostname  // Override the host header to match the target host
                    },
                    body: body,
                    service: 'lambda',
                    region: process.env.AWS_REGION
                };

                // Sign the request with AWS credentials
                aws4.sign(opts, {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                    sessionToken: process.env.AWS_SESSION_TOKEN
                });

                console.log('Full request to be sent to the target host: ', opts)

                // Make the HTTPS request
                const targetReq = https.request(opts, (targetRes) => {
                    let data = '';

                    targetReq.on('data', (chunk) => {
                        data += chunk;
                    });

                    targetReq.on('end', () => {
                        try {
                            console.log('target response body response: ', data)

                            // const response = JSON.parse(data);

                            // console.log('Call tool response: ', JSON.stringify(response, null, 2))
                            res.writeHead(200, targetRes.headers);
                            res.end(data);
                        } catch (error) {
                            // done(error);
                        }
                    });
                });
            });

            // const result = await signAndFetch('https://aws-service...', { method: 'GET' });
            // res.writeHead(200, { 'Content-Type': 'application/json' });
            // res.end(JSON.stringify(result));
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    server.listen(LOCAL_PROXY_PORT,
        async () => {
            const proxyRes = await fetch(`http://localhost:${LOCAL_PROXY_PORT}/proxy`);
            const data = await proxyRes.text();
            console.log('Proxy result:', data);
            // server.close();
        }
    );
}


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

        // This function includes validation to prevent "The text field in the ContentBlock object is blank" errors
        // by ensuring no message content is empty when sent to Bedrock
        const chatSessionMessages = await getLangChainChatMessagesStartingWithHumanMessage(event.arguments.chatSessionId)

        const agentModel = new ChatBedrockConverse({
            model: process.env.AGENT_MODEL_ID,
            // temperature: 0
        });

        // console.log('Signed headers: ', getSignedHeaders(process.env.A4E_MCP_SERVER_URL!))

        if (!mcpTools && USE_MCP) {
            await amplifyClient.graphql({
                query: publishResponseStreamChunk,
                variables: {
                    chunkText: "Listing MCP tools",
                    index: 0,
                    chatSessionId: event.arguments.chatSessionId
                }
            })

            // process.env.MCP_REST_API_KEY_ARN contains the api key's ARN
            const mcpServerApiKey = await (async () => {
                // Extract the API key ID from the ARN
                const apiKeyArn = process.env.MCP_REST_API_KEY_ARN;
                if (!apiKeyArn) throw new Error("MCP_REST_API_KEY_ARN is not set");

                // ARN format: arn:aws:apigateway:region::/apikeys/key-id
                const apiKeyId = apiKeyArn.split('/').pop();

                // Create API Gateway client
                const apiGatewayClient = new APIGatewayClient();

                // Get the API key
                const command = new GetApiKeyCommand({
                    apiKey: apiKeyId,
                    includeValue: true // This is important to get the actual key value
                });

                const response = await apiGatewayClient.send(command);
                if (!response.value) throw new Error("Failed to retrieve API key value");

                // console.log('API Key: ', response.value)

                return response.value; // This is the actual API key value
            })();

            const mcpClient = new MultiServerMCPClient({
                useStandardContentBlocks: true,
                prefixToolNameWithServerName: false,
                additionalToolNamePrefix: "",

                mcpServers: {
                    aws: {
                        url: `http://localhost:${LOCAL_PROXY_PORT}/proxy`,
                        headers: {
                            'X-API-Key': mcpServerApiKey,
                            'target-url': process.env.MCP_REST_API_URL!,
                            'accept': 'application/json',
                            'jsonrpc': '2.0',
                            'chat-session-id': event.arguments.chatSessionId
                        }
                    }
                    // aws: {
                    //     url: process.env.MCP_REST_API_URL!,
                    //     headers: {
                    //         'X-API-Key': mcpServerApiKey,
                    //         'accept': 'application/json',
                    //         'jsonrpc': '2.0',
                    //         'chat-session-id': event.arguments.chatSessionId
                    //     }
                    // }
                }
            })
            // const test = await mcpClient.getTools()

            mcpTools = await mcpClient.getTools()

            // const slowTool = mcpTools.find(t => t.name.includes('process_large_dataset'));

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

        const agentTools = [
            // ...mcpTools,
            new Calculator(),
            ...s3FileManagementTools,
            userInputTool,
            createProjectTool,
            pysparkTool({
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
                    type='log'  # <-- Set y-axis to logarithmic
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

        //  // If the last message is an assistant message with a tool call, call the tool with the arguments
        //  if (
        //     chatSessionMessages.length > 0 && 
        //     chatSessionMessages[chatSessionMessages.length - 1] instanceof AIMessage && 
        //     (chatSessionMessages[chatSessionMessages.length - 1] as AIMessage).tool_calls
        // ) {
        //     console.log('Chat messages end with a tool call but no tool response. Invoking tool...')
        //     const toolCall = (chatSessionMessages[chatSessionMessages.length - 1] as AIMessage).tool_calls![0]
        //     const toolName = toolCall.name
        //     const toolArgs = toolCall.args
        //     const selectedTool = agentTools.find(tool => tool.name === toolName)
        //     if (selectedTool) {
        //         try {
        //             const toolResult = await selectedTool.invoke(toolArgs as any)
        //             console.log('toolResult:\n', JSON.stringify(toolResult, null, 2))
        //             const toolMessage = new ToolMessage({
        //                 content: JSON.stringify(toolResult),
        //                 name: toolName,
        //                 tool_call_id: toolCall.id!
        //             })
        //             chatSessionMessages.push(toolMessage)
        //             await publishMessage({
        //                 chatSessionId: event.arguments.chatSessionId,
        //                 fieldName: graphQLFieldName,
        //                 owner: userId,
        //                 message: toolMessage
        //             })
        //         } catch (error) {
        //             console.error('Tool invocation error:', error)
        //             throw error
        //         }
        //     }
        // }


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

        //If the agent is invoked by another agent, create a tool response message with it's output
        if (event.arguments.respondToAgent) {

            const toolResponseMessage = new ToolMessage({
                content: "This is a tool response message",
                tool_call_id: "123",
                name: "toolName",
                // name: graphQLFieldName
            })
        }

    } catch (error) {
        const amplifyClient = getConfiguredAmplifyClient();

        console.warn("Error responding to user:", JSON.stringify(error, null, 2));

        // Send the complete error message to the client
        const errorMessage = error instanceof Error ? error.stack || error.message : String(error);

        const publishChunkResponse = await amplifyClient.graphql({
            query: publishResponseStreamChunk,
            variables: {
                chunkText: errorMessage,
                index: 0,
                chatSessionId: event.arguments.chatSessionId
            }
        })

        throw error;
    } finally {
        // Clean up any remaining event listeners
        if (process.eventNames().length > 0) {
            process.removeAllListeners();
        }
    }
}
