import React from 'react';
import { Theme } from '@mui/material/styles';
import { Button, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '@/../utils/types';

interface UserInputToolComponentProps {
  content: Message['content'];
  theme: Theme;
}

const UserInputToolComponent: React.FC<UserInputToolComponentProps> = ({ content, theme }) => {
  try {
    const toolData = JSON.parse(content?.text || '{}');
    return (
      <div style={{
        backgroundColor: theme.palette.background.paper,
        padding: theme.spacing(2),
        borderRadius: theme.shape.borderRadius,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        maxWidth: '90%',
        margin: theme.spacing(1, 0)
      }}>
        <Typography variant="h6" gutterBottom sx={{
          color: theme.palette.primary.main,
          fontWeight: 'bold'
        }}>
          {toolData.title || 'User Action Required'}
        </Typography>

        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
        >
          {toolData.description || 'Please take action by clicking the button below.'}
        </ReactMarkdown>

        <Button
          variant="contained"
          color="primary"
          sx={{
            fontWeight: 'medium',
            textTransform: 'none',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            '&:hover': {
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            }
          }}
          onClick={(e) => {
            const button = e.currentTarget;
            button.disabled = true;
            button.textContent = toolData.buttonTextAfterClick || 'Done!';
            button.style.backgroundColor = theme.palette.success.main;
          }}
        >
          {toolData.buttonTextBeforeClick || 'Click to Proceed'}
        </Button>
      </div>
    );
  } catch {
    return (
      <div style={{
        backgroundColor: theme.palette.grey[200],
        padding: theme.spacing(1),
        borderRadius: theme.shape.borderRadius,
      }}>
        <Typography variant="subtitle2" color="error" gutterBottom>
          Error parsing user input tool data
        </Typography>
        <div>
          {content?.text}
        </div>
      </div>
    );
  }
};

export default UserInputToolComponent; 