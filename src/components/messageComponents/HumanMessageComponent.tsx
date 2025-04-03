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
  onRegenerateMessage?: (messageId: string, messageText: string) => void;
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
    textAlign: 'right' as const,
    marginLeft: 'auto',
    maxWidth: '80%',
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      width: '100%'
    }}>
      <div style={humanMessageStyle}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {message.content?.text}
        </ReactMarkdown>
      </div>
      {onRegenerateMessage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button 
            size="small"
            onClick={() => {
              // Set deleting state to true when retry is clicked
              setIsDeletingMessages(true);
              
              // Create a fake progress simulation
              const startTime = Date.now();
              const expectedDuration = 1500; // 1.5 seconds for deletion animation
              
              const progressInterval = setInterval(() => {
                const elapsedTime = Date.now() - startTime;
                const progress = Math.min(100, Math.round((elapsedTime / expectedDuration) * 100));
                setDeletionProgress(progress);
                
                if (progress >= 100) {
                  clearInterval(progressInterval);
                  // Reset states and call regenerate function simultaneously
                  setIsDeletingMessages(false);
                  setDeletionProgress(0);
                  onRegenerateMessage(
                    message.id || '', 
                    message.content?.text || ''
                  );
                }
              }, 50);
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