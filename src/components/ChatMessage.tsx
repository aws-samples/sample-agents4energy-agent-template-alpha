import { useTheme } from '@mui/material/styles';
import { useEffect, useRef, useState } from 'react';
import React from 'react';

import { Message } from '@/../utils/types';
import { useFileSystem } from '@/contexts/FileSystemContext';

// Import all the message components
import AiMessageComponent from './messageComponents/AiMessageComponent';
import HumanMessageComponent from './messageComponents/HumanMessageComponent';
import CalculatorToolComponent from './messageComponents/CalculatorToolComponent';
import UserInputToolComponent from './messageComponents/UserInputToolComponent';
import { SearchFilesToolComponent } from './messageComponents/SearchFilesToolComponent';
import ListFilesToolComponent from './messageComponents/ListFilesToolComponent';
import ReadFileToolComponent from './messageComponents/ReadFileToolComponent';
import WriteFileToolComponent from './messageComponents/WriteFileToolComponent';
import UpdateFileToolComponent from './messageComponents/UpdateFileToolComponent';
import TextToTableToolComponent from './messageComponents/TextToTableToolComponent';
import PySparkToolComponent from './messageComponents/PySparkToolComponent';
import { PlotDataToolComponent } from './messageComponents/PlotDataToolComponent';
import RenderAssetToolComponent from './messageComponents/RenderAssetToolComponent';
import DefaultToolMessageComponent from './messageComponents/DefaultToolMessageComponent';
import DuckDuckGoSearchToolComponent from './messageComponents/DuckDuckGoSearchToolComponent';
import WebBrowserToolComponent from './messageComponents/WebBrowserToolComponent';

const ChatMessage = (params: {
    message: Message,
    onRegenerateMessage?: (messageId: string, messageText: string) => Promise<boolean>;
}) => {
    const theme = useTheme();
    const { refreshFiles } = useFileSystem();
    
    // Use a ref to track which messages we've already processed
    // to prevent multiple refreshes for the same message
    const processedMessageRef = useRef<{[key: string]: boolean}>({});
    
    // Effect to handle file operation updates
    useEffect(() => {
        // Skip if we've already processed this message
        const messageId = params.message.id;
        if (!messageId || processedMessageRef.current[messageId]) {
            return;
        }
        
        if (params.message.role === 'tool' && 
            (params.message.toolName === 'writeFile' || 
             params.message.toolName === 'updateFile')) {
            try {
                const fileData = JSON.parse(params.message.content?.text || '{}');
                if (fileData.success) {
                    // Mark this message as processed
                    processedMessageRef.current[messageId] = true;
                    // Refresh file list when operations are successful
                    refreshFiles();
                }
            } catch {
                // Even on error, mark as processed to prevent infinite retries
                processedMessageRef.current[messageId] = true;
            }
        }
    }, [params.message, refreshFiles]);

    switch (params.message.role) {
        case 'ai':
            return <AiMessageComponent message={params.message} theme={theme} />;
        case 'tool':
            switch (params.message.toolName) {
                case 'calculator':
                    return <CalculatorToolComponent content={params.message.content} theme={theme} />;
                case 'userInputTool':
                    return <UserInputToolComponent content={params.message.content} theme={theme} />;
                case 'searchFiles':
                    return <SearchFilesToolComponent 
                        content={params.message.content} 
                        theme={theme} 
                        chatSessionId={params.message.chatSessionId || ''}
                    />;
                case 'listFiles':
                    return <ListFilesToolComponent content={params.message.content} theme={theme} />;
                case 'readFile':
                    return <ReadFileToolComponent content={params.message.content} theme={theme} />;
                case 'writeFile':
                    return <WriteFileToolComponent 
                        content={params.message.content} 
                        theme={theme} 
                        chatSessionId={params.message.chatSessionId || ''} 
                    />;
                case 'updateFile':
                    return <UpdateFileToolComponent content={params.message.content} theme={theme} />;
                case 'textToTableTool':
                    return <TextToTableToolComponent content={params.message.content} theme={theme} />;
                case 'plotDataTool':
                    return <PlotDataToolComponent 
                        content={params.message.content} 
                        theme={theme} 
                        chatSessionId={params.message.chatSessionId || ''} 
                    />;
                case 'pysparkTool':
                    return <PySparkToolComponent content={params.message.content} theme={theme} />;
                case 'renderAssetTool':
                    return <RenderAssetToolComponent 
                        content={params.message.content} 
                        theme={theme} 
                        chatSessionId={params.message.chatSessionId || ''} 
                    />;
                case 'duckduckgo-search':
                    return <DuckDuckGoSearchToolComponent content={params.message.content} theme={theme} />;
                case 'webBrowserTool':
                    return <WebBrowserToolComponent content={params.message.content} theme={theme} />;
                default:
                    return <DefaultToolMessageComponent message={params.message} />;
            }
        case 'human':
            return <HumanMessageComponent 
                message={params.message} 
                theme={theme} 
                onRegenerateMessage={params.onRegenerateMessage} 
            />;
        default:
            return null;
    }
}

export default ChatMessage