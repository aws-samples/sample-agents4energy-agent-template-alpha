import { NextRequest, NextResponse } from 'next/server';
import { fetchMcpToolsServerSide } from '@/utils/mcpUtils';
import { setAmplifyEnvVars } from '../../../../utils/amplifyUtils';

export async function POST(request: NextRequest) {
    try {
        // Set up environment variables
        const envResult = await setAmplifyEnvVars();
        if (!envResult.success) {
            console.warn('Failed to set Amplify environment variables:', envResult.error);
        }

        const body = await request.json();
        const { serverUrl, signWithAwsCreds, headers } = body;

        console.log('MCP Tools API Request:', {
            serverUrl,
            signWithAwsCreds,
            hasHeaders: !!headers && Object.keys(headers).length > 0,
            headerKeys: headers ? Object.keys(headers) : []
        });

        if (!serverUrl) {
            return NextResponse.json(
                { error: 'Server URL is required' },
                { status: 400 }
            );
        }

        const tools = await fetchMcpToolsServerSide(
            serverUrl,
            signWithAwsCreds || false,
            headers || {}
        );

        console.log('MCP Tools fetched successfully:', {
            toolCount: tools.length,
            toolNames: tools.map(t => t.name)
        });

        return NextResponse.json({ tools });
    } catch (error) {
        console.error('Error fetching MCP tools:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            serverUrl: request.url
        });

        // Determine appropriate status code based on error
        let statusCode = 500;
        let errorMessage = 'Failed to fetch MCP tools';

        if (error instanceof Error) {
            if (error.message.includes('status: 406')) {
                statusCode = 406;
                errorMessage = 'Content negotiation failed - server rejected request format';
            } else if (error.message.includes('status: 401')) {
                statusCode = 401;
                errorMessage = 'Authentication failed - check API key';
            } else if (error.message.includes('status: 403')) {
                statusCode = 403;
                errorMessage = 'Access forbidden - check permissions';
            } else if (error.message.includes('status: 404')) {
                statusCode = 404;
                errorMessage = 'MCP server not found';
            } else if (error.message.includes('status: 429')) {
                statusCode = 429;
                errorMessage = 'Rate limit exceeded';
            }
        }

        return NextResponse.json(
            { 
                error: errorMessage, 
                details: error instanceof Error ? error.message : 'Unknown error',
                statusCode 
            },
            { status: statusCode }
        );
    }
}
