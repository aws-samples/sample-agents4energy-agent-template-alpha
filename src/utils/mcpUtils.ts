import { AwsClient } from 'aws4fetch';

export interface McpTool {
  name: string;
  description: string;
  schema: string;
}

export interface McpToolsResponse {
  jsonrpc: string;
  id: number;
  result: {
    tools: McpTool[];
  };
}

/**
 * Fetch tools from an MCP server
 * @param serverUrl The MCP server URL
 * @param signWithAwsCreds Whether to sign the request with AWS credentials
 * @param headers Additional headers to include
 * @returns Promise resolving to the list of tools
 */
export const fetchMcpTools = async (
  serverUrl: string,
  signWithAwsCreds: boolean = false,
  headers: Record<string, string> = {}
): Promise<McpTool[]> => {
  const bodyData = JSON.stringify({
    jsonrpc: "2.0",
    method: "tools/list",
    id: 1
  });

  const requestHeaders: Record<string, string> = {
    'content-type': 'application/json',
    'accept': 'application/json',
    'content-length': Buffer.byteLength(bodyData).toString(),
    'jsonrpc': '2.0',
    ...headers
  };

  let requestOptions: RequestInit = {
    method: 'POST',
    headers: requestHeaders,
    body: bodyData
  };

  // If AWS signing is required, throw an error since this should be done server-side
  if (signWithAwsCreds) {
    // Note: AWS signing is not supported in browser context for security reasons
    if (typeof window !== 'undefined') {
      throw new Error('AWS signing not supported in browser context. Use server-side API.');
    }
    
    // For server-side usage, use fetchMcpToolsServerSide instead
    throw new Error('Use fetchMcpToolsServerSide for AWS signed requests.');
  }

  try {
    const response = await fetch(serverUrl, requestOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: McpToolsResponse = await response.json();
    
    if (data.result && data.result.tools) {
      return data.result.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        schema: JSON.stringify(tool.schema)
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching MCP tools:', error);
    throw error;
  }
};

/**
 * Server-side function to fetch MCP tools with AWS signing
 * This should be called from an API route for security
 */
export const fetchMcpToolsServerSide = async (
  serverUrl: string,
  signWithAwsCreds: boolean = false,
  headers: Record<string, string> = {}
): Promise<McpTool[]> => {
  const bodyData = JSON.stringify({
    jsonrpc: "2.0",
    method: "tools/list",
    id: 1
  });

  if (signWithAwsCreds) {
    // Create AWS client for signing requests
    const aws = new AwsClient({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      sessionToken: process.env.AWS_SESSION_TOKEN,
      region: process.env.AWS_REGION || 'us-east-1'
    });

    // Make the signed request using aws4fetch
    const response = await aws.fetch(serverUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
        'jsonrpc': '2.0',
        ...headers
      },
      body: bodyData
    });

    if (!response.ok) {
      throw new Error(`HTTP error after sending signed request! status: ${response.status}`);
    }

    const data: McpToolsResponse = await response.json();
    
    if (data.result && data.result.tools) {
      return data.result.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        schema: JSON.stringify(tool.schema)
      }));
    }
  } else {
    // Make unsigned request
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
        'jsonrpc': '2.0',
        ...headers
      },
      body: bodyData
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: McpToolsResponse = await response.json();
    
    if (data.result && data.result.tools) {
      return data.result.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        schema: JSON.stringify(tool.schema)
      }));
    }
  }
  
  return [];
};
