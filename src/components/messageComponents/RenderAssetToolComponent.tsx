// This component is used to render an asset in a chat message.

import React from 'react';
import { Theme } from '@mui/material/styles';
import { Typography, Box, IconButton, Tooltip } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Message } from '@/../utils/types';
import FileViewer from '../FileViewer';

interface RenderAssetToolComponentProps {
  content: Message['content'];
  theme: Theme;
  chatSessionId: string;
}

const RenderAssetToolComponent: React.FC<RenderAssetToolComponentProps> = ({ content, theme, chatSessionId }) => {
  try {
    const assetData = JSON.parse(content?.text || '{}');
    const { filePath, title, description } = assetData;
    const s3Key = `chatSessionArtifacts/sessionId=${chatSessionId}/${filePath}`;
    if (!filePath) {
      return (
        <Box sx={{
          backgroundColor: theme.palette.grey[200],
          padding: theme.spacing(1),
          borderRadius: theme.shape.borderRadius,
        }}>
          <Typography variant="subtitle2" color="error">
            No file path provided for asset rendering
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{
        backgroundColor: theme.palette.grey[50],
        padding: theme.spacing(2),
        borderRadius: theme.shape.borderRadius,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        width: '100%'
      }}>
        {/* Header */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing(1.5),
        }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing(1),
            color: theme.palette.primary.main
          }}>
            <DescriptionIcon />
            <Typography variant="subtitle1" fontWeight="medium">
              {title || 'Asset Preview'}
            </Typography>
          </Box>
          <Tooltip title="Open in new tab">
            <IconButton
              size="small"
              onClick={() => {
                window.open(`/files/${s3Key}`, '_blank');
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
        </Box>

        {/* Description if provided */}
        {description && (
          <Typography 
            variant="body2" 
            color="textSecondary" 
            sx={{ marginBottom: theme.spacing(1.5) }}
          >
            {description}
          </Typography>
        )}

        {/* Asset Preview */}
        <Box sx={{
          border: `1px solid ${theme.palette.grey[300]}`,
          borderRadius: theme.shape.borderRadius,
          backgroundColor: theme.palette.common.white,
          height: '350px',
          width: '100%',
          overflow: 'hidden'
        }}>
          <FileViewer s3Key={s3Key} />
        </Box>
      </Box>
    );
  } catch (error) {
    return (
      <Box sx={{
        backgroundColor: theme.palette.grey[200],
        padding: theme.spacing(1),
        borderRadius: theme.shape.borderRadius,
      }}>
        <Typography variant="subtitle2" color="error" gutterBottom>
          Error rendering asset
        </Typography>
        <pre>
          {content?.text}
        </pre>
      </Box>
    );
  }
};

export default RenderAssetToolComponent;