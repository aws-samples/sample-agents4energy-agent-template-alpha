import React, { useState } from 'react';
import { Theme } from '@mui/material/styles';
import { Button, CircularProgress, Typography } from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '@/../utils/types';

interface HumanMessageComponentProps {
  message: Message;
  theme: Theme;
  onRegenerateMessage?: (messageId: string, messageText: string) => Promise<boolean>;
}

const HumanMessageComponent: React.FC<HumanMessageComponentProps> = ({ 
  message, 
  theme, 
  onRegenerateMessage 
}) => {
  // State to track if deletion is in progress
  const [isDeletingMessages, setIsDeletingMessages] = useState<boolean>(false);
  // State to track deletion progress
  const [deletionProgress, setDeletionProgress] = useState<number>(0);

  const humanMessageStyle = {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    marginLeft: 'auto',
    maxWidth: '80%',
  };

  const markdownStyle = {
    textAlign: 'left' as const,
    '& ul, & ol': {
      marginLeft: theme.spacing(2),
      marginRight: 0,
      paddingLeft: theme.spacing(2),
    },
    '& li': {
      marginBottom: theme.spacing(0.5),
    },
    '& p': {
      margin: theme.spacing(1, 0),
    },
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      width: '100%'
    }}>
      <div style={humanMessageStyle}>
        <div style={markdownStyle}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content?.text}
          </ReactMarkdown>
        </div>
      </div>
      {onRegenerateMessage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button 
            size="small"
            onClick={async () => {
              // Set deleting state to true when retry is clicked
              setIsDeletingMessages(true);
              setDeletionProgress(0);
              
              try {
                // Start with initial progress to show something is happening
                setDeletionProgress(10);
                
                // Call the regenerate function and wait for completion
                const success = await onRegenerateMessage(
                  message.id || '', 
                  message.content?.text || ''
                );
                
                // Show completion progress only if successful
                if (success) {
                  setDeletionProgress(100);
                  
                  // Reset states after a brief delay to show the 100%
                  setTimeout(() => {
                    setIsDeletingMessages(false);
                    setDeletionProgress(0);
                  }, 500);
                } else {
                  // If not successful, reset states immediately
                  setIsDeletingMessages(false);
                  setDeletionProgress(0);
                }
              } catch (error) {
                console.error('Error during message regeneration:', error);
                // Reset states on error
                setIsDeletingMessages(false);
                setDeletionProgress(0);
              }
            }}
            startIcon={<ReplayIcon fontSize="small" />}
            disabled={isDeletingMessages}
            sx={{ 
              mt: 0.5, 
              fontSize: '0.75rem',
              color: isDeletingMessages ? theme.palette.grey[400] : theme.palette.grey[700],
              '&:hover': {
                backgroundColor: theme.palette.grey[100]
              }
            }}
          >
            {isDeletingMessages ? 'Deleting...' : 'Retry'}
          </Button>
          
          {isDeletingMessages && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CircularProgress 
                size={16} 
                thickness={5}
                variant="determinate" 
                value={deletionProgress} 
              />
              <Typography variant="caption" color="text.secondary">
                {deletionProgress}%
              </Typography>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HumanMessageComponent; 