import React, { useState } from 'react';
import { 
  Drawer, 
  Box, 
  Typography, 
  IconButton, 
  Divider,
  useTheme,
  useMediaQuery,
  Paper,
  Stack,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import { uploadData, remove } from '@aws-amplify/storage';
import FolderIcon from '@mui/icons-material/Folder';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DeleteIcon from '@mui/icons-material/Delete';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';

import FileExplorer from './FileExplorer';
import FileViewer from './FileViewer';
import { useFileSystem } from '@/contexts/FileSystemContext';

interface FileItem {
  key: string;
  path: string;
  isFolder: boolean;
  name: string;
  url?: string;
  children?: FileItem[];
}

interface FileDrawerProps {
  open: boolean;
  onClose: () => void;
  chatSessionId: string;
  variant?: 'temporary' | 'persistent' | 'permanent';
}

const FileDrawer: React.FC<FileDrawerProps> = ({ 
  open, 
  onClose, 
  chatSessionId
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // File extensions to icon mapping
  const fileIcons: Record<string, React.ReactNode> = {
    '.txt': <InsertDriveFileIcon style={{ color: '#2196f3' }} />,
    '.pdf': <InsertDriveFileIcon style={{ color: '#f44336' }} />,
    '.png': <InsertDriveFileIcon style={{ color: '#4caf50' }} />,
    '.jpg': <InsertDriveFileIcon style={{ color: '#4caf50' }} />,
    '.jpeg': <InsertDriveFileIcon style={{ color: '#4caf50' }} />,
    '.gif': <InsertDriveFileIcon style={{ color: '#4caf50' }} />,
    '.csv': <InsertDriveFileIcon style={{ color: '#ff9800' }} />,
    '.json': <InsertDriveFileIcon style={{ color: '#9c27b0' }} />,
    '.md': <InsertDriveFileIcon style={{ color: '#795548' }} />,
    '.html': <InsertDriveFileIcon style={{ color: '#e91e63' }} />,
    '.js': <InsertDriveFileIcon style={{ color: '#ffc107' }} />,
    '.css': <InsertDriveFileIcon style={{ color: '#03a9f4' }} />,
  };

  // Helper function to get file icon based on extension
  const getFileIcon = (fileName: string) => {
    const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    return fileIcons[extension] || <InsertDriveFileIcon />;
  };
  
  // State for the currently selected file to preview
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [showUploadMessage, setShowUploadMessage] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  
  // Use the file system context to trigger refreshes
  const { refreshFiles } = useFileSystem();
  
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  
  // New folder creation state
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  
  // Handle file selection for preview
  const handleFileSelect = (file: FileItem) => {
    if (!file.isFolder) {
      setSelectedFile(file);
    }
  };

  // Add function to update current path
  const handlePathChange = (path: string) => {
    setCurrentPath(path);
  };

  const handleDeleteClick = (file: FileItem) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;

    try {
      await remove({ path: fileToDelete.key });
      setSelectedFile(null);
      refreshFiles();
      setDeleteDialogOpen(false);
      setFileToDelete(null);
      setUploadMessage('File deleted successfully');
      setShowUploadMessage(true);
    } catch (error) {
      console.error('Error deleting file:', error);
      setUploadMessage('Failed to delete file. Please try again.');
      setShowUploadMessage(true);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadMessage('Uploading files...');
    setShowUploadMessage(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Include the current path in the upload key
        const uploadPath = currentPath ? `${currentPath}${file.name}` : file.name;
        const key = `chatSessionArtifacts/sessionId=${chatSessionId}/${uploadPath}`;
        
        await uploadData({
          path: key,
          data: file,
          options: {
            contentType: file.type
          }
        });
      });

      await Promise.all(uploadPromises);
      setUploadMessage('Files uploaded successfully');
      
      // Add a small delay before refreshing to allow S3 to propagate changes
      setTimeout(() => {
        refreshFiles();
      }, 1000);
    } catch (error) {
      console.error('Error uploading files:', error);
      setUploadMessage('Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  // Handle closing upload message
  const handleCloseUploadMessage = () => {
    setShowUploadMessage(false);
  };
  
  // Adjust drawer width for non-mobile screens to allow chat visibility
  const drawerWidth = isMobile ? '100%' : '45%';

  // Handle folder creation
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    setUploadMessage('Creating folder...');
    setShowUploadMessage(true);

    try {
      const key = `chatSessionArtifacts/sessionId=${chatSessionId}/${newFolderName.trim()}/`;
      
      // Create an empty object with key ending in '/' to represent a folder
      await uploadData({
        path: key,
        data: new Blob([]),
        options: {
          contentType: 'application/x-directory'
        }
      });

      setUploadMessage('Folder created successfully');
      setCreateFolderDialogOpen(false);
      setNewFolderName('');
      
      // Add a small delay before refreshing to allow S3 to propagate changes
      setTimeout(() => {
        refreshFiles();
      }, 1000);
    } catch (error) {
      console.error('Error creating folder:', error);
      setUploadMessage('Failed to create folder. Please try again.');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  return (
    <>
      {/* Use a fixed position div instead of Drawer for desktop to avoid modal behavior */}
      {!isMobile && open ? (
        <Box
          sx={{
            position: 'fixed',
            top: 64, // Start below TopNavBar
            right: 0,
            width: drawerWidth,
            height: 'calc(100% - 64px)',
            backgroundColor: 'background.paper',
            boxShadow: '-8px 0 20px rgba(0,0,0,0.1)',
            zIndex: theme.zIndex.drawer,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderLeft: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1.5,
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              borderBottom: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FolderIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
              <Typography variant="h6" fontWeight="500" noWrap>
                Session Files
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <input
                accept="*/*"
                style={{ display: 'none' }}
                id="file-upload"
                multiple
                type="file"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <label htmlFor="file-upload">
                <Button
                  component="span"
                  startIcon={<UploadFileIcon />}
                  variant="contained"
                  color="primary"
                  disabled={isUploading}
                  sx={{ 
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    '&:hover': {
                      backgroundColor: theme.palette.primary.dark,
                    },
                    '&.Mui-disabled': {
                      backgroundColor: 'action.disabledBackground',
                    },
                    borderRadius: '6px',
                    textTransform: 'none',
                    boxShadow: 'none',
                  }}
                >
                  Upload
                </Button>
              </label>
              <Button
                startIcon={<CreateNewFolderIcon />}
                variant="outlined"
                color="primary"
                onClick={() => setCreateFolderDialogOpen(true)}
                disabled={isCreatingFolder}
                sx={{ 
                  borderRadius: '6px',
                  textTransform: 'none',
                  boxShadow: 'none',
                }}
              >
                New Folder
              </Button>
              <IconButton
                onClick={onClose}
                sx={{ 
                  color: theme.palette.text.secondary,
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.04)',
                  },
                }}
                size="small"
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
          
          <Divider />
          
          <Box sx={{ 
            height: 'calc(100% - 64px)', // Subtract header height
            overflow: 'hidden',
            backgroundColor: theme.palette.background.default,
          }}>
            {/* Split view for larger devices using Stack instead of Grid2 */}
            <Stack 
              direction="row" 
              sx={{ height: '100%' }}
              divider={<Divider orientation="vertical" flexItem />}
            >
              <Box sx={{ width: '40%', height: '100%', overflow: 'auto', p: 2, backgroundColor: theme.palette.background.default }}>
                <FileExplorer 
                  chatSessionId={chatSessionId} 
                  onFileSelect={handleFileSelect}
                  onPathChange={handlePathChange}
                />
              </Box>
              <Box sx={{ width: '60%', height: '100%', overflow: 'auto', p: 2, backgroundColor: theme.palette.background.paper }}>
                {selectedFile ? (
                  <>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start', 
                      mb: 2,
                      p: 2,
                      borderRadius: '8px',
                      bgcolor: theme.palette.background.default,
                      border: `1px solid ${theme.palette.divider}`,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      '&:hover': {
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        transition: 'box-shadow 0.2s ease-in-out'
                      }
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flex: 1, minWidth: 0 }}>
                        <InsertDriveFileIcon sx={{ color: theme.palette.primary.main, mt: 0.5 }} />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="subtitle1" sx={{ 
                            fontWeight: 500,
                            color: theme.palette.text.primary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {selectedFile.name}
                          </Typography>
                          <Typography variant="caption" sx={{ 
                            color: theme.palette.text.secondary,
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {selectedFile.path}
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteClick(selectedFile)}
                        sx={{
                          ml: 1,
                          flexShrink: 0,
                          '&:hover': {
                            backgroundColor: `${theme.palette.error.light}20`,
                          },
                          transition: 'background-color 0.2s ease-in-out'
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <FileViewer
                      s3Key={selectedFile.key}
                    />
                  </>
                ) : (
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      bgcolor: theme.palette.background.paper,
                      p: 3,
                      textAlign: 'center',
                      borderRadius: '8px',
                      border: '1px dashed rgba(0,0,0,0.12)',
                    }}
                  >
                    <Typography color="textSecondary">
                      Select a file to preview its contents
                    </Typography>
                  </Paper>
                )}
              </Box>
            </Stack>
          </Box>

          {/* Upload status message */}
          <Snackbar 
            open={showUploadMessage} 
            autoHideDuration={isUploading ? null : 4000}
            onClose={handleCloseUploadMessage}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert 
              onClose={handleCloseUploadMessage} 
              severity={isUploading ? "info" : "success"} 
              sx={{ 
                width: '100%',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                borderRadius: '8px',
              }}
              icon={isUploading ? <CircularProgress size={20} /> : undefined}
            >
              {uploadMessage}
            </Alert>
          </Snackbar>
        </Box>
      ) : (
        /* Use the regular Material-UI Drawer for mobile only */
        <Drawer
          anchor="right"
          open={open && isMobile}
          onClose={onClose}
          variant="temporary"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              top: 64,
              height: 'calc(100% - 64px)',
              zIndex: theme.zIndex.drawer,
              boxShadow: '-8px 0 20px rgba(0,0,0,0.1)',
              borderLeft: '1px solid rgba(0,0,0,0.08)',
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1.5,
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              borderBottom: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FolderIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
              <Typography variant="h6" fontWeight="500" noWrap>
                Session Files
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <input
                accept="*/*"
                style={{ display: 'none' }}
                id="file-upload-mobile"
                multiple
                type="file"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <label htmlFor="file-upload-mobile">
                <Button
                  component="span"
                  startIcon={<UploadFileIcon />}
                  variant="contained"
                  color="primary"
                  disabled={isUploading}
                  sx={{ 
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    '&:hover': {
                      backgroundColor: theme.palette.primary.dark,
                    },
                    '&.Mui-disabled': {
                      backgroundColor: 'action.disabledBackground',
                    },
                    borderRadius: '6px',
                    textTransform: 'none',
                    boxShadow: 'none',
                  }}
                >
                  Upload
                </Button>
              </label>
              <Button
                startIcon={<CreateNewFolderIcon />}
                variant="outlined"
                color="primary"
                onClick={() => setCreateFolderDialogOpen(true)}
                disabled={isCreatingFolder}
                sx={{ 
                  borderRadius: '6px',
                  textTransform: 'none',
                  boxShadow: 'none',
                }}
              >
                New Folder
              </Button>
              <IconButton
                onClick={onClose}
                sx={{ 
                  color: theme.palette.text.secondary,
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.04)',
                  },
                }}
                size="small"
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
          
          <Divider />
          
          <Box sx={{ 
            height: 'calc(100% - 64px)', // Subtract header height
            overflow: 'hidden',
            backgroundColor: theme.palette.background.default,
          }}>
            {/* Stack view for small devices */}
            <Box sx={{ height: '100%' }}>
              {selectedFile ? (
                // Show file preview with back button on small screens
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ p: 1.5, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                    <Button 
                      onClick={() => setSelectedFile(null)} 
                      startIcon={<FolderIcon />} 
                      variant="text"
                      sx={{ 
                        textTransform: 'none',
                        color: theme.palette.primary.main,
                      }}
                    >
                      Back to files
                    </Button>
                  </Box>
                  <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, backgroundColor: theme.palette.background.paper }}>
                    {selectedFile && (
                      <FileViewer
                        s3Key={selectedFile.key}
                      />
                    )}
                  </Box>
                </Box>
              ) : (
                // Show file explorer
                <Box sx={{ height: '100%', overflow: 'auto', p: 2, backgroundColor: theme.palette.background.default }}>
                  <FileExplorer 
                    chatSessionId={chatSessionId} 
                    onFileSelect={handleFileSelect}
                    onPathChange={handlePathChange}
                  />
                </Box>
              )}
            </Box>
          </Box>

          {/* Upload status message */}
          <Snackbar 
            open={showUploadMessage} 
            autoHideDuration={isUploading ? null : 4000}
            onClose={handleCloseUploadMessage}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert 
              onClose={handleCloseUploadMessage} 
              severity={isUploading ? "info" : "success"} 
              sx={{ 
                width: '100%',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                borderRadius: '8px',
              }}
              icon={isUploading ? <CircularProgress size={20} /> : undefined}
            >
              {uploadMessage}
            </Alert>
          </Snackbar>
        </Drawer>
      )}

      {/* Delete confirmation dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            }
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleDeleteConfirm();
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>Delete File</DialogTitle>
        <DialogContent sx={{ py: 2, mt: 1 }}>
          <Typography>
            Are you sure you want to delete <strong>{fileToDelete?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            sx={{ 
              textTransform: 'none',
              borderRadius: '6px',
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            sx={{ 
              textTransform: 'none',
              borderRadius: '6px',
              boxShadow: 'none',
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create folder dialog */}
      <Dialog 
        open={createFolderDialogOpen} 
        onClose={() => !isCreatingFolder && setCreateFolderDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>Create New Folder</DialogTitle>
        <DialogContent sx={{ py: 2, mt: 1 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Folder Name"
            type="text"
            fullWidth
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            disabled={isCreatingFolder}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newFolderName.trim()) {
                handleCreateFolder();
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setCreateFolderDialogOpen(false)}
            variant="outlined"
            disabled={isCreatingFolder}
            sx={{ 
              textTransform: 'none',
              borderRadius: '6px',
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateFolder}
            color="primary" 
            variant="contained"
            disabled={!newFolderName.trim() || isCreatingFolder}
            sx={{ 
              textTransform: 'none',
              borderRadius: '6px',
              boxShadow: 'none',
            }}
          >
            {isCreatingFolder ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Create'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FileDrawer; 