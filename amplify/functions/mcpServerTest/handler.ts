import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { getConfiguredAmplifyClient } from "../../../utils/amplifyUtils";
import { startMcpBridgeServer } from "../../../utils/awsSignedMcpBridge"
import { Schema } from '../../data/resource';
import { getMcpServer } from '../graphql/queries'

let proxyServerInitilized = false
let port: number | null

export const handler: Schema["testMcpServer"]["functionHandler"] = async (event, context) => {
    console.log('event:\n', JSON.stringify(event, null, 2))

    const amplifyClient = getConfiguredAmplifyClient();

    if (!proxyServerInitilized) {
        console.log('Initializing proxy server')
        proxyServerInitilized = true

        try {
            const mcpBridgeServer = await startMcpBridgeServer({
                service: 'lambda'
            })

            // Get the port after the server is listening
            const address = mcpBridgeServer.address()
            port = typeof address === 'object' && address !== null ? address.port : null
            console.log('Server is listening on port:', port)
        } catch (error) {
            console.error('Failed to start MCP bridge server:', error)
            throw new Error(`Failed to initialize proxy server: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    console.log(`Getting mcp server info for MCP server id ${event.arguments.mcpServerId}`)
    const getMcpServeInfoResponse = await amplifyClient.graphql({
        query: getMcpServer,
        variables: {
            id: event.arguments.mcpServerId
        }
    }).catch(error => {
        console.log("Error getting mcp server response: ", error)
    })

    if (!getMcpServeInfoResponse) throw new Error('Error getting MCP server info: ' + JSON.stringify(getMcpServeInfoResponse, null, 2))

    console.log({ getMcpServeInfoResponse })

    const { data: { getMcpServer: mcpServerInfo }, errors: getMcpServerErrors } = getMcpServeInfoResponse

    console.log({ mcpServerInfo })

    if (getMcpServerErrors) throw new Error('Error getting MCP server info: ' + JSON.stringify(getMcpServerErrors, null, 2))
    if (!mcpServerInfo) throw new Error(`MCP server with id (${event.arguments.mcpServerId}) not found`)

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
            [`${mcpServerInfo.name}`]: {
            // 'test': {
                url: `http://localhost:${port}/proxy`,
                headers: {
                    ...baseHeaders,
                    ...serverHeaders
                }
            }
        }
    })

    try {

        console.log(`mcp client mcpServers config: ${mcpClient.config.mcpServers}`)
        const tools = await mcpClient.getTools()
        console.log({tools})

        // Transform MCP tools to match the expected schema format
        const transformedTools: Schema["Tool"]["type"][] = tools.map(tool => ({
            name: tool.name,
            description: tool.description || '',
            schema: JSON.stringify(tool.schema || {})
        }))

        return {
            tools: transformedTools as any,
            error: null
        }
    } catch (error) {
        return {
            tools: null,
            error: error instanceof Error ? error.message : String(error)
        }
    }
}
