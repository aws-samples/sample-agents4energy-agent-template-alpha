"use client"
import React, { useState, useEffect } from 'react';
import { getUrl } from 'aws-amplify/storage';
import { CircularProgress } from '@mui/material';
import AceEditor from 'react-ace';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-yaml';
import 'ace-builds/src-noconflict/mode-html';
import 'ace-builds/src-noconflict/mode-text';
import 'ace-builds/src-noconflict/theme-github';

interface FileViewerProps {
  s3Key: string;
  onUrlChange?: (url: URL | undefined) => void;
  isEditMode?: boolean;
  onContentChange?: (content: string) => void;
  onContentTypeChange?: (contentType: string | null) => void;
  content?: string;
}

export default function FileViewer({
  s3Key,
  onUrlChange,
  isEditMode = false,
  onContentChange,
  onContentTypeChange,
  content
}: FileViewerProps) {
  const [selectedFileUrl, setSelectedFileUrl] = useState<URL>();
  const [loading, setLoading] = useState<boolean>(true);
  const [iframeLoading, setIframeLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileContentType, setFileContentType] = useState<string | null>(null);

  const fileExtension = s3Key.split('.').pop()?.toLowerCase() || 'text';
  const isHtmlFile = fileExtension === 'html';
  const isMarkdownFile = fileExtension === 'md' || fileExtension === 'markdown';

  useEffect(() => {
    console.log('s3Key: ', s3Key);

    if (!s3Key) {
      setError('Invalid file path');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const s3KeyDecoded = s3Key.split('/').map((item: string) => decodeURIComponent(item)).join('/');
    console.log('getting file from s3 Key: ', s3KeyDecoded);

    getUrl({
      path: s3KeyDecoded,
    }).then(async (response: { url: URL }) => {
      setSelectedFileUrl(response.url);
      onUrlChange?.(response.url);

      try {
        // Check the content type
        const fileResponse = await fetch(response.url);
        const contentType = fileResponse.headers.get('Content-Type');
        setFileContentType(contentType)

        // Pass content type back to parent
        onContentTypeChange?.(contentType);

        const text = await fileResponse.text()
        setFileContent(text)

        // If content is not already set, set it for edit mode
        if (!content) {
          onContentChange?.(text);
        }

        // // If it's a text-based file or CSV/XML/HTML, display as text
        // if (contentType?.startsWith('text/') || 
        //     contentType === 'application/octet-stream' ||
        //     ['csv', 'xml', 'json', 'txt', 'md', 'html'].includes(s3KeyDecoded.split('.').pop()?.toLowerCase() || '')
        //   ) {
        //   const text = await fileResponse.text();
        //   setFileContent(text);
        //   // If content is not already set, set it for edit mode
        //   if (!content) {
        //     onContentChange?.(text);
        //   }
        // } else {
        //   setFileContent(null);
        // }
      } catch (error) {
        console.error('Error fetching file content:', error);
        setError('Failed to load file content. Please try again later.');
      }

      setLoading(false);
    }).catch((error) => {
      console.error('Error fetching file:', error);
      setError('Failed to load file. Please try again later.');
      setLoading(false);
    });
  }, [s3Key, onUrlChange]);

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading file...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-full text-red-500">{error}</div>;
  }

  if (!selectedFileUrl) {
    return <div className="flex justify-center items-center h-full">No file selected</div>;
  }

  // For HTML files, render differently based on edit mode
  if (isHtmlFile) {
    if (isEditMode) {
      return (
        <div className="relative w-full h-full flex flex-col">
          <AceEditor
            mode="html"
            theme="github"
            name="file-editor"
            value={content || fileContent || ''}
            onChange={onContentChange}
            width="100%"
            height="100%"
            fontSize={14}
            showPrintMargin={false}
            showGutter={true}
            highlightActiveLine={true}
            setOptions={{
              enableBasicAutocompletion: true,
              enableLiveAutocompletion: true,
              enableSnippets: true,
              showLineNumbers: true,
              tabSize: 2,
            }}
          />
        </div>
      );
    }

    // Render HTML files in iframe when not in edit mode
    return (
      <div className="w-full h-full relative">
        {iframeLoading && (
          <div className="absolute inset-0 flex justify-center items-center bg-white bg-opacity-75 z-10">
            <CircularProgress />
          </div>
        )}

        <iframe
          srcDoc={fileContent || ""}
          // src={selectedFileUrl?.toString()}
          className="w-full h-full"
          style={{
            border: 'none',
            margin: 0,
            padding: 0,
          }}
          title="File Viewer"
          onLoad={() => setIframeLoading(false)}
        />
      </div>
    );
  }

  // If we have text content for non-HTML files, display it
  if (
    fileContentType?.startsWith('text/') ||
    fileContentType === 'application/octet-stream' ||
    ['csv', 'xml', 'json', 'txt', 'md', 'html'].includes(fileExtension)
  ) {
    console.log('Rendering text content');

    // Determine the editor mode based on file extension
    let editorMode = 'text';
    if (fileExtension === 'js' || fileExtension === 'jsx' || fileExtension === 'ts' || fileExtension === 'tsx') {
      editorMode = 'javascript';
    } else if (fileExtension === 'json') {
      editorMode = 'json';
    } else if (fileExtension === 'yaml' || fileExtension === 'yml') {
      editorMode = 'yaml';
    }

    if (isEditMode) {
      return (
        <div className="relative w-full h-full flex flex-col">
          <AceEditor
            mode={editorMode}
            theme="github"
            name="file-editor"
            value={content || fileContent || ''}
            onChange={onContentChange}
            width="100%"
            height="100%"
            fontSize={14}
            showPrintMargin={false}
            showGutter={true}
            highlightActiveLine={true}
            setOptions={{
              enableBasicAutocompletion: true,
              enableLiveAutocompletion: true,
              enableSnippets: true,
              showLineNumbers: true,
              tabSize: 2,
            }}
          />
        </div>
      );
    }

    // For markdown files, use ReactMarkdown with custom styling
    if (isMarkdownFile) {
      return (
        <div style={{ 
          height: '100%', 
          width: '100%', 
          overflow: 'auto', 
          padding: '20px',
          backgroundColor: '#ffffff',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          lineHeight: '1.6',
          color: '#333333'
        }}>
          <div style={{
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                // Custom styling for markdown elements
                h1: ({children}) => <h1 style={{borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px'}}>{children}</h1>,
                h2: ({children}) => <h2 style={{borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '16px'}}>{children}</h2>,
                h3: ({children}) => <h3 style={{marginBottom: '12px'}}>{children}</h3>,
                p: ({children}) => <p style={{marginBottom: '16px'}}>{children}</p>,
                ul: ({children}) => <ul style={{marginBottom: '16px', paddingLeft: '20px'}}>{children}</ul>,
                ol: ({children}) => <ol style={{marginBottom: '16px', paddingLeft: '20px'}}>{children}</ol>,
                li: ({children}) => <li style={{marginBottom: '4px'}}>{children}</li>,
                blockquote: ({children}) => <blockquote style={{borderLeft: '4px solid #ddd', paddingLeft: '16px', margin: '16px 0', fontStyle: 'italic', color: '#666'}}>{children}</blockquote>,
                code: ({children}) => <code style={{backgroundColor: '#f6f8fa', padding: '2px 4px', borderRadius: '3px', fontSize: '0.9em', fontFamily: 'Monaco, Consolas, "Liberation Mono", "Courier New", monospace'}}>{children}</code>,
                pre: ({children}) => <pre style={{backgroundColor: '#f6f8fa', padding: '16px', borderRadius: '6px', overflow: 'auto', fontSize: '0.9em', fontFamily: 'Monaco, Consolas, "Liberation Mono", "Courier New", monospace', marginBottom: '16px'}}>{children}</pre>,
                table: ({children}) => <table style={{borderCollapse: 'collapse', width: '100%', marginBottom: '16px'}}>{children}</table>,
                th: ({children}) => <th style={{border: '1px solid #ddd', padding: '8px', backgroundColor: '#f6f8fa', textAlign: 'left'}}>{children}</th>,
                td: ({children}) => <td style={{border: '1px solid #ddd', padding: '8px'}}>{children}</td>,
                a: ({children, href}) => <a href={href} style={{color: '#0366d6', textDecoration: 'none'}} onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}>{children}</a>
              }}
            >
              {content || fileContent || ''}
            </ReactMarkdown>
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full flex flex-col">
        <pre
          className="w-full h-full overflow-auto p-4 whitespace-pre font-mono text-sm"
          style={{
            backgroundColor: '#f5f5f5',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
          }}
        >
          {fileContent}
        </pre>
      </div>
    );
  }

  // For non-text files, use the iframe as before
  return (
    <div className="w-full h-full relative">
      {iframeLoading && (
        <div className="absolute inset-0 flex justify-center items-center bg-white bg-opacity-75 z-10">
          <CircularProgress />
        </div>
      )}
      <iframe
        src={selectedFileUrl?.toString()}
        className="w-full h-full"
        style={{
          border: 'none',
          margin: 0,
          padding: 0,
        }}
        title="File Viewer"
        onLoad={() => setIframeLoading(false)}
      />
    </div>
  );
}
