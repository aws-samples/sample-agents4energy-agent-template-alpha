import { stringify } from 'yaml';
import { HumanMessage, AIMessage, AIMessageChunk, ToolMessage, BaseMessage, MessageContentText } from "@langchain/core/messages";
import { Message } from './types';

import * as APITypes from "../amplify/functions/graphql/API";
import { listChatMessageByChatSessionIdAndCreatedAt } from "./graphqlStatements";
import { PublishMessageCommandInput } from "./types";

import { getConfiguredAmplifyClient } from "./amplifyUtils";
import { createChatMessage } from "./graphqlStatements";



// const amplifyClient = getConfiguredAmplifyClient();

export function getLangChainMessageTextContent(message: HumanMessage | AIMessage | AIMessageChunk | ToolMessage): string | void {
    let messageTextContent: string = ''

    if (typeof message.content === 'string') {
        messageTextContent += message.content
    } else {
        message.content.forEach((contentBlock) => {
            if ((contentBlock as MessageContentText).text !== undefined) messageTextContent += (contentBlock as MessageContentText).text + '\n'
            // else if ((contentBlock as MessageContentImageUrl).image_url !== undefined) messageContent += message.content.text !== undefined
        })
    }

    // Ensure we never return an empty string - return a space instead
    // This prevents "The text field in the ContentBlock object is blank" errors with Bedrock
    return messageTextContent.trim() === '' ? " " : messageTextContent

}

export function stringifyLimitStringLength(obj: any, maxLength: number = 200) {
    return stringify(
        JSON.parse(
            JSON.stringify(obj, (key: string, value: any) => {
                if (typeof value === 'string' && value.length > maxLength) {
                    return value.substring(0, maxLength) + '...';
                }
                return value;
            })
        )
    );
}

export const publishMessage = async (props: PublishMessageCommandInput) => {
    const amplifyClient = getConfiguredAmplifyClient();

    // console.log('chatMessages: ', this.chatMessages)

    const messageTextContent = getLangChainMessageTextContent(props.message)

    let input: APITypes.CreateChatMessageInput = {
        chatSessionId: props.chatSessionId,
        chatSessionIdUnderscoreFieldName: props.chatSessionId + "_" + props.fieldName,
        content: {
            text: messageTextContent || " "
        },
        owner: props.owner,
        toolCallId: "",
        toolCalls: "[]",
        toolName: "",
        // responseComplete: props.responseComplete || false
    }

    console.log('Message type: ', props.message.getType())

    switch (props.message.getType()) {
        case "ai":
            const toolCalls = (props.message as AIMessageChunk).tool_calls
            input = {
                ...input,
                role: APITypes.ChatMessageRole.ai,
                toolCalls: JSON.stringify(toolCalls),
                responseComplete: ( //If the AI message has no tool calls, set responseComplete to true
                    !toolCalls ||
                    toolCalls?.length === 0
                )
            }
            break;
        case "tool":
            input = {
                ...input,
                role: APITypes.ChatMessageRole.tool,
                toolCallId: (props.message as ToolMessage).tool_call_id,
                toolName: (props.message as ToolMessage).name || 'no tool name supplied'
            }
            break;
    }

    console.log('Publishing mesage with input: ', input)

    const publishMessageResponse = await amplifyClient.graphql({
        query: createChatMessage,
        variables: {
            input: input,
        },
    })
        .catch((err: any) => {
            console.error('GraphQL Error: ', err);
        });

    console.log('Publish message response: \n', stringifyLimitStringLength(publishMessageResponse))
}

export const convertAmplifyChatMessageToLangChainMessage = (message: Message) => {
    // Ensure message content is never empty
    const content = message.content?.text?.trim() ? message.content.text : "<empty message text content>";

    switch (message.role) {
        case 'human':
            return new HumanMessage({
                content: content,
            })
        case 'ai':
            return new AIMessage({
                content: content,
                tool_calls: JSON.parse(message.toolCalls || '[]')
            })
        case 'tool':
            return new ToolMessage({
                content: content,
                tool_call_id: message.toolCallId || "",
                name: message.toolName || "no tool name supplied"
            })
    }
}

export const getLangChainChatMessagesStartingWithHumanMessage = async (chatSessionId: string) => {
    const amplifyClient = getConfiguredAmplifyClient()
    const { data: { listChatMessageByChatSessionIdAndCreatedAt: { items: descendingChatSessionMessages } } } = await amplifyClient.graphql({ //listChatMessageByChatSessionIdAndCreatedAt
        query: listChatMessageByChatSessionIdAndCreatedAt,
        variables: {
            limit: 40,
            chatSessionId: chatSessionId,
            sortDirection: APITypes.ModelSortDirection.DESC,
        }
    })
    // Query in descending order to get the latest messages first, the reverse the array to present the messages in ascending order to the llm
    const chatSessionMessages = descendingChatSessionMessages.reverse()

    const firstHumanMessageIndex = chatSessionMessages.findIndex((message) => message.role === 'human');
    const messagesStartingWithFirstHumanMessage = firstHumanMessageIndex === -1
        ? []
        : chatSessionMessages.slice(firstHumanMessageIndex);

    const langChainMessagesStartingWithFirstHumanMessage = messagesStartingWithFirstHumanMessage.map(
        message => convertAmplifyChatMessageToLangChainMessage(message)
    )

    return langChainMessagesStartingWithFirstHumanMessage
}
