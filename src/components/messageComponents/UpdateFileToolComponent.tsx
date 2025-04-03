import React from 'react';
import { Theme } from '@mui/material/styles';
import { Typography } from '@mui/material';
import UpdateIcon from '@mui/icons-material/Update';
import { Message } from '@/../utils/types';

interface UpdateFileToolComponentProps {
  content: Message['content'];
  theme: Theme;
}

const UpdateFileToolComponent: React.FC<UpdateFileToolComponentProps> = ({ content, theme }) => {
  try {
    const fileData = JSON.parse(content?.text || '{}');
    return (
      <div style={{
        backgroundColor: theme.palette.info.light,
        padding: theme.spacing(1.5),
        borderRadius: theme.shape.borderRadius,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        maxWidth: '80%',
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing(1.5)
      }}>
        <UpdateIcon style={{ color: theme.palette.info.dark }} />
        <Typography variant="body1" color="textPrimary">
          {fileData.success 
            ? `File updated successfully` 
            : `Error: ${fileData.message || 'Unknown error updating file'}`}
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
          Error processing file update result
        </Typography>
        <pre>
          {content?.text}
        </pre>
      </div>
    );
  }
};

export default UpdateFileToolComponent; 