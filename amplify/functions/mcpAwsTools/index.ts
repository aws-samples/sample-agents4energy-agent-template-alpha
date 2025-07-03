import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z, ZodRawShape } from "zod";
import mcpMiddleware from "middy-mcp";

import { DynamicStructuredTool } from "@langchain/core/tools";

import { APIGatewayProxyEvent } from 'aws-lambda';
import { setChatSessionId } from "../tools/toolUtils";

import {
    s3FileManagementTools,
    listFiles,
    readFile,
    writeFile,
    updateFile,
    textToTableTool,
    searchFiles
} from "../tools/s3ToolBox";
import { userInputTool } from "../tools/userInputTool";
import { pysparkTool } from "../tools/athenaPySparkTool";
import { renderAssetTool } from "../tools/renderAssetTool";
import { createProjectTool } from "../tools/createProjectTool";


// Create an MCP server
const server = new McpServer({
    name: "Lambda hosted MCP Server",
    version: "1.0.0",
});

server.registerPrompt(
    "dummy",
    {
        title: "Dummy Prompt",
        description: "Here is a dummy prompt",
        argsSchema: { myArgString: z.string() }
    },
    ({ myArgString }) => ({
        messages: [{
            role: "user",
            content: {
                type: "text",
                text: `Here is the arg you sent:\n\n${myArgString}`
            }
        }]
    })
);

// server.registerTool("add", {
//     title: "add",              // This title takes precedence
//     description: "Adds two numbers together",
//     inputSchema: { a: z.number(), b: z.number() }
// }, async ({ a, b }) => ({
//     content: [{ type: "text", text: String(a + b) }],
// }));

const langChainToolHandler = (langChainTool: DynamicStructuredTool) => async (args: any) => {
    // Call the LangChain tool with the arguments
    const result = await langChainTool.invoke(args);

    // Convert result to string - if it's an object, use JSON.stringify, otherwise use as is
    const resultText = typeof result === 'object' && result !== null
        ? JSON.stringify(result)
        : String(result);

    console.log(`Result of ${langChainTool.name}: `, resultText)

    // Return the result in the format expected by MCP
    return {
        content: [{ type: "text", text: resultText }],
    };
}

const langGraphTools: DynamicStructuredTool[] = [
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
    listFiles,
    readFile,
    writeFile,
    // updateFile,
    // textToTableTool,
    // searchFiles,
    renderAssetTool,
    userInputTool,
    createProjectTool
]

for (const langChainTool of langGraphTools) {
    console.log('Registering tool ', langChainTool.name)
    if (!('shape' in langChainTool.schema)) continue

    server.registerTool(
        langChainTool.name,
        {
            title: langChainTool.name,
            description: langChainTool.description,
            inputSchema: langChainTool.schema.shape as ZodRawShape

        },
        langChainToolHandler(langChainTool) as any
    );
}

// Add logging middleware
const logMiddleware = () => {
    return {
        before: async (request: any) => {
            console.log("Before middleware execution");
            // console.log("Request:", JSON.stringify(request));
        },
        after: async (request: any) => {
            console.log("After middleware execution");
            console.log("Response:", JSON.stringify(request.response));
        },
        onError: async (request: any) => {
            console.error("Middleware error:", request.error);
        }
    };
};

export const handler = middy(async (
    event: APIGatewayProxyEvent
) => {
    console.log('Event: ', event)
    const chatSessionId = event.headers["chat-session-id"] ?? "default-session-id"
    console.log('Chat Session Id: ', chatSessionId)

    setChatSessionId(chatSessionId);
    // The return will be handled by the mcp server
    return {};
})
    .use(logMiddleware())
    .use(mcpMiddleware({ server }))
    .use(httpErrorHandler());
