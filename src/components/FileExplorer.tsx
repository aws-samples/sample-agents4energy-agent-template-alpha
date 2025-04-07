import React, { useState, useEffect, useRef, useCallback } from 'react';
import { list, getUrl } from 'aws-amplify/storage';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  IconButton,
  Breadcrumbs,
  Link as MuiLink,
  Badge,
  Tooltip,
  Snackbar,
  Alert,
  Dialog
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { styled } from '@mui/material/styles';
import FileViewer from './FileViewer';
import { useFileSystem } from '@/contexts/FileSystemContext';

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

// Interface for file/folder items
interface FileItem {
  key: string;
  path: string;
  isFolder: boolean;
  name: string;
  url?: string;
  children?: FileItem[];
  lastRefreshTime?: number; // Make it optional for backward compatibility
}

interface FileExplorerProps {
  chatSessionId: string;
  onFileSelect?: (file: FileItem) => void;
}

const StyledListItem = styled(ListItemButton)({
  borderRadius: 8,
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  marginBottom: 4,
  paddingRight: 48,
});

const FileExplorer: React.FC<FileExplorerProps> = ({ chatSessionId, onFileSelect }) => {
  const { lastRefreshTime, isRefreshing } = useFileSystem();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileStructure, setFileStructure] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [breadcrumbs, setBreadcrumbs] = useState<{ name: string, path: string }[]>([]);

  // File preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  // Download status state
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState('');
  const [showDownloadMessage, setShowDownloadMessage] = useState(false);

  // Ref to track if a refresh is in progress
  const loadingRef = useRef(false);

  // Base path for the chat session artifacts
  const basePath = `chatSessionArtifacts/sessionId=${chatSessionId}/`;

  // Function to load files and folders
  const loadFiles = useCallback(async (path: string = '', forceRefresh: boolean = false) => {


    // Only prevent concurrent loads if not forcing a refresh
    if (loadingRef.current && !forceRefresh) return;

    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      console.log(`Loading files for path: ${path}`);
      const fullPath = path ? `${basePath}${path}` : basePath;
      console.log(`Full path: ${fullPath}`);
      const result = await list({
        path: fullPath,
        options: {
          subpathStrategy: { strategy: 'exclude' }
        },
      });
      console.log(`Result: `, result);
      // Process the results to create a hierarchical structure
      const items: FileItem[] = [];

      for (const folderPath of result.excludedSubpaths || []) {
        // Extract the last segment from the path, handling trailing slashes
        const pathWithoutTrailingSlash = folderPath.endsWith('/') ? folderPath.slice(0, -1) : folderPath;
        const folderName = pathWithoutTrailingSlash.split('/').pop() || '';
        items.push({
          key: folderPath,
          path: folderPath.replace(basePath, ''),
          isFolder: true,
          name: folderName,
        });
      }

      for (const item of result.items) {
        // Extract key from path
        const itemPath = item.path;
        if (!itemPath) continue;

        const isFolder = itemPath.endsWith('/');

        if (isFolder) continue;

        // Remove trailing slash for folders before getting the name
        const pathForName = isFolder ? itemPath.slice(0, -1) : itemPath;
        const name = pathForName.split('/').pop() || '';

        // Skip .s3meta files
        if (name.endsWith('.s3meta')) continue;

        let url = '';
        if (!isFolder) {
          try {
            // Get the file URL without modifying it
            const fileUrl = await getUrl({ path: itemPath });
            url = fileUrl.url.toString();
            // Don't add cache busting params to the URL - this causes 403 errors
            // We'll handle cache busting in the component that uses the URL
          } catch (e) {
            console.error(`Error getting URL for ${itemPath}:`, e);
          }
        }

        items.push({
          key: itemPath,
          path: itemPath.replace(basePath, ''),
          isFolder,
          name,
          url,
          lastRefreshTime: Date.now(), // Store the current timestamp to help with cache busting
        });
      }

      // Sort items - folders first, then files
      items.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      });

      setFileStructure(items);

      // Update breadcrumbs
      if (path) {
        const parts = path.split('/').filter(Boolean);
        const newBreadcrumbs = parts.map((part, index) => {
          const pathUpToThis = parts.slice(0, index + 1).join('/');
          return { name: part, path: pathUpToThis };
        });

        setBreadcrumbs([{ name: 'Home', path: '' }, ...newBreadcrumbs]);
      } else {
        setBreadcrumbs([{ name: 'Home', path: '' }]);
      }

      console.log(`File structure loaded for path: ${path}`);
      console.log(items);

    } catch (err) {
      console.error('Error loading files:', err);
      setError('Failed to load files. Please try again later.');
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [basePath]);

  // Load files when component mounts or when current path changes
  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath, chatSessionId, loadFiles]);

  // Reload files when lastRefreshTime changes
  useEffect(() => {
    if (lastRefreshTime > 0) {
      loadFiles(currentPath, true); // Force refresh when triggered by lastRefreshTime
    }
  }, [lastRefreshTime, currentPath, loadFiles]);

  // Handle folder click
  const handleFolderClick = (folder: FileItem) => {
    // Navigate into the folder
    const relativePath = folder.path;
    setCurrentPath(relativePath);
  };

  // Handle file click
  const handleFileClick = (file: FileItem) => {
    if (!file.isFolder && file.url) {
      // Call onFileSelect if provided
      if (onFileSelect) {
        onFileSelect(file);
      } else {
        setSelectedFile(file);
        setPreviewOpen(true);
      }
    }
  };

  // Navigate to a specific breadcrumb
  const handleBreadcrumbClick = (path: string) => {
    setCurrentPath(path);
  };

  // Go back to parent folder
  const handleBackClick = () => {
    const parts = currentPath.split('/').filter(Boolean);
    if (parts.length === 0) return; // Already at root

    const parentPath = parts.slice(0, parts.length - 1).join('/');
    setCurrentPath(parentPath);
  };

  // Refresh current directory
  const handleRefresh = () => {
    loadFiles(currentPath);
  };

  // Close file preview
  const handleClosePreview = () => {
    setPreviewOpen(false);
    setSelectedFile(null);
  };

  // Handle opening a file in a new tab
  const handleFileOpen = (event: React.MouseEvent<HTMLButtonElement>, file: FileItem) => {
    event.stopPropagation(); // Prevent triggering file click
    if (file.url) {
      // Open in a new tab instead of downloading
      window.open(file.url, '_blank');

      setDownloadMessage(`Opened ${file.name} in a new tab`);
      setShowDownloadMessage(true);
    }
  };

  // Helper function to recursively get all files in a folder and its subfolders
  const getAllFilesInFolder = async (folderPath: string): Promise<FileItem[]> => {
    try {
      const fullPath = `${basePath}${folderPath}`;
      const result = await list({ path: fullPath });

      let allFiles: FileItem[] = [];

      for (const item of result.items) {
        const itemPath = item.path;
        if (!itemPath) continue;

        const name = itemPath.split('/').pop() || '';
        const isFolder = itemPath.endsWith('/');

        // Skip .s3meta files
        if (name.endsWith('.s3meta')) continue;

        if (isFolder) {
          // Recursively get files from subfolders
          const relativePath = itemPath.replace(basePath, '');
          const subfolderFiles = await getAllFilesInFolder(relativePath);
          allFiles = [...allFiles, ...subfolderFiles];
        } else {
          let url = '';
          try {
            const fileUrl = await getUrl({ path: itemPath });
            url = fileUrl.url.toString();
          } catch (e) {
            console.error(`Error getting URL for ${itemPath}:`, e);
          }

          allFiles.push({
            key: itemPath,
            path: itemPath.replace(basePath, ''),
            isFolder: false,
            name,
            url,
            lastRefreshTime: Date.now(),
          });
        }
      }

      return allFiles;
    } catch (error) {
      console.error('Error getting files in folder:', error);
      return [];
    }
  };

  // Handle download for a folder
  const handleFolderDownload = async (event: React.MouseEvent<HTMLButtonElement>, folder: FileItem) => {
    event.stopPropagation(); // Prevent triggering folder click
    setIsDownloading(true);
    setDownloadMessage(`Preparing ${folder.name} for download...`);
    setShowDownloadMessage(true);

    try {
      // Get all files in the folder
      const files = await getAllFilesInFolder(folder.path);

      if (files.length === 0) {
        setDownloadMessage(`Folder "${folder.name}" is empty. Nothing to download.`);
        setShowDownloadMessage(true);
        setIsDownloading(false);
        return;
      }

      // Create a new zip file
      const zip = new JSZip();
      let addedCount = 0;

      // Add files to the zip
      const filePromises = files.map(async (file) => {
        if (!file.url) return;

        try {
          // Fetch the file content
          const response = await fetch(file.url, {
            headers: {
              'Pragma': 'no-cache',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            cache: 'no-store'
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
          }

          const blob = await response.blob();

          // Get relative path within the folder
          const relativePath = file.path.replace(folder.path, '');

          // Add the file to the zip
          zip.file(relativePath, blob);
          addedCount++;

          // Update progress message periodically
          if (addedCount % 5 === 0 || addedCount === files.length) {
            setDownloadMessage(`Preparing ${folder.name}: ${addedCount}/${files.length} files...`);
          }
        } catch (error) {
          console.error(`Error fetching file ${file.name}:`, error);
        }
      });

      // Wait for all files to be fetched and added to the zip
      await Promise.all(filePromises);

      if (addedCount === 0) {
        setDownloadMessage(`Could not download any files from "${folder.name}". Check permissions.`);
        setIsDownloading(false);
        return;
      }

      // Generate the zip file
      setDownloadMessage(`Creating zip file for ${folder.name}...`);
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE', // Use compression
        compressionOptions: { level: 6 } // Medium compression level
      });

      // Save the zip file
      saveAs(zipBlob, `${folder.name}.zip`);

      setDownloadMessage(`Downloaded ${folder.name} as a zip file (${addedCount} files)`);
    } catch (error) {
      console.error('Error downloading folder:', error);
      setDownloadMessage('Error downloading folder. Please try again.');
    } finally {
      setIsDownloading(false);
      setShowDownloadMessage(true);
    }
  };

  // Handle closing the download message
  const handleCloseMessage = () => {
    setShowDownloadMessage(false);
  };

  if (isLoading && fileStructure.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    );
  }

  if (error && fileStructure.length === 0) {
    return (
      <Box p={2}>
        <Typography color="error">{error}</Typography>
        <IconButton onClick={handleRefresh} color="primary" size="small" sx={{ mt: 1 }}>
          <RefreshIcon /> Retry
        </IconButton>
      </Box>
    );
  }

  if (fileStructure.length === 0 && !isLoading) {
    return (
      <Box p={2}>
        <Typography variant="body2" color="textSecondary">
          No files found in this folder.
        </Typography>
        <IconButton onClick={handleRefresh} color="primary" size="small" sx={{ mt: 1 }}>
          <RefreshIcon />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box>
      {/* Navigation toolbar */}
      <Box display="flex" alignItems="center" px={1} py={0.5} bgcolor="background.paper">
        <IconButton
          size="small"
          onClick={handleBackClick}
          disabled={currentPath === ''}
          sx={{ mr: 1 }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>

        <Box flex={1} overflow="hidden">
          <Breadcrumbs maxItems={3} aria-label="breadcrumb" sx={{ fontSize: '0.875rem' }}>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return isLast ? (
                <Typography key={crumb.path} color="textPrimary" variant="body2" sx={{ fontWeight: 'medium' }}>
                  {crumb.name}
                </Typography>
              ) : (
                <MuiLink
                  key={crumb.path}
                  component="button"
                  variant="body2"
                  onClick={() => handleBreadcrumbClick(crumb.path)}
                  underline="hover"
                  color="inherit"
                >
                  {crumb.name}
                </MuiLink>
              );
            })}
          </Breadcrumbs>
        </Box>

        <IconButton
          size="small"
          onClick={handleRefresh}
          sx={{ ml: 1 }}
          color={isRefreshing ? "secondary" : "default"}
        >
          <Badge color="error" variant="dot" invisible={!isRefreshing}>
            <RefreshIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Box>

      {/* File list with slight animation when refreshing */}
      <Box sx={{
        opacity: isRefreshing ? 0.7 : 1,
        transition: 'opacity 0.3s ease',
      }}>
        <List dense>
          {fileStructure.map((item) => (
            <ListItem
              key={item.key}
              disablePadding
              secondaryAction={
                <Tooltip title={item.isFolder
                  ? "Download folder as zip file"
                  : `Open ${item.name} in new tab`
                }>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(e) => item.isFolder
                      ? handleFolderDownload(e, item)
                      : handleFileOpen(e, item)
                    }
                    sx={{
                      opacity: 0.7,
                      '&:hover': {
                        opacity: 1,
                        color: 'primary.main'
                      }
                    }}
                    disabled={isDownloading}
                    color="inherit"
                  >
                    {item.isFolder ? (
                      <DownloadIcon fontSize="small" />
                    ) : (
                      <OpenInNewIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              }
            >
              <StyledListItem
                onClick={() => item.isFolder
                  ? handleFolderClick(item)
                  : handleFileClick(item)
                }
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {item.isFolder ? <FolderIcon color="primary" /> : getFileIcon(item.name)}
                </ListItemIcon>
                <ListItemText
                  primary={item.name}
                  primaryTypographyProps={{ noWrap: true }}
                />
              </StyledListItem>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Loading indicator for refreshes */}
      {isLoading && fileStructure.length > 0 && (
        <Box display="flex" justifyContent="center" p={1}>
          <CircularProgress size={24} />
        </Box>
      )}

      {/* File Preview Dialog */}
      {/* {selectedFile && (
        <Dialog
          open={previewOpen}
          onClose={handleClosePreview}
          maxWidth="xl"
          fullWidth
          sx={{ '& .MuiDialog-paper': { height: '90vh' } }}
        >
          <FileViewer s3Key={selectedFile.key} />
        </Dialog>
      )} */}

      {/* Download status message */}
      <Snackbar
        open={showDownloadMessage}
        autoHideDuration={isDownloading ? null : 4000}
        onClose={handleCloseMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseMessage}
          severity={isDownloading ? "info" : "success"}
          sx={{ width: '100%' }}
          icon={isDownloading ? <CircularProgress size={20} /> : undefined}
        >
          {downloadMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FileExplorer; 