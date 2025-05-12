import { stringify } from "yaml";

import { getConfiguredAmplifyClient } from '../../../utils/amplifyUtils';

import { ChatBedrockConverse } from "@langchain/aws";
import { HumanMessage, ToolMessage, BaseMessage, SystemMessage, AIMessageChunk, AIMessage } from "@langchain/core/messages";
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
import { createProjectToolBuilder } from "../tools/createProjectTool";
import { Schema } from '../../data/resource';

import { getLangChainChatMessagesStartingWithHumanMessage, getLangChainMessageTextContent, publishMessage, stringifyLimitStringLength } from '../../../utils/langChainUtils';
import { EventEmitter } from "events";

// Increase the default max listeners to prevent warnings
EventEmitter.defaultMaxListeners = 10;

// Add cleanup helper
const cleanupEventEmitter = (emitter: EventEmitter) => {
    emitter.removeAllListeners();
};

const graphQLFieldName = 'invokeReActAgent'

export const handler: Schema["invokeReActAgent"]["functionHandler"] = async (event, context) => {
    console.log('event:\n', JSON.stringify(event, null, 2))

    const foundationModelId = event.arguments.foundationModelId || process.env.AGENT_MODEL_ID
    if (!foundationModelId) throw new Error("AGENT_MODEL_ID is not set");

    const userId = event.arguments.userId || (event.identity && 'sub' in event.identity ? event.identity.sub : null);
    if (!userId) throw new Error("userId is required");

    const origin = event.arguments.origin || (event.request?.headers?.origin || null);
    if (!origin) throw new Error("origin is required");
    console.log('origin:', origin);
    try {
        if (event.arguments.chatSessionId === null) throw new Error("chatSessionId is required");

        // Set the chat session ID for use by the S3 tools
        setChatSessionId(event.arguments.chatSessionId);

        // Set the origin from the event arguments or request headers
        setOrigin(origin);

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
            new DuckDuckGoSearch({maxResults: 3}),
            webBrowserTool,
            userInputTool,
            createProjectToolBuilder({
                sourceChatSessionId: event.arguments.chatSessionId,
                foundationModelId: foundationModelId
            }),
            pysparkTool({
                additionalSetupScript:`
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
                `,}),
            ...s3FileManagementTools,
            renderAssetTool
        ]

        const agent = createReactAgent({
            llm: agentModel,
            tools: agentTools,
        });

         // If the last message is an assistant message with a tool call, call the tool with the arguments
         if (
            chatSessionMessages.length > 0 && 
            chatSessionMessages[chatSessionMessages.length - 1] instanceof AIMessage && 
            (chatSessionMessages[chatSessionMessages.length - 1] as AIMessage).tool_calls
        ) {
            console.log('Chat messages end with a tool call but no tool response. Invoking tool...')
            const toolCall = (chatSessionMessages[chatSessionMessages.length - 1] as AIMessage).tool_calls![0]
            const toolName = toolCall.name
            const toolArgs = toolCall.args
            const selectedTool = agentTools.find(tool => tool.name === toolName)
            if (selectedTool) {
                try {
                    const toolResult = await selectedTool.invoke(toolArgs as any)
                    console.log('toolResult:\n', JSON.stringify(toolResult, null, 2))
                    const toolMessage = new ToolMessage({
                        content: JSON.stringify(toolResult),
                        name: toolName,
                        tool_call_id: toolCall.id!
                    })
                    chatSessionMessages.push(toolMessage)
                    await publishMessage({
                        chatSessionId: event.arguments.chatSessionId,
                        fieldName: graphQLFieldName,
                        owner: userId,
                        message: toolMessage
                    })
                } catch (error) {
                    console.error('Tool invocation error:', error)
                    throw error
                }
            }
        }

        
        let systemMessageContent = `
You are a helpful llm agent showing a demo workflow. 
Use markdown formatting for your responses (like **bold**, *italic*, ## headings, etc.), but DO NOT wrap your response in markdown code blocks.
Today's date is ${new Date().toLocaleDateString()}.

List the files in the global/notes directory for guidance on how to respond to the user.
Create intermediate files to store your planned actions, thoughts and work. Use the writeFile tool to create these files. 
Store them in the 'intermediate' directory. After you complete a planned step, record the results in the file.

When generating a csv file, use the pysparkTool to generate the file and not the writeFile tool.

<Well Repair Project Generation Guidelines>
1. Data Collection Checklist:
    - Historic production data (monthly gas/oil volumes)
    - Current well status
    - Existing tubing depth
    - Current artificial lift type
    - Well file information:
        - Use the textToTableTool to extract the Operational Events from the well file.
        - The file pattern should be the well's api number with no formatting (ex: 3004529202)
        - Set table columns for: 
            - Date of the operation (YYYY-MM-DD format)
            - Event type (drilling, completion, workover, surface facility / tank work, administrative, etc)
            - Text from the report describing proposed or completed operations
            - Tubing depth
            - Artifical lift type. You MUST use the column definition below:
{
    "columnName": "ArtificialLiftType", 
    "columnDescription": "CRITICAL EXTRACTION RULES (in order of precedence):\n1. EXPLICIT ROD PUMP PHRASES:\n   - If 'rods', 'Rods & pump', 'RIH W/ PUMP & RODS', or similar phrases are found, ALWAYS classify as 'Rod Pump'.\n2. ROD CONTEXT:\n   - If 'rods' or 'RODS' appears in ANY context related to production or well completion, classify as 'Rod Pump'.\n3. SECONDARY CRITERIA (if no rods mentioned):\n   - 'Plunger Lift': Search for 'plunger lift' or 'bumper spring'\n   - 'ESP': Search for 'electric submersible pump' or 'ESP'",
    "columnDataDefinition": {
        "type": "string", 
        "enum": [
            "Rod Pump", 
            "Plunger Lift", 
            "ESP", 
            "Flowing", 
            "None"
        ]
    }
}
            - Any other relevant information
        Note: Administrative events include:
            - Change in well operator
            - Change in transporter
            - Regulatory filings and permits
            - Ownership transfers
            - Other legal/administrative changes that do not affect well operations

2. Analyze the well events and production data to determine the cause of the production drop.
3. Generate a procedure to repair the well.
    - Use the well file information table to determine the tubing depth and artificial lift type.
    - Don't use rows with the administrative event type for artificial lift type.
    - The last row with an artificial lift type is the current artificial lift type.
    - If any row shows "Rod Pump" as the artificial lift type, use that as the artificial lift type.
    - This can include:
        - Using a workover rig to adjusting the well configuration (tubing depth, artificial lift type) to improve production.
        - Using a braden line unit to swap fluid out of the well
        - Making a surface repair
        - Changing an artificial lift setting
    - Guidance on types of artifical lift:
        - Plunger Lift:
            - Fluid rates < 10 bbl/day
            - Gas to Oil Ratio (GOR) > 0.4 scf/bbl per 1,000 ft of well depth
        - Rod Lift:
            - Efficient for high GOR wells when flowing gas up the annulus (Casing acts as a sperator). Set tubing below lowest perforation.
            - Capital intensive to install, but low operating costs.
            - If the well is currently on rod lift, don't change the artificial lift type.
            - Sutible for late life wells.
        - Gas Lift:
            - Fluid rates > 10 bbl/day
            - Reservoir Pressure Gradient between 0.01 and 0.06 psi/ft.
            - Requires a gas supply. Assume not if you are not sure.
            - High fuel gas consumption.
        - Electric Submersible Pump (ESP):
            - Fluid rates > 10 bbl/day
            - Reservoir Pressure > 1,000 psi
            - Electricy is available at the well site (Assume not if you are not sure)
            - Low solids content in produced fluids
        - Artificial Lift Not Recommended:
            - Well flows naturally with no artificial lift
      
4. Estimate the cost of repairing the well.
5. Report Structure:
   a) Executive Summary
      - Recommended action (Repair/Do Not Repair)
      - NPV10 calculation (If the pysparkTool response didn't print this output, look for an economic analysis file and read it with the readFile tool)
      - Incremental production metrics 
   b) Detailed Economic Analysis
      - Plot historic production, the decline curve, and operational events
        - Ex: <iframe src="plots/production_and_decline_curve_plot.html" width="100%" height="500px" frameborder="0"></iframe>
      - Repair cost breakdown
   c) Technical Assessment
      - Operational events table:
        - If the textToTable tool returned a link to a table of operational events, include in ifram which links to it.
        - If not, create a table with operational events.
      - Current well condition and artificial lift type
      - Summary of the proposed procedure
      - Link to the proposed repair procedure (ex: <a href="reports/repair_procedure.md">Proposed Repair Procedure</a>)
      - Expected production improvement
      - If you recommend changing artificial lift type, explain why and use produciton rates to support the recommendation
    d) Analysis Workflow
      - Data Collection and Validation
        * List all data sources gathered
      
      - Analysis Steps
        * Document each major analysis performed
        * For each analysis:
          - Purpose and methodology
          - Key parameters and assumptions
          - Link to supporting calculations or intermediate files
      
      - Results Generation
        * Document how final metrics were calculated
        * List all plots and visualizations generated
        * Explain key decisions in presentation of results
        * Link to final output files and supporting documentation
      
      - Quality Assurance
        * Note any limitations or uncertainties in the analysis
        * Include recommendations for future improvements

    e) Data Sources
      - Links to every data source used in the report
      - Include footnotes where the data was used
      - Example:
           \`\`\`html
           <h2>Data Sources</h2>
           <ul>
                <li><a href="data/production_data.csv">Production Data</a></li>
                <li><a href="data/production_data.csv">Production Data</a></li>
                <li><a href="data/monthly_cash_flow_projection.csv">Monthly Cash Flow Projection</a></li>
           </ul>
           \`\`\`

</Well Repair Project Generation Guidelines>

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