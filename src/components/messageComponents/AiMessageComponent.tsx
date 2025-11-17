import React, { useState } from 'react';
import { Theme } from '@mui/material/styles';
import { Typography, Button, Box } from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

import { Streamdown } from 'streamdown';
import RenderMarkdownCorrectLinks from '@/components/RenderMarkdownCorrectLinks'

import { stringify } from 'yaml';
import { Message } from '@/../utils/types';
import CopyButton from './CopyButton';

// Helper function to process document links
export function processDocumentLinks(content: string, chatSessionId: string): string {

  const originBasePath = process.env.ORIGIN_BASE_PATH || ""
  // // Get the origin from toolUtils
  // const origin = getOrigin() || '';

  // Function to process a path and return the full URL
  const getFullUrl = (filePath: string) => {
    // Only process relative paths that don't start with http/https/. If the path starts with /file/ it's already been processed.
    if (filePath.startsWith(`${originBasePath}/file/`) || filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }

    //Sometimes the agent incorrectly responds with ../ before the file path.
    // Remove all leading '../' sequences
    while (filePath.startsWith('../')) {
      filePath = filePath.slice(3);
    }

    // Handle global files differently
    if (filePath.startsWith('global/')) {
      return `${originBasePath}/file/${filePath}`;
    }

    // If the path starts with preview, assume it's a formated link to the preview page as returned by the textToTable tool.
    if (filePath.startsWith(`${originBasePath}/preview`)) {
      return filePath
    }

    // Construct the full asset path for session-specific files
    return `${originBasePath}/file/chatSessionArtifacts/sessionId=${chatSessionId}/${filePath}`;
  };

  // Regular expression to match href="path/to/file" patterns
  const linkRegex = /href="([^"]+)"/g;
  // Regular expression to match src="path/to/file" patterns in iframes
  const iframeSrcRegex = /<iframe[^>]*\ssrc="([^"]+)"[^>]*>/g;

  // First replace all href matches
  let processedContent = content.replace(linkRegex, (match, filePath) => {
    const fullPath = getFullUrl(filePath);
    return `href="${fullPath}"`;
  });

  // Then replace all iframe src matches
  processedContent = processedContent.replace(iframeSrcRegex, (match, filePath) => {
    const fullPath = getFullUrl(filePath);
    return match.replace(`src="${filePath}"`, `src="${fullPath}"`);
  });

  return processedContent;
}

interface AiMessageComponentProps {
  message: Message;
  theme: Theme;
}

const AiMessageComponent: React.FC<AiMessageComponentProps> = ({ message, theme }) => {
  const aiMessageStyle = {
    backgroundColor: theme.palette.grey[200],
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
  };

  const finalContent = processDocumentLinks(message.content?.text || '', message.chatSessionId || '');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%'
    }}>
      <div style={aiMessageStyle}>
        <RenderMarkdownCorrectLinks
          markdownText={message.content?.text || ""}
          chatSessionId={message.chatSessionId || ""}
        />
        {/* <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {message.content?.text}
        </ReactMarkdown> */}
        {message.toolCalls && message.toolCalls !== '[]' && (
          <div style={{
            backgroundColor: theme.palette.grey[100],
            padding: theme.spacing(1),
            borderRadius: theme.shape.borderRadius,
            marginTop: theme.spacing(1),
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Tool Calls
            </Typography>
            {JSON.parse(message.toolCalls).map((toolCall: { name: string, args: unknown, id: string }, index: number) => {
              // Track expanded state for each tool call
              const [expanded, setExpanded] = useState(false);

              // Parse and format the args to display
              let formattedArgs;
              try {
                formattedArgs = stringify(JSON.parse(JSON.stringify(toolCall.args)));
              } catch {
                formattedArgs = stringify(toolCall.args);
              }

              // Split into lines and limit to first 5 if not expanded
              const lines = formattedArgs.split('\n');
              const isLong = lines.length > 5;
              const displayLines = expanded ? lines : lines.slice(0, 5);

              return (
                <div key={toolCall.id || index} style={{
                  backgroundColor: theme.palette.common.white,
                  padding: theme.spacing(1),
                  borderRadius: theme.shape.borderRadius,
                  marginBottom: theme.spacing(1)
                }}>
                  <Typography variant="body2" color="primary" fontWeight="bold" style={{ display: 'flex', alignItems: 'center' }}>
                    <BuildIcon fontSize="small" style={{ marginRight: theme.spacing(0.5) }} />
                    {toolCall.name}
                  </Typography>
                  <div style={{
                    backgroundColor: theme.palette.grey[50],
                    padding: theme.spacing(1),
                    borderRadius: theme.shape.borderRadius,
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    marginTop: theme.spacing(0.5)
                  }}>
                    <pre>
                      {displayLines.join('\n')}
                      {isLong && !expanded && '...'}
                    </pre>
                    {isLong && (
                      <Button
                        size="small"
                        onClick={() => setExpanded(!expanded)}
                        startIcon={expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                        style={{
                          marginTop: theme.spacing(0.5),
                          fontSize: '0.75rem',
                          textTransform: 'none'
                        }}
                      >
                        {expanded ? 'Show Less' : 'Show More'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 0.5 }}>
        <CopyButton text={message.content?.text || ''} />
      </Box>
    </div>
  );
};

export default AiMessageComponent; 