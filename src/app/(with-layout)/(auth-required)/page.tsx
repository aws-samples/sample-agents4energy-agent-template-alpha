"use client"
import React from 'react';
import { Container, Typography, Button, Box } from '@mui/material';
import Grid from '@mui/material/Grid2';

import { useRouter } from 'next/navigation';

import { generateClient } from "aws-amplify/data";
import { type Schema } from "@/../amplify/data/resource";
import { useAuthenticator } from '@aws-amplify/ui-react';
const amplifyClient = generateClient<Schema>();

const LandingPage = () => {
  const router = useRouter();
  const { authStatus } = useAuthenticator(context => [context.authStatus]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ textAlign: 'center', my: 5 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          Welcome to Chat Assistant
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom>
          Your personal AI conversation companion
        </Typography>
        <Button
          variant="contained"
          color="primary"
          size="large"
          sx={{ mt: 3 }}
          onClick={async () => {
            if (authStatus === 'authenticated') {
              const newChatSession = await amplifyClient.models.ChatSession.create({});
              router.push(`/chat/${newChatSession.data!.id}`);
            } else {
              router.push('/auth');
            }
          }}
        >
          Start New Chat
        </Button>
        <Button 
          variant="contained" 
          color="secondary" 
          size="large" 
          sx={{ 
            mt: 3, 
            ml: 2, 
            bgcolor: theme => theme.palette.secondary.main,
            color: theme => theme.palette.secondary.contrastText
          }} 
          onClick={() => {
            if (authStatus === 'authenticated') {
              router.push('/listChats');
            } else {
              router.push('/auth');
            }
          }}
        >
          Browse Chats
        </Button>
      </Box>
      <Grid container spacing={4} sx={{ mt: 5 }}>
        <Grid container spacing={2}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" component="h3" gutterBottom>
              Smart Conversations
            </Typography>
            <Typography>
              Engage in intelligent discussions with our advanced AI assistant.
            </Typography>
          </Box>
        </Grid>
        <Grid container spacing={2}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" component="h3" gutterBottom>
              24/7 Availability
            </Typography>
            <Typography>
              Get answers and assistance whenever you need, day or night.
            </Typography>
          </Box>
        </Grid>
        <Grid container spacing={2}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" component="h3" gutterBottom>
              Personalized Experience
            </Typography>
            <Typography>
              Enjoy conversations tailored to your preferences and needs.
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default LandingPage;