import React from 'react';
import { Theme } from '@mui/material/styles';
import { Typography } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import { Message } from '@/../utils/types';

interface ListFilesToolComponentProps {
  content: Message['content'];
  theme: Theme;
}

const ListFilesToolComponent: React.FC<ListFilesToolComponentProps> = ({ content, theme }) => {
  try {
    const listData = JSON.parse(content?.text || '{}');
    const path = listData.path || '';
    const directories = listData.directories || [];
    const files = listData.files || [];
    
    return (
      <div style={{
        backgroundColor: theme.palette.grey[50],
        padding: theme.spacing(2),
        borderRadius: theme.shape.borderRadius,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        width: '100%'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing(1),
          marginBottom: theme.spacing(1.5),
          color: theme.palette.primary.main
        }}>
          <DescriptionIcon />
          <Typography variant="subtitle1" fontWeight="medium">
            Contents of {path ? `"${path}"` : 'root directory'}
          </Typography>
        </div>
        
        {directories.length > 0 && (
          <div style={{ marginBottom: theme.spacing(2) }}>
            <Typography variant="subtitle2" style={{ color: theme.palette.primary.main, fontWeight: 'bold' }}>
              Directories:
            </Typography>
            <div style={{ 
              margin: theme.spacing(1, 0),
              maxHeight: directories.length > 10 ? '200px' : 'none',
              overflow: directories.length > 10 ? 'auto' : 'visible'
            }}>
              <ul style={{ paddingLeft: theme.spacing(3), margin: 0 }}>
                {directories.map((dir: string, i: number) => (
                  <li key={i} style={{ marginBottom: theme.spacing(0.5) }}>
                    <Typography variant="body2">
                      📁 {dir}/
                    </Typography>
                  </li>
                ))}
              </ul>
            </div>
            {directories.length > 10 && (
              <Typography variant="caption" color="textSecondary" style={{ fontStyle: 'italic', marginTop: theme.spacing(0.5) }}>
                Showing all {directories.length} directories (scroll to see more)
              </Typography>
            )}
          </div>
        )}
        
        {files.length > 0 && (
          <div>
            <Typography variant="subtitle2" style={{ color: theme.palette.primary.main, fontWeight: 'bold' }}>
              Files:
            </Typography>
            <div style={{ 
              margin: theme.spacing(1, 0),
              maxHeight: files.length > 10 ? '200px' : 'none',
              overflow: files.length > 10 ? 'auto' : 'visible'
            }}>
              <ul style={{ paddingLeft: theme.spacing(3), margin: 0 }}>
                {files.map((file: string, i: number) => (
                  <li key={i} style={{ marginBottom: theme.spacing(0.5) }}>
                    <Typography variant="body2">
                      📄 {file}
                    </Typography>
                  </li>
                ))}
              </ul>
            </div>
            {files.length > 10 && (
              <Typography variant="caption" color="textSecondary" style={{ fontStyle: 'italic', marginTop: theme.spacing(0.5) }}>
                Showing all {files.length} files (scroll to see more)
              </Typography>
            )}
          </div>
        )}
        
        {directories.length === 0 && files.length === 0 && (
          <Typography variant="body2" style={{ fontStyle: 'italic', color: theme.palette.text.secondary }}>
            No files or directories found.
          </Typography>
        )}
      </div>
    );
  } catch {
    return (
      <div style={{
        backgroundColor: theme.palette.grey[200],
        padding: theme.spacing(1),
        borderRadius: theme.shape.borderRadius,
      }}>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          List of files in the requested directory
        </Typography>
        <pre>
          {content?.text}
        </pre>
      </div>
    );
  }
};

export default ListFilesToolComponent; 