"use client"
import React, { useState, useEffect } from 'react';
import { getUrl } from 'aws-amplify/storage';

interface FileViewerProps {
  s3Key: string;
  onUrlChange?: (url: URL | undefined) => void;
}

export default function FileViewer({ s3Key, onUrlChange }: FileViewerProps) {
  const [selectedFileUrl, setSelectedFileUrl] = useState<URL>();
  const [loading, setLoading] = useState<boolean>(true);
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
    }).then(async (response) => {
      setSelectedFileUrl(response.url);
      onUrlChange?.(response.url);

      // If it's a CSV file, fetch the content and display as text
      if (s3KeyDecoded.toLowerCase().endsWith('.csv')) {
        try {
          const csvResponse = await fetch(response.url);
          const text = await csvResponse.text();
          setFileContent(text);
        } catch (error) {
          console.error('Error fetching CSV content:', error);
          setError('Failed to load CSV content. Please try again later.');
        }
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

  // If it's a CSV file and we have the content, display it as pre-formatted text
  if (s3Key.toLowerCase().endsWith('.csv') && fileContent) {
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

  // For non-CSV files, use the iframe as before
  return (
    <div className="relative w-full h-full flex flex-col">
      <iframe
        src={selectedFileUrl?.toString()}
        className="w-full h-full"
        style={{
          border: 'none',
          margin: 0,
          padding: 0,
        }}
        title="File Viewer"
      />
    </div>
  );
}
