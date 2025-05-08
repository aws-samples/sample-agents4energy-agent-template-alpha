import React, { useMemo } from 'react';
import { Theme } from '@mui/material/styles';
import { Typography, Button, CircularProgress } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WarningIcon from '@mui/icons-material/Warning';

// Import Message type for content prop
import { Message } from '@/../utils/types';

export const SearchFilesToolComponent = ({ content, theme, chatSessionId }: { 
    content: Message['content'], 
    theme: Theme,
    chatSessionId: string
}) => {
    const [searchData, setSearchData] = React.useState<{
        files?: string[];
        count?: number;
        totalCount?: number;
        hasMore?: boolean;
        pattern?: string;
        message?: string;
        error?: string;
    } | null>(null);
    const [error, setError] = React.useState<boolean>(false);
    const [errorMessage, setErrorMessage] = React.useState<string>('');
    const [currentPage, setCurrentPage] = React.useState(0);
    const [loading, setLoading] = React.useState(false);
    
    // Files per page for pagination - reduced to 5
    const filesPerPage = 5;
    
    // Parse the search data when the component mounts or content changes
    React.useEffect(() => {
        setLoading(true);
        try {
            const parsedData = JSON.parse(content?.text || '{}');
            console.log('Parsed search files data:', parsedData);
            setSearchData(parsedData);
            setError(false);
            setErrorMessage('');
        } catch (e: any) {
            console.error('Error parsing search files data:', e);
            setSearchData(null);
            setError(true);
            setErrorMessage(`Error parsing search files data: ${e.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    }, [content]);

    // Calculate total pages for pagination
    const totalPages = useMemo(() => {
        if (!searchData?.files) return 0;
        return Math.ceil(searchData.files.length / filesPerPage);
    }, [searchData?.files]);

    // Get current page of file paths
    const currentFiles = useMemo(() => {
        if (!searchData?.files) return [];
        const startIndex = currentPage * filesPerPage;
        const endIndex = startIndex + filesPerPage;
        return searchData.files.slice(startIndex, endIndex);
    }, [searchData?.files, currentPage]);

    // Handle page change
    const handlePageChange = (newPage: number) => {
        setCurrentPage(Math.max(0, Math.min(newPage, totalPages - 1)));
    };

    // Extract file name from path for display
    const getFileName = (path: string) => {
        const parts = path.split('/');
        return parts[parts.length - 1];
    };

    // Get directory from path for display
    const getDirectory = (path: string) => {
        const parts = path.split('/');
        return parts.slice(0, -1).join('/');
    };

    // If there's an error processing the search data
    if (error || !searchData) {
        return (
            <div style={{ 
                backgroundColor: theme.palette.error.light,
                color: theme.palette.error.contrastText,
                padding: theme.spacing(2),
                borderRadius: theme.shape.borderRadius,
                margin: theme.spacing(1, 0)
            }}>
                <Typography variant="subtitle2" fontWeight="bold">
                    Error processing search results
                </Typography>
                
                {errorMessage && (
                    <Typography variant="body2" style={{ marginTop: theme.spacing(1), marginBottom: theme.spacing(1) }}>
                        {errorMessage}
                    </Typography>
                )}
                
                <div style={{
                    backgroundColor: 'rgba(0,0,0,0.05)',
                    padding: theme.spacing(1.5),
                    borderRadius: theme.shape.borderRadius,
                    maxHeight: '200px',
                    overflow: 'auto'
                }}>
                    <Typography variant="caption" component="div">
                        <strong>Debug information:</strong>
                    </Typography>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem', margin: theme.spacing(0.5, 0, 0, 0) }}>
                        Raw content: {content?.text}
                    </pre>
                </div>
            </div>
        );
    }

    // Show loading state
    if (loading) {
        return (
            <div style={{
                backgroundColor: theme.palette.grey[50],
                padding: theme.spacing(2),
                borderRadius: theme.shape.borderRadius,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '200px'
            }}>
                <CircularProgress size={40} />
                <Typography variant="body2" style={{ marginTop: theme.spacing(2) }}>
                    Processing search results...
                </Typography>
            </div>
        );
    }

    // If there are no files found
    if (!searchData.files || searchData.files.length === 0) {
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
                    marginBottom: theme.spacing(1),
                    color: theme.palette.primary.main
                }}>
                    <SearchIcon />
                    <Typography variant="subtitle1" fontWeight="medium">
                        Search Results
                    </Typography>
                </div>
                
                <Typography variant="body1" style={{ 
                    marginTop: theme.spacing(2),
                    marginBottom: theme.spacing(2),
                    fontStyle: 'italic'
                }}>
                    No files found matching pattern: "{searchData.pattern}"
                </Typography>
            </div>
        );
    }

    // Render the file list
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
                justifyContent: 'space-between',
                marginBottom: theme.spacing(1.5)
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing(1),
                    color: theme.palette.primary.main
                }}>
                    <SearchIcon />
                    <Typography variant="subtitle1" fontWeight="medium">
                        Search Results: "{searchData.pattern}"
                    </Typography>
                </div>
                
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing(2)
                }}>
                    <Typography variant="body2" color="textSecondary">
                        Page {currentPage + 1} of {totalPages || 1}
                    </Typography>
                    <div style={{ display: 'flex', gap: theme.spacing(1) }}>
                        <Button
                            size="small"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handlePageChange(currentPage - 1);
                            }}
                            disabled={currentPage === 0}
                            variant="outlined"
                        >
                            Previous
                        </Button>
                        <Button
                            size="small"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handlePageChange(currentPage + 1);
                            }}
                            disabled={currentPage >= totalPages - 1}
                            variant="outlined"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>
            
            {/* Improved warning message with better contrast */}
            {searchData.message && searchData.hasMore && (
                <div style={{ 
                    marginBottom: theme.spacing(1.5),
                    backgroundColor: theme.palette.grey[100],
                    border: `1px solid ${theme.palette.warning.main}`,
                    borderRadius: theme.shape.borderRadius,
                    padding: theme.spacing(1.5),
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing(1)
                }}>
                    <WarningIcon style={{ color: theme.palette.warning.dark }} />
                    <Typography variant="body2" color="textPrimary" fontWeight="medium">
                        {searchData.message}
                    </Typography>
                </div>
            )}
            
            {/* Show regular message if not a warning */}
            {searchData.message && !searchData.hasMore && (
                <Typography 
                    variant="body2" 
                    color="textSecondary"
                    style={{ marginBottom: theme.spacing(1.5) }}
                >
                    {searchData.message}
                </Typography>
            )}
            
            <div style={{
                border: `1px solid ${theme.palette.grey[300]}`,
                borderRadius: theme.shape.borderRadius,
                backgroundColor: theme.palette.common.white,
                overflow: 'hidden'
            }}>
                {currentFiles.map((filePath, index) => (
                    <div 
                        key={index}
                        style={{
                            padding: theme.spacing(1.5),
                            borderBottom: index < currentFiles.length - 1 ? `1px solid ${theme.palette.grey[200]}` : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            backgroundColor: index % 2 === 0 ? theme.palette.common.white : theme.palette.grey[50]
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme.palette.action.hover;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = index % 2 === 0 ? theme.palette.common.white : theme.palette.grey[50];
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing(1) }}>
                                <DescriptionIcon style={{ fontSize: '1rem', color: theme.palette.primary.main }} />
                                <Typography variant="body1" fontWeight="medium">
                                    {getFileName(filePath)}
                                </Typography>
                            </div>
                            <Typography variant="caption" color="textSecondary" style={{ marginLeft: theme.spacing(3) }}>
                                {getDirectory(filePath)}
                            </Typography>
                        </div>
                        <VisibilityIcon 
                            fontSize="small" 
                            style={{ 
                                color: theme.palette.primary.main, 
                                opacity: 0.7,
                                cursor: 'pointer'
                            }}
                            onClick={() => {
                                const encodedPath = filePath.split('/').map((segment: string) => encodeURIComponent(segment)).join('/');
                                const previewPath = encodedPath.startsWith('global') 
                                    ? `/preview/${encodedPath}` 
                                    : `/preview/chatSessionArtifacts/sessionId=${chatSessionId}/${encodedPath}`;
                                window.open(previewPath, '_blank');
                            }}
                        />
                    </div>
                ))}
            </div>
            
            <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: theme.spacing(1.5),
                color: theme.palette.text.secondary
            }}>
                <Typography variant="caption">
                    {searchData.count === searchData.totalCount 
                        ? `Showing all ${searchData.totalCount} matches` 
                        : `Showing ${searchData.count} of ${searchData.totalCount} matches`}
                </Typography>
                
                <div style={{ display: 'flex', gap: theme.spacing(2) }}>
                    <Button
                        size="small"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handlePageChange(0);
                        }}
                        disabled={currentPage === 0}
                        variant="text"
                    >
                        First
                    </Button>
                    <Button
                        size="small"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handlePageChange(totalPages - 1);
                        }}
                        disabled={currentPage === totalPages - 1}
                        variant="text"
                    >
                        Last
                    </Button>
                </div>
            </div>
        </div>
    );
};
