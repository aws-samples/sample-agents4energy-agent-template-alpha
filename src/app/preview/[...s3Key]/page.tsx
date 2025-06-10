"use client"

import React, { useState, useEffect, use } from 'react';
import { uploadData } from 'aws-amplify/storage';
import FileViewer from '@/components/FileViewer';
import { Button, Typography, Box, Paper, Stack, Snackbar, Alert } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';

interface PageProps {
  params: Promise<{
    s3Key: string[];
  }>;
}

export default function FilePage(props: PageProps) {
  const params = use(props.params);
  const s3Key = params.s3Key.join('/');
  const s3KeyDecoded = s3Key.split('/').map((item: string) => decodeURIComponent(item)).join('/');
  const [fileUrl, setFileUrl] = useState<URL>();
  const [isEditMode, setIsEditMode] = useState(false);
  const [fileContent, setFileContent] = useState<string>('');
  const [contentType, setContentType] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const isPdfYaml = s3Key.endsWith('.pdf.yaml');
  const pdfS3Key = isPdfYaml ? s3Key.replace('.yaml', '') : '';

  const isEditableFile = () => {
    const editableTextTypes = [
      'text/plain', 
      'text/html', 
      'application/json', 
      'text/markdown', 
      'application/x-yaml'
    ];
    
    const editableExtensions = [
      'txt', 'md', 'json', 'yaml', 'yml', 'html'
    ];

    const fileExtension = s3Key.split('.').pop()?.toLowerCase();
    
    return (
      (contentType && editableTextTypes.some(type => contentType.startsWith(type))) || 
      (fileExtension && editableExtensions.includes(fileExtension))
    );
  };

  const handleSave = async () => {
    try {
      const blob = new Blob([fileContent], { 
        type: contentType || 'text/plain'
      });

      console.log('Uploading file to s3 key: ', s3KeyDecoded)
      
      await uploadData({
        path: s3KeyDecoded,
        data: blob,
        options: {
          contentType: contentType || 'text/plain'
        }
      }).result;

      setSaveStatus({
        open: true,
        message: 'File saved successfully',
        severity: 'success'
      });

      setIsEditMode(false);
    } catch (error) {
      console.error('File upload error:', error);
      setSaveStatus({
        open: true,
        message: 'Failed to save file',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSaveStatus(prev => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper elevation={1} sx={{ px: 3, py: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="h1" sx={{ 
            color: 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {s3KeyDecoded}
          </Typography>
          {fileUrl && (
            <Stack direction="row" spacing={2}>
              {!isEditMode ? (
                <>
                  {isEditableFile() && (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<EditIcon />}
                      onClick={() => setIsEditMode(true)}
                    >
                      Edit
                    </Button>
                  )}
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
                </>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                >
                  Save
                </Button>
              )}
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
        <FileViewer 
          s3Key={s3Key} 
          onUrlChange={setFileUrl} 
          isEditMode={isEditMode}
          onContentChange={setFileContent}
          content={fileContent}
          onContentTypeChange={setContentType}
        />
      </Box>
      <Snackbar
        open={saveStatus.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar}
          severity={saveStatus.severity}
          sx={{ width: '100%' }}
        >
          {saveStatus.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
