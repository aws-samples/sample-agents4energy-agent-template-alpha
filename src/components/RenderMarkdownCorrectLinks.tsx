"use client"
import React from 'react';
import { Streamdown, defaultRehypePlugins } from 'streamdown';
import { harden } from 'rehype-harden';

interface RenderMarkdownCorrectLinksProps {
  markdownText: string;
  chatSessionId: string;
}

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
  // Regular expression to match markdown links [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

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

  // Finally replace all markdown link matches
  processedContent = processedContent.replace(markdownLinkRegex, (match, linkText, filePath) => {
    const fullPath = getFullUrl(filePath);
    return `[${linkText}](${fullPath})`;
  });

  return processedContent;
}

const RenderMarkdownCorrectLinks: React.FC<RenderMarkdownCorrectLinksProps> = ({ markdownText, chatSessionId }) => {
  const finalContent = processDocumentLinks(markdownText, chatSessionId);

  return (
    <Streamdown
      rehypePlugins={[
        defaultRehypePlugins.raw,
        defaultRehypePlugins.katex,
        [
          harden,
          {
            defaultOrigin: 'https://streamdown.ai',
            allowedLinkPrefixes: [
              'https://streamdown.ai',
              'https://github.com',
              'https://vercel.com',
            ],
          },
        ],
      ]}
    >
      {finalContent}
    </Streamdown>
  )
};

export default RenderMarkdownCorrectLinks;
