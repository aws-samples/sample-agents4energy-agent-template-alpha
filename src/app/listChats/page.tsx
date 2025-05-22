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

import { withAuth } from '@/components/WithAuth';

const Page = () => {
    const { user } = useAuthenticator((context) => [context.user]);
    const [chatSessions, setChatSessions] = useState<Schema["ChatSession"]["createType"][]>([]);

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
            setChatSessions(sortedChatSessions);
        };
        fetchChatSessions();
    }, [user.userId]);

    return (
        <Authenticator>
            <Box>
                {chatSessions.map(chatSession => (
                    <Card key={chatSession.id}>
                        <CardContent>
                            <Typography variant="h5">{chatSession.name}</Typography>
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
        </Authenticator>
    );
}

export default withAuth(Page);