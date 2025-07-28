"use client"
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Box, Container, Paper } from '@mui/material';

// Separate component to handle redirection after authentication
function AuthenticatedRedirect() {
  const router = useRouter();
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);
  
  // Use useEffect to handle navigation after render
  useEffect(() => {
    if (authStatus === 'authenticated') {
      router.push('/');
    }
  }, [authStatus, router]);
  
  // Render message if authenticated
  if (authStatus === 'authenticated') {
    return <div>Authentication successful! Redirecting...</div>;
  }
  
  return null;
}

export default function AuthPage() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Authenticator
            signUpAttributes={['email', 'name']}
            components={{
              Header() {
                return (
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <h1>Welcome</h1>
                    <p>Sign in to your account or create a new one</p>
                  </Box>
                );
              }
            }}
          >
            {() => <AuthenticatedRedirect />}
          </Authenticator>
        </Paper>
      </Box>
    </Container>
  );
}
