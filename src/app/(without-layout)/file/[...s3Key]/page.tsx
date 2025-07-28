"use client"

import outputs from '@/../amplify_outputs.json';
import { getUrl } from 'aws-amplify/storage';
import { Amplify } from 'aws-amplify';
import { useState, useEffect } from 'react';
import { useRef } from 'react';

interface PageProps {
  params: {
    s3Key: string[];
  };
}

export default function Page({ params }: PageProps) {
  const [fileResponse, setFileResponse] = useState<Response | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    async function fetchFile() {
      try {
        const s3Key = params.s3Key.join('/');
        const s3KeyDecoded = s3Key.split('/').map((item: string) => decodeURIComponent(item)).join('/');

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
