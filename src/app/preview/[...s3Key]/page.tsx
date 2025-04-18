"use client"

import React, { useState } from 'react';
import FileViewer from '@/components/FileViewer';
import { Button, Typography, Box, Paper, Stack } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

interface PageProps {
  params: {
    s3Key: string[];
  };
}

export default function FilePage({ params }: PageProps) {
  const s3Key = params.s3Key.join('/');
  const [fileUrl, setFileUrl] = useState<URL>();
  const isPdfYaml = s3Key.endsWith('.pdf.yaml');
  const pdfS3Key = isPdfYaml ? s3Key.replace('.yaml', '') : '';
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper elevation={1} sx={{ px: 3, py: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="h1" sx={{ 
            color: 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {s3Key}
          </Typography>
          {fileUrl && (
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<DownloadIcon />}
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = fileUrl.toString();
                  link.download = s3Key.split('/').pop() || '';
                  link.click();
                }}
              >
                Download
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<OpenInNewIcon />}
                onClick={() => window.open(fileUrl.toString(), '_blank')}
              >
                Open in New Tab
              </Button>
              {isPdfYaml && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={() => window.open(`/preview/${pdfS3Key}`, '_blank')}
                >
                  Open PDF
                </Button>
              )}
            </Stack>
          )}
        </Box>
      </Paper>
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <FileViewer s3Key={s3Key} onUrlChange={setFileUrl} />
      </Box>
    </Box>
  );
}
