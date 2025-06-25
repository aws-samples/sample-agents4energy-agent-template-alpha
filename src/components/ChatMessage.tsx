import { useTheme } from '@mui/material/styles';
import { useEffect, useRef, useState } from 'react';
import React from 'react';

import { Message } from '@/../utils/types';
import { useFileSystem } from '@/contexts/FileSystemContext';

// Import all the message components
import AiMessageComponent from './messageComponents/AiMessageComponent';
import ThinkingMessageComponent from './messageComponents/ThinkingMessageComponent'
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
import RenderAssetToolComponent from './messageComponents/RenderAssetToolComponent';
import DefaultToolMessageComponent from './messageComponents/DefaultToolMessageComponent';
import DuckDuckGoSearchToolComponent from './messageComponents/DuckDuckGoSearchToolComponent';
import WebBrowserToolComponent from './messageComponents/WebBrowserToolComponent';
import CreateProjectToolComponent from './messageComponents/CreateProjectToolComponent';
import CustomWorkshopComponent from './messageComponents/CustomWorkshopComponent'

const ChatMessage = (params: {
    message: Message,
    onRegenerateMessage?: (messageId: string, messageText: string) => Promise<boolean>;
}) => {
    const { message, onRegenerateMessage } = params
    const theme = useTheme();
    const { refreshFiles } = useFileSystem();

    // Use a ref to track which messages we've already processed
    // to prevent multiple refreshes for the same message
    const processedMessageRef = useRef<{ [key: string]: boolean }>({});

    // Effect to handle file operation updates
    useEffect(() => {
        // Skip if we've already processed this message
        const messageId = message.id;
        if (!messageId || processedMessageRef.current[messageId]) {
            return;
        }

        if (message.role === 'tool' &&
            (message.toolName === 'writeFile' ||
                message.toolName === 'updateFile')) {
            try {
                const fileData = JSON.parse(message.content?.text || '{}');
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
    }, [message, refreshFiles]);


    switch (message.role) {
        case 'human':
            return <HumanMessageComponent
                message={message}
                theme={theme}
                onRegenerateMessage={onRegenerateMessage}
            />;
        case 'ai':
            return <AiMessageComponent message={message} theme={theme} />;
        case 'ai-stream':
            return <ThinkingMessageComponent message={message} theme={theme} />
        case 'tool':
            //This set of tools messages will render even if the chain of thought is not being shown
            // Remove "mcp__" prefix from toolName if present
            const toolName = message.toolName?.startsWith("mcp__") 
                ? message.toolName.substring(5) 
                : message.toolName;
                
            switch (toolName) {
                case 'renderAssetTool':
                    return <RenderAssetToolComponent
                        content={message.content}
                        theme={theme}
                        chatSessionId={message.chatSessionId || ''}
                    />;
                case 'userInputTool':
                    return <UserInputToolComponent content={message.content} theme={theme} />;
                case 'createProject':
                    return <CreateProjectToolComponent content={message.content} theme={theme} />;
                case 'calculator':
                    return <CalculatorToolComponent content={message.content} theme={theme} />;
                case 'searchFiles':
                    return <SearchFilesToolComponent
                        content={message.content}
                        theme={theme}
                        chatSessionId={message.chatSessionId || ''}
                    />;
                case 'listFiles':
                    return <ListFilesToolComponent content={message.content} theme={theme} />;
                case 'readFile':
                    return <ReadFileToolComponent content={message.content} theme={theme} />;
                case 'writeFile':
                    return <WriteFileToolComponent
                        content={message.content}
                        theme={theme}
                        chatSessionId={message.chatSessionId || ''}
                    />;
                case 'updateFile':
                    return <UpdateFileToolComponent content={message.content} theme={theme} />;
                case 'textToTableTool':
                    return <TextToTableToolComponent content={message.content} theme={theme} />;
                case 'pysparkTool':
                    return <PySparkToolComponent content={message.content} theme={theme} />;
                case 'duckduckgo-search':
                    return <DuckDuckGoSearchToolComponent content={message.content} theme={theme} />;
                case 'webBrowserTool':
                    return <WebBrowserToolComponent content={message.content} theme={theme} />;
                // case 'permeabilityCalculator':
                //     return <CustomWorkshopComponent content={message.content} theme={theme} />;
                default:
                    return <DefaultToolMessageComponent message={message} />;
            }
        default:
            return null;
    }
}

export default ChatMessage
