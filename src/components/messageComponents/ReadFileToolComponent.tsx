import React from 'react';
import { Theme } from '@mui/material/styles';
import { Typography } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import { Message } from '@/../utils/types';

interface ReadFileToolComponentProps {
  content: Message['content'];
  theme: Theme;
}

const ReadFileToolComponent: React.FC<ReadFileToolComponentProps> = ({ content, theme }) => {
  try {
    const fileContent = JSON.parse(content?.text || '{}').content;
    return (
      <div style={{
        backgroundColor: theme.palette.grey[50],
        padding: theme.spacing(2),
        borderRadius: theme.shape.borderRadius,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        width: '100%'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing(1),
          marginBottom: theme.spacing(1.5),
          color: theme.palette.primary.main
        }}>
          <DescriptionIcon />
          <Typography variant="subtitle1" fontWeight="medium">
            File Content
          </Typography>
        </div>
        <div style={{
          backgroundColor: theme.palette.common.white,
          padding: theme.spacing(2),
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${theme.palette.grey[200]}`,
          overflow: 'auto',
          maxHeight: '300px',
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          whiteSpace: 'pre-wrap',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {typeof fileContent === 'string' ? fileContent : JSON.stringify(fileContent, null, 2)}
        </div>
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
          Error processing file content
        </Typography>
        <pre>
          {content?.text}
        </pre>
      </div>
    );
  }
};

export default ReadFileToolComponent; 