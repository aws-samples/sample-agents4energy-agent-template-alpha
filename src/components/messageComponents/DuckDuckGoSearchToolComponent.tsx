import React from 'react';
import { Theme } from '@mui/material/styles';
import { Typography, Paper, Box } from '@mui/material';
import { Message } from '@/../utils/types';

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

interface DuckDuckGoSearchToolComponentProps {
  content: Message['content'];
  theme: Theme;
}

const DuckDuckGoSearchToolComponent: React.FC<DuckDuckGoSearchToolComponentProps> = ({ content, theme }) => {
  try {
    const searchResults: SearchResult[] = JSON.parse(content?.text || '[]');

    if (!searchResults.length) {
      return (
        <Typography variant="body1" color="text.secondary">
          No search results found.
        </Typography>
      );
    }

    return (
      <Box sx={{ maxWidth: '100%', mt: 1, mb: 2 }}>
        {searchResults.map((result, index) => (
          <Box
            key={index}
            onClick={() => window.open(result.link, '_blank', 'noopener,noreferrer')}
            sx={{
              cursor: 'pointer',
              mb: 2,
              '&:hover': {
                '& .MuiPaper-root': {
                  backgroundColor: theme.palette.action.hover,
                  transform: 'translateY(-1px)',
                  boxShadow: theme.shadows[2],
                },
              },
            }}
          >
            <Paper
              elevation={1}
              sx={{
                p: 2,
                backgroundColor: theme.palette.background.paper,
                transition: theme.transitions.create(['background-color', 'transform', 'box-shadow'], {
                  duration: theme.transitions.duration.short,
                }),
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  color: theme.palette.primary.main,
                  fontWeight: 'medium',
                  mb: 0.5,
                }}
              >
                {result.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.875rem',
                  mb: 0.5,
                  color: theme.palette.success.main,
                }}
              >
                {result.link}
              </Typography>
              <Typography
                variant="body2"
                dangerouslySetInnerHTML={{ __html: result.snippet }}
                sx={{
                  color: theme.palette.text.secondary,
                  '& b': {
                    color: theme.palette.text.primary,
                    fontWeight: 'medium',
                  },
                }}
              />
            </Paper>
          </Box>
        ))}
      </Box>
    );
  } catch (error) {
    return (
      <Typography variant="body1" color="error">
        Error parsing search results: {(error as Error).message}
      </Typography>
    );
  }
};

export default DuckDuckGoSearchToolComponent;
