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

        return NextResponse.json({ tools });
    } catch (error) {
        console.error('Error fetching MCP tools:', error);
        return NextResponse.json(
            { error: 'Failed to fetch MCP tools', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
