import React from 'react';
import { Theme } from '@mui/material/styles';
import { Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Message } from '@/../utils/types';

interface WriteFileToolComponentProps {
  content: Message['content'];
  theme: Theme;
}

const WriteFileToolComponent: React.FC<WriteFileToolComponentProps> = ({ content, theme }) => {
  try {
    const fileData = JSON.parse(content?.text || '{}');
    return (
      <div style={{
        backgroundColor: theme.palette.success.light,
        padding: theme.spacing(1.5),
        borderRadius: theme.shape.borderRadius,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        maxWidth: '80%',
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing(1.5)
      }}>
        <CheckCircleIcon style={{ color: theme.palette.success.dark }} />
        <Typography variant="body1" color="textPrimary">
          {fileData.success 
            ? `File saved successfully` 
            : `Error: ${fileData.message || 'Unknown error writing file'}`}
        </Typography>
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
          Error processing file write result
        </Typography>
        <pre>
          {content?.text}
        </pre>
      </div>
    );
  }
};

export default WriteFileToolComponent; 