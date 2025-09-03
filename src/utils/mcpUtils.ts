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

  // Try different header configurations based on the server URL
  let requestHeaders: Record<string, string>;
  
  if (serverUrl.includes('mcp.exa.ai')) {
    // Specific headers for Exa MCP server - must accept both application/json and text/event-stream
    requestHeaders = {
      'accept': 'application/json, text/event-stream',
      'content-type': 'application/json',
      'user-agent': 'mcp-remote/0.1.29',
      ...headers
    };
  } else {
    // Standard MCP headers for other servers
    requestHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'mcp-remote/0.1.29',
      'Content-Length': Buffer.byteLength(bodyData, 'utf8').toString(),
      ...headers
    };
  }

  // Remove any undefined or null headers
  Object.keys(requestHeaders).forEach(key => {
    if (requestHeaders[key] === undefined || requestHeaders[key] === null) {
      delete requestHeaders[key];
    }
  });

  console.log('MCP Request Details:', {
    url: serverUrl,
    method: 'POST',
    headers: requestHeaders,
    bodyLength: bodyData.length,
    signWithAwsCreds,
    body: bodyData
  });

  try {
    let response: Response;

    if (signWithAwsCreds) {
      // Create AWS client for signing requests
      const aws = new AwsClient({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        sessionToken: process.env.AWS_SESSION_TOKEN,
        region: process.env.AWS_REGION || 'us-east-1'
      });

      // Make the signed request using aws4fetch
      response = await aws.fetch(serverUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: bodyData
      });
    } else {
      // Make unsigned request
      response = await fetch(serverUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: bodyData
      });
    }

    console.log('MCP Response Status:', response.status, response.statusText);
    console.log('MCP Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const responseText = await response.text().catch(() => 'Unable to read response body');
      console.error('MCP Error Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText
      });
      
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}. Response: ${responseText}`);
    }

    // Check if response is Server-Sent Events (SSE) format
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/event-stream')) {
      console.log('Processing SSE response from MCP server...');
      
      const responseText = await response.text();
      console.log('SSE Response:', responseText);
      
      // Parse SSE format to extract JSON data
      const lines = responseText.split('\n');
      let jsonData = '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6); // Remove 'data: ' prefix
          if (data.trim() && data !== '[DONE]') {
            jsonData += data;
          }
        }
      }
      
      if (jsonData) {
        try {
          const data: McpToolsResponse = JSON.parse(jsonData);
          if (data.result && data.result.tools) {
            return data.result.tools.map(tool => ({
              name: tool.name,
              description: tool.description,
              schema: JSON.stringify(tool.schema)
            }));
          }
        } catch (parseError) {
          console.error('Failed to parse SSE JSON data:', parseError);
          console.error('Raw JSON data:', jsonData);
          throw new Error(`Failed to parse SSE response: ${parseError}`);
        }
      }
    } else {
      // Handle regular JSON response
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
  } catch (error) {
    console.error('MCP Request failed:', error);
    throw error;
  }
};
