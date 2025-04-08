import React, { useState, useMemo } from 'react';
import { Theme } from '@mui/material/styles';
import { Typography, Paper, Box, Alert, Button } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '@/../utils/types';

interface WebBrowserResponse {
  content?: string;
  error?: string;
  status: number;
  url: string;
}

interface WebBrowserToolComponentProps {
  content: Message['content'];
  theme: Theme;
}

const TRUNCATE_LENGTH = 1000; // Show first 1000 characters initially

const WebBrowserToolComponent: React.FC<WebBrowserToolComponentProps> = ({ content, theme }) => {
  const [showFullContent, setShowFullContent] = useState(false);
  
  try {
    const response: WebBrowserResponse = JSON.parse(content?.text || '{}');
    
    const displayContent = useMemo(() => {
      if (!response.content) return '';
      if (showFullContent) return response.content;
      
      // Try to truncate at the end of a sentence or paragraph
      const truncated = response.content.slice(0, TRUNCATE_LENGTH);
      const lastPeriod = truncated.lastIndexOf('.');
      const lastNewline = truncated.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);
      
      return breakPoint > 0 ? response.content.slice(0, breakPoint + 1) : truncated;
    }, [response.content, showFullContent]);

    const shouldShowButton = response.content && response.content.length > TRUNCATE_LENGTH;

    return (
      <Box sx={{ maxWidth: '100%', mt: 1, mb: 2 }}>
        <Paper
          elevation={1}
          sx={{
            p: 2,
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              color: theme.palette.text.secondary,
              mb: 1,
              wordBreak: 'break-all',
            }}
          >
            URL: <a href={response.url} target="_blank" rel="noopener noreferrer">{response.url}</a>
          </Typography>

          {response.error ? (
            <Alert severity="error" sx={{ mt: 1 }}>
              {response.error}
            </Alert>
          ) : (
            <>
              <Box
                sx={{
                  mt: 2,
                  '& a': {
                    color: theme.palette.primary.main,
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  },
                  '& p': {
                    margin: 0,
                    marginBottom: 1,
                  },
                }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ node, ...props }) => (
                      <a target="_blank" rel="noopener noreferrer" {...props} />
                    ),
                  }}
                >
                  {displayContent}
                </ReactMarkdown>
              </Box>
              
              {shouldShowButton && (
                <Button
                  onClick={() => setShowFullContent(!showFullContent)}
                  sx={{
                    mt: 2,
                    textTransform: 'none',
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover,
                    },
                  }}
                >
                  {showFullContent ? 'Show Less' : 'Show More'}
                </Button>
              )}
            </>
          )}

          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 2,
              color: response.status === 200 
                ? theme.palette.success.main 
                : theme.palette.error.main,
            }}
          >
            Status: {response.status}
          </Typography>
        </Paper>
      </Box>
    );
  } catch (error) {
    return (
      <Alert severity="error" sx={{ mt: 1 }}>
        Error parsing web browser response: {(error as Error).message}
      </Alert>
    );
  }
};

export default WebBrowserToolComponent;
