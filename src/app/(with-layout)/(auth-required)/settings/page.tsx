"use client"
import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Box, 
  Alert,
  CircularProgress 
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';

import { type Schema } from "@/../amplify/data/resource";
import { generateClient } from 'aws-amplify/api';

const amplifyClient = generateClient<Schema>();

const SettingsPage: React.FC = () => {
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Load the current system prompt on component mount
  useEffect(() => {
    loadSystemPrompt();
  }, []);

  const loadSystemPrompt = async () => {
    try {
      setLoading(true);
      
      // Query for the system prompt setting
      const { data: settings } = await amplifyClient.models.Settings.list({
        filter: { name: { eq: 'system_prompt' } }
      });

      if (settings && settings.length > 0) {
        setSystemPrompt(settings[0].value || '');
      } else {
        // If no system prompt exists, show a default message
        setSystemPrompt('No system prompt found. You can create one by entering text below and saving.');
      }
    } catch (error) {
      console.error('Error loading system prompt:', error);
      setMessage({ type: 'error', text: 'Failed to load system prompt settings.' });
    } finally {
      setLoading(false);
    }
  };

  const saveSystemPrompt = async () => {
    try {
      setSaving(true);
      setMessage(null);

      // First, try to find existing system prompt setting
      const { data: existingSettings } = await amplifyClient.models.Settings.list({
        filter: { name: { eq: 'system_prompt' } }
      });

      if (existingSettings && existingSettings.length > 0) {
        // Update existing setting
        await amplifyClient.models.Settings.update({
          id: existingSettings[0].id,
          value: systemPrompt
        });
      } else {
        // Create new setting
        await amplifyClient.models.Settings.create({
          name: 'system_prompt',
          value: systemPrompt
        });
      }

      setMessage({ type: 'success', text: 'System prompt saved successfully!' });
    } catch (error) {
      console.error('Error saving system prompt:', error);
      setMessage({ type: 'error', text: 'Failed to save system prompt. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSystemPromptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSystemPrompt(event.target.value);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          System Prompt Configuration
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Configure the system prompt that will be used by the AI agent. This prompt defines the agent's behavior, 
          capabilities, and response style.
        </Typography>

        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}

        <TextField
          fullWidth
          multiline
          rows={20}
          variant="outlined"
          label="System Prompt"
          value={systemPrompt}
          onChange={handleSystemPromptChange}
          placeholder="Enter the system prompt for the AI agent..."
          sx={{ mb: 3 }}
          helperText="This prompt will be sent to the AI model at the beginning of each conversation to establish its role and behavior."
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            onClick={saveSystemPrompt}
            disabled={saving}
            size="large"
          >
            {saving ? 'Saving...' : 'Save System Prompt'}
          </Button>
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          About System Prompts
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          The system prompt is a crucial component that defines how the AI agent behaves. It includes:
        </Typography>
        
        <Box component="ul" sx={{ mt: 1, pl: 2 }}>
          <Typography component="li" variant="body2" color="text.secondary">
            Role definition and personality
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            Instructions for tool usage and file management
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            Guidelines for data processing and visualization
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            Response formatting and style preferences
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default SettingsPage;
