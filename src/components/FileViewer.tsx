"use client"
import React, { useState, useEffect } from 'react';
import { getUrl } from 'aws-amplify/storage';
import { CircularProgress } from '@mui/material';

interface FileViewerProps {
  s3Key: string;
  onUrlChange?: (url: URL | undefined) => void;
}

export default function FileViewer({ s3Key, onUrlChange }: FileViewerProps) {
  const [selectedFileUrl, setSelectedFileUrl] = useState<URL>();
  const [loading, setLoading] = useState<boolean>(true);
  const [iframeLoading, setIframeLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);

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
        
        // If it's a text-based file or CSV/XML, display as text
        if ((!s3KeyDecoded.toLowerCase().endsWith('.html') && contentType?.startsWith('text/')) || 
            contentType === 'application/octet-stream' ||
            s3KeyDecoded.toLowerCase().endsWith('.csv') || 
            s3KeyDecoded.toLowerCase().endsWith('.xml')) {
          const text = await fileResponse.text();
          setFileContent(text);
        }
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

  // If we have text content, display it
  if (fileContent) {
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
