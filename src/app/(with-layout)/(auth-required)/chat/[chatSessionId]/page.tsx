"use client"
import React, { useEffect, useState } from 'react';

import { generateClient } from "aws-amplify/data";
import { type Schema } from "@/../amplify/data/resource";
import { Box, Typography, Paper, Divider, IconButton, Tooltip, useTheme, useMediaQuery } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import PsychologyIcon from '@mui/icons-material/Psychology';

import ChatBox from "@/components/ChatBox"
import EditableTextBox from '@/components/EditableTextBox';
import FileDrawer from '@/components/FileDrawer';

const amplifyClient = generateClient<Schema>();

function Page({
    params,
}: {
    params: Promise<{ chatSessionId: string }>
}) {
    const [activeChatSession, setActiveChatSession] = useState<Schema["ChatSession"]["createType"]>();
    const [fileDrawerOpen, setFileDrawerOpen] = useState(false);
    const [showChainOfThought, setShowChainOfThought] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const setActiveChatSessionAndUpload = async (newChatSession: Schema["ChatSession"]["createType"]) => {
        const { data: updatedChatSession } = await amplifyClient.models.ChatSession.update({
            id: (await params).chatSessionId,
            ...newChatSession
        });

        if (updatedChatSession) setActiveChatSession(updatedChatSession);
    }

    //Get the chat session info
    useEffect(() => {
        const fetchChatSession = async () => {
            const chatSessionId = (await params).chatSessionId
            if (chatSessionId) {
                const { data: newChatSessionData } = await amplifyClient.models.ChatSession.get({
                    id: chatSessionId
                });
                if (newChatSessionData) setActiveChatSession({ ...newChatSessionData, name: newChatSessionData.name || "New Chat" });
            }
        }
        fetchChatSession()
    }, [params]);

    if (!activeChatSession || !activeChatSession.id) {
        return (
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%'
            }}>
                <Paper elevation={3} sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="h6">Loading your chat session...</Typography>
                </Paper>
            </Box>
        );
    }

    // Drawer variant only matters for mobile now
    const drawerVariant = "temporary";

    return (
        <Box sx={{
            height: '100%',
            display: 'flex',
            overflow: 'hidden',
            p: 2
        }}>
            {/* Main chat area - always full width with padding for desktop drawer */}
            <Box sx={{
                height: '100%',
                width: '100%',
                position: 'relative',
                transition: theme.transitions.create(['padding-right'], {
                    easing: theme.transitions.easing.easeOut,
                    duration: theme.transitions.duration.standard,
                }),
                ...(fileDrawerOpen && !isMobile && {
                    paddingRight: '45%'
                })
            }}>
                <Paper
                    elevation={3}
                    sx={{
                        borderRadius: 2,
                        overflow: 'hidden',
                        backgroundColor: '#f8f9fa',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%'
                    }}
                >
                    <Box sx={{
                        p: 3,
                        backgroundColor: '#fff',
                        borderBottom: '1px solid rgba(0,0,0,0.08)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>

                        <EditableTextBox
                            object={activeChatSession}
                            fieldPath="name"
                            onUpdate={setActiveChatSessionAndUpload}
                            typographyVariant="h3"
                        />
                        <Box sx={{
                            display: 'flex',
                            gap: 1,
                            justifyContent: 'flex-end'
                        }}>
                            <Tooltip title={showChainOfThought ? "Hide Chain of Thought" : "Show Chain of Thought"}>
                                <IconButton
                                    onClick={() => setShowChainOfThought(!showChainOfThought)}
                                    color="primary"
                                    size="large"
                                    sx={{
                                        bgcolor: showChainOfThought ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                                        zIndex: 1300 // Ensure button is above drawer
                                    }}
                                >
                                    <PsychologyIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title={fileDrawerOpen ? "Hide Files" : "View Files"}>
                                <IconButton
                                    onClick={() => setFileDrawerOpen(!fileDrawerOpen)}
                                    color="primary"
                                    size="large"
                                    sx={{
                                        bgcolor: fileDrawerOpen ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                                        zIndex: 1300 // Ensure button is above drawer
                                    }}
                                >
                                    <FolderIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>

                    <Divider />

                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        p: 3,
                        backgroundColor: '#f8f9fa',
                        flex: 1
                    }}>
                        <ChatBox
                            chatSessionId={activeChatSession.id}
                            showChainOfThought={showChainOfThought}
                        />
                    </Box>
                </Paper>
            </Box>

            {/* Floating file button for mobile - only show when drawer is closed */}
            {isMobile && !fileDrawerOpen && (
                <Box
                    sx={{
                        position: 'fixed',
                        bottom: 16,
                        right: 16,
                        zIndex: 1100
                    }}
                >
                    <Tooltip title="View Files">
                        <IconButton
                            onClick={() => setFileDrawerOpen(!fileDrawerOpen)}
                            color="primary"
                            size="large"
                            sx={{
                                bgcolor: 'white',
                                boxShadow: '0 3px 5px rgba(0,0,0,0.2)',
                                '&:hover': {
                                    bgcolor: 'white',
                                }
                            }}
                        >
                            <FolderIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            )}

            {/* File Drawer - completely different handling for mobile vs desktop */}
            <FileDrawer
                open={fileDrawerOpen}
                onClose={() => setFileDrawerOpen(false)}
                chatSessionId={activeChatSession.id}
                variant={drawerVariant}
            />
        </Box>
    );
}

export default Page