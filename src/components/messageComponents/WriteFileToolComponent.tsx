import React from 'react';
import { Theme } from '@mui/material/styles';
import { Typography, IconButton, Tooltip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Message } from '@/../utils/types';

interface WriteFileToolComponentProps {
  content: Message['content'];
  theme: Theme; 
  chatSessionId: string;
}

const WriteFileToolComponent: React.FC<WriteFileToolComponentProps> = ({ content, theme, chatSessionId }) => {
  try {
    const fileData = JSON.parse(content?.text || '{}');
    const basePath = `chatSessionArtifacts/sessionId=${chatSessionId}/`;
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
        <Typography variant="body1" color="textPrimary" style={{ flex: 1 }}>
          {fileData.success 
            ? `File saved successfully` 
            : `Error: ${fileData.message || 'Unknown error writing file'}`}
        </Typography>
        {fileData.success && fileData.targetPath && (
          <Tooltip title={`Open ${fileData.targetPath} in new tab`}>
            <IconButton
              size="small"
              onClick={() => {
                const encodedPath = fileData.targetPath.split('/').map((segment: string) => encodeURIComponent(segment)).join('/');
                window.open(`/file/${basePath}/${encodedPath}`, '_blank');
              }}
              sx={{
                opacity: 0.7,
                '&:hover': {
                  opacity: 1,
                  color: theme.palette.primary.main
                }
              }}
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
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