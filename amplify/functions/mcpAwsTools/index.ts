import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import mcpMiddleware from "middy-mcp";

import { APIGatewayProxyEvent } from 'aws-lambda';

// Create an MCP server
const server = new McpServer({
    name: "Lambda hosted MCP Server",
    version: "1.0.0",
});

server.registerTool("add", {
    title: "add",              // This title takes precedence
    description: "Adds two numbers together",
    inputSchema: { a: z.number(), b: z.number() }
}, async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }],
}));

// server.tool(
//   "add", 
//   { 
//     description: "Adds two numbers together and returns the sum",
//     parameters: { a: z.number(), b: z.number() }
//   }, 
//   async ({ a, b }) => ({
//     content: [{ type: "text", text: String(a + b) }],
//   })
// );


// // Add an addition tool
// server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
//     content: [{ type: "text", text: String(a + b) }],
// }));

// // Add logging middleware
// const logMiddleware = () => {
//     return {
//         before: async (request: any) => {
//             console.log("Before middleware execution");
//             console.log("Request:", JSON.stringify(request));
//         },
//         after: async (request: any) => {
//             console.log("After middleware execution");
//             console.log("Response:", JSON.stringify(request.response));
//         },
//         onError: async (request: any) => {
//             console.error("Middleware error:", request.error);
//         }
//     };
// };

// // Export the handler wrapped in middy middleware
// export const handler = middy()
//     // .use(logMiddleware())
//     .use(mcpMiddleware({ server }))
//     .use(httpErrorHandler());



export const handler = middy(async (
    event: APIGatewayProxyEvent
) => {
    console.log('Hello from middy!')
    console.log('Event: ', event)
    // The return will be handled by the mcp server
    return {};
})
    // .use(logMiddleware())
    .use(mcpMiddleware({ server }))
    .use(httpErrorHandler());