"use client"
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
// import { Link } from '@mui/material';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import { generateClient } from "aws-amplify/data";
import { type Schema } from "@/../amplify/data/resource";
import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
const amplifyClient = generateClient<Schema>();

// import WithAuth from '@/components/WithAuth';

type ChatSessionWithFirstMessage = Schema["ChatSession"]["type"] & {
    firstMessageText?: string;
}

const Page = () => {
    const { user } = useAuthenticator((context) => [context.user]);
    const [chatSessions, setChatSessions] = useState<ChatSessionWithFirstMessage[]>([]);

    useEffect(() => {
        const fetchChatSessions = async () => {
            const result = await amplifyClient.models.ChatSession.list({
                filter: {
                    owner: {
                        contains: user.userId
                    }
                }
            });
            const sortedChatSessions = result.data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            // Fetch the first message for each chat session
            const sessionsWithMessages = await Promise.all(
                sortedChatSessions.map(async (session) => {
                    const messagesResult = await amplifyClient.models.ChatMessage.listChatMessageByChatSessionIdAndCreatedAt({
                        chatSessionId: session.id
                    }, { limit: 1 });

                    const firstMessage = messagesResult.data[0];
                    const firstMessageText = firstMessage?.content?.text || '';

                    return {
                        ...session,
                        firstMessageText
                    } as ChatSessionWithFirstMessage;
                })
            );

            setChatSessions(sessionsWithMessages);
        };
        fetchChatSessions();
    }, [user.userId]);

    return (
        <Box>
            {chatSessions.map(chatSession => (
                <Card key={chatSession.id} sx={{ mb: 2 }}>
                    <CardContent>
                        <Typography variant="h5">{chatSession.name}</Typography>

                        {chatSession.firstMessageText && (
                            <Box mt={1}>
                                <Typography variant="body2" color="text.secondary">
                                    {chatSession.firstMessageText.substring(0, 200)}
                                    {chatSession.firstMessageText.length > 200 ? '...' : ''}
                                </Typography>
                            </Box>
                        )}

                        <Box mt={1}>
                            <Typography variant="caption" color="text.secondary">
                                Created: {chatSession.createdAt ? new Date(chatSession.createdAt).toLocaleString() : 'Unknown'}
                            </Typography>
                        </Box>

                        <Box mt={2}>
                            <Link href={`/chat/${chatSession.id}`}>
                                Open Chat
                            </Link>
                            {/* <Button variant="contained" color="primary" href={`/chat/${chatSession.id}`}>
                                    Open Chat
                                </Button> */}
                        </Box>
                        <Box mt={2}>
                            <Button
                                variant="contained"
                                startIcon={<DeleteIcon />}
                                color="secondary"
                                onClick={async () => {
                                    if (window.confirm(`Are you sure you want to delete the chat "${chatSession.name}"?`)) {
                                        await amplifyClient.models.ChatSession.delete({ id: chatSession.id! });
                                        setChatSessions(chatSessions.filter(c => c.id !== chatSession.id));
                                    }
                                }}
                            />
                        </Box>
                    </CardContent>
                </Card>
            ))}
        </Box>
    );
}

export default Page;
