import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { getConfiguredAmplifyClient } from "../../../utils/amplifyUtils";
import { startMcpBridgeServer } from "../../../utils/awsSignedMcpBridge"
import { Schema } from '../../data/resource';
import { getMcpServer } from '../graphql/queries'

let proxyServerInitilized = false
let port: number | null

export const handler: Schema["testMcpServer"]["functionHandler"] = async (event, context) => {
    const amplifyClient = getConfiguredAmplifyClient();

    if (!proxyServerInitilized) {
        proxyServerInitilized = true
        const mcpBridgeServer = await startMcpBridgeServer({
            service: 'lambda'
        })

        // Get the port after the server is listening
        const address = mcpBridgeServer.address()
        port = typeof address === 'object' && address !== null ? address.port : null
        console.log('Server is listening on port:', port)
    }

    const { data: { getMcpServer: mcpServerInfo } } = await amplifyClient.graphql({
        query: getMcpServer,
        variables: {
            id: event.arguments.mcpServerId
        }
    })

    if (!mcpServerInfo) throw new Error('MCP server not found')

    const baseHeaders = {
        'target-url': mcpServerInfo.url!,
        'accept': 'application/json',
        'jsonrpc': '2.0'
    }

    // Add server-specific headers if they exist
    const serverHeaders: Record<string, string> = {}
    if (mcpServerInfo.headers && Array.isArray(mcpServerInfo.headers)) {
        mcpServerInfo.headers.forEach(header => {
            if (header && header.key && header.value) {
                serverHeaders[header.key] = header.value
            }
        })
    }

    const mcpClient = new MultiServerMCPClient({
        useStandardContentBlocks: true,
        prefixToolNameWithServerName: false,
        // additionalToolNamePrefix: "",

        mcpServers: {
            // [`${mcpServerInfo.name}`]: {
            'test': {
                url: `http://localhost:${port}/proxy`,
                headers: {
                    ...baseHeaders,
                    ...serverHeaders
                }
            }
        }
    })

    const tools = await mcpClient.getTools()

    return {
        // tools: [],
        error: "Error Message Here"
    }
}