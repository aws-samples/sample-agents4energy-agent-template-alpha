"use client"

import outputs from '@/../amplify_outputs.json';
import { getUrl } from 'aws-amplify/storage';
import { Amplify } from 'aws-amplify';
import { useState, useEffect } from 'react';
import { useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PageProps {
  params: {
    s3Key: string[];
  };
}

export default function Page({ params }: PageProps) {
  const [fileResponse, setFileResponse] = useState<Response | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isMarkdown, setIsMarkdown] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    async function fetchFile() {
      try {
        const s3Key = params.s3Key.join('/');
        const s3KeyDecoded = s3Key.split('/').map((item: string) => decodeURIComponent(item)).join('/');

        // Check if file is markdown
        const fileExtension = s3KeyDecoded.split('.').pop()?.toLowerCase();
        const isMarkdownFile = fileExtension === 'md' || fileExtension === 'markdown';
        setIsMarkdown(isMarkdownFile);

        // Configure Amplify with storage configuration
        Amplify.configure(outputs, { ssr: true })

        // Get a signed URL using Amplify Storage
        const { url: signedUrl } = await getUrl({ path: s3KeyDecoded });

        console.log('Signed URL: ', signedUrl);

        const response = await fetch(signedUrl);
        setFileResponse(response);
        setFileContent(await response.text())
      } catch (err) {
        console.error('Error serving file:', err);
        setError(err instanceof Error ? err.message : String(err));
      }
    }

    fetchFile();
  }, [params.s3Key]); // Re-run when s3Key changes

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!fileResponse) {
    return <div>Loading file...</div>;
  }

  // Return the file response when available
  if (isMarkdown) {
    return (
      <div style={{ 
        height: '100vh', 
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
            {fileContent}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <iframe 
        ref={iframeRef}
        style={{ 
          height: '100%', 
          width: '100%', 
          border: 'none',
          flex: '1 1 auto',
          overflow: 'auto'
        }} 
        srcDoc={fileContent}
      />
    </div>
  )
}
