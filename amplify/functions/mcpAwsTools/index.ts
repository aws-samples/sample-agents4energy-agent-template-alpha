import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// If middy-mcp is a custom or community package, make sure to install it
import mcpMiddleware from "middy-mcp";

// Create an MCP server
const server = new McpServer({
    name: "Lambda hosted MCP Server",
    version: "1.0.0",
});

// Add an addition tool
server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }],
}));

// Add logging middleware
const logMiddleware = () => {
    return {
        before: async (request: any) => {
            console.log("Before middleware execution");
            console.log("Request:", JSON.stringify(request));
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

// // Export the handler wrapped in middy middleware
// export const handler = middy(rawHandler)
//     .use(logMiddleware())
//     // .use(mcpMiddleware({ server }))
//     .use(httpErrorHandler());


import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = middy(async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    console.log('Hello from middy!')
    console.log('Event: ', event)
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Hello, world, from middy!"
        }),
        headers: {
            'Content-Type': 'application/json',
        },
    };
})
    .use(logMiddleware())
    // .use(mcpMiddleware({ server }))
    .use(httpErrorHandler());