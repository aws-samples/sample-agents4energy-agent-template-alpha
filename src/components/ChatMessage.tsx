import { useTheme, Theme } from '@mui/material/styles';
import { Button, Typography, Tooltip, CircularProgress } from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import UpdateIcon from '@mui/icons-material/Update';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReplayIcon from '@mui/icons-material/Replay';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useEffect, useRef, useState } from 'react';
import React from 'react';
import { stringify } from 'yaml';

import { Message } from '@/../utils/types';
import { useFileSystem } from '@/contexts/FileSystemContext';

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { stringifyLimitStringLength } from '../../utils/langChainUtils';
import { PlotDataToolComponent } from './messageComponents/PlotDataToolComponent';
import { SearchFilesToolComponent } from './messageComponents/SearchFilesToolComponent';
import PySparkToolComponent from './messageComponents/PySparkToolComponent';

// Text to Table Tool Component - extracted to avoid conditional hooks
const TextToTableToolComponent = ({ content, theme }: { 
    content: Message['content'], 
    theme: Theme
}) => {
    const [currentPage, setCurrentPage] = React.useState(0);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [tableData, setTableData] = React.useState<{
        columns?: string[];
        data?: Array<Record<string, string | undefined>>;
        matchedFileCount?: number;
        messageContentType?: string;
    } | null>(null);
    const [error, setError] = React.useState<boolean>(false);
    
    // Parse the table data when the component mounts or content changes
    React.useEffect(() => {
        try {
            const parsedData = JSON.parse(content?.text || '{}');
            setTableData(parsedData);
            setError(false);
        } catch {
            setTableData(null);
            setError(true);
        }
    }, [content]);
    
    const rowsPerPage = 5;
    const totalPages = React.useMemo(() => 
        Math.ceil((tableData?.data?.length || 0) / rowsPerPage), 
        [tableData]
    );
    
    const handlePageChange = React.useCallback((newPage: number) => {
        // Ensure the new page is within bounds
        const boundedPage = Math.max(0, Math.min(newPage, totalPages - 1));
        setCurrentPage(boundedPage);
    }, [totalPages]);

    const paginatedData = React.useMemo(() => 
        tableData?.data?.slice(
            currentPage * rowsPerPage,
            (currentPage + 1) * rowsPerPage
        ) || [],
        [tableData, currentPage, rowsPerPage]
    );

    // Effect to maintain scroll position
    React.useEffect(() => {
        if (containerRef.current) {
            const container = containerRef.current;
            const rect = container.getBoundingClientRect();
            const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
            
            if (!isVisible) {
                container.scrollIntoView({ behavior: 'instant', block: 'nearest' });
            }
        }
    }, [currentPage]);
    
    // If there's an error processing the table data
    if (error) {
        return (
            <div style={{ 
                backgroundColor: theme.palette.error.light,
                color: theme.palette.error.contrastText,
                padding: theme.spacing(2),
                borderRadius: theme.shape.borderRadius,
                margin: theme.spacing(1, 0)
            }}>
                <Typography variant="subtitle2" fontWeight="bold">
                    Error processing table data
                </Typography>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                    {content?.text}
                </pre>
            </div>
        );
    }
    
    // If there's no valid table data
    if (!tableData || !tableData.columns || !tableData.data) {
        return (
            <div style={{ 
                backgroundColor: theme.palette.grey[100],
                padding: theme.spacing(2),
                borderRadius: theme.shape.borderRadius
            }}>
                <Typography variant="body2" color="error">
                    Invalid table data format
                </Typography>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                    {content?.text}
                </pre>
            </div>
        );
    }

    // Render the table
    return (
        <div ref={containerRef} style={{
            backgroundColor: theme.palette.grey[50],
            padding: theme.spacing(2),
            borderRadius: theme.shape.borderRadius,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            width: '100%',
            overflowX: 'auto'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: theme.spacing(1.5),
                color: theme.palette.primary.main
            }}> 
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing(1)
                }}>
                    <DescriptionIcon />
                    <Typography variant="subtitle1" fontWeight="medium">
                        {tableData.messageContentType === 'tool_table' ? 'Table Data' : 'Table View'}
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
            
            <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '0.875rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    backgroundColor: theme.palette.common.white
                }}>
                    <thead style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 1
                    }}>
                        <tr style={{
                            backgroundColor: theme.palette.primary.main,
                            color: theme.palette.primary.contrastText
                        }}>
                            {tableData.columns?.map((col: string, i: number) => (
                                <th key={i} style={{ 
                                    padding: theme.spacing(1, 1.5),
                                    textAlign: 'left',
                                    fontWeight: 'bold'
                                }}>
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map((row: Record<string, string | undefined>, rowIndex: number) => {
                            const hasFilePath = !!row.filePath;
                            const rowBgColor = rowIndex % 2 === 0 ? theme.palette.common.white : theme.palette.grey[50];
                            
                            return (
                            <Tooltip 
                                key={`row-${rowIndex}-${row.filePath || rowIndex}`}
                                title={hasFilePath ? `View file: ${row.filePath}` : ''}
                                placement="top"
                                disableHoverListener={!hasFilePath}
                                arrow
                            >
                                <tr style={{
                                    backgroundColor: rowBgColor,
                                    borderBottom: `1px solid ${theme.palette.grey[200]}`,
                                    cursor: hasFilePath ? 'pointer' : 'default',
                                    transition: 'background-color 0.2s ease'
                                }} 
                                onClick={() => {
                                    if (hasFilePath && row.filePath) {
                                        const encodedPath = row.filePath.split('/').map((segment: string) => encodeURIComponent(segment)).join('/');
                                        window.open(`/files/${encodedPath}`, '_blank');
                                    }
                                }}
                                onMouseEnter={(e) => {
                                    if (hasFilePath) {
                                        e.currentTarget.style.backgroundColor = theme.palette.action.hover;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (hasFilePath) {
                                        e.currentTarget.style.backgroundColor = rowBgColor;
                                    }
                                }}
                                >
                                    {tableData.columns?.map((col: string, colIndex: number) => (
                                        <td key={colIndex} style={{ 
                                            padding: theme.spacing(1, 1.5),
                                            borderBottom: `1px solid ${theme.palette.grey[200]}`,
                                            maxWidth: '250px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            position: 'relative'
                                        }}>
                                            {row.error && col === tableData.columns?.[0] ? (
                                                <span style={{ color: theme.palette.error.main }}>
                                                    {row.error}
                                                </span>
                                            ) : (
                                                <div style={{
                                                    maxHeight: col === 'Details' ? '100px' : 'none',
                                                    overflow: col === 'Details' ? 'auto' : 'visible',
                                                    whiteSpace: 'pre-wrap',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    {String(row[col] || '')}
                                                    {hasFilePath && colIndex === 0 && (
                                                        <VisibilityIcon 
                                                            fontSize="small" 
                                                            style={{ 
                                                                fontSize: '14px',
                                                                opacity: 0.6,
                                                                color: theme.palette.primary.main
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            </Tooltip>
                            );
                        })}
                    </tbody>
                </table>
                
                {tableData.matchedFileCount && (
                    <Typography variant="caption" color="textSecondary" style={{ 
                        display: 'block',
                        marginTop: theme.spacing(1),
                        textAlign: 'right'
                    }}>
                        Showing results from {tableData.matchedFileCount} matched files
                    </Typography>
                )}
            </div>
        </div>
    );
};

const ChatMessage = (params: {
    message: Message,
    onRegenerateMessage?: (messageId: string, messageText: string) => void;
}) => {
    //Render either ai or human messages based on the params.message.role

    const theme = useTheme();
    const { refreshFiles } = useFileSystem();
    
    // Use a ref to track which messages we've already processed
    // to prevent multiple refreshes for the same message
    const processedMessageRef = useRef<{[key: string]: boolean}>({});
    
    // State to track if deletion is in progress
    const [isDeletingMessages, setIsDeletingMessages] = useState<boolean>(false);
    // State to track deletion progress
    const [deletionProgress, setDeletionProgress] = useState<number>(0);

    // Effect to handle file operation updates
    useEffect(() => {
        // Skip if we've already processed this message
        const messageId = params.message.id;
        if (!messageId || processedMessageRef.current[messageId]) {
            return;
        }
        
        if (params.message.role === 'tool' && 
            (params.message.toolName === 'writeFile' || 
             params.message.toolName === 'updateFile')) {
            try {
                const fileData = JSON.parse(params.message.content?.text || '{}');
                if (fileData.success) {
                    // Mark this message as processed
                    processedMessageRef.current[messageId] = true;
                    // Refresh file list when operations are successful
                    refreshFiles();
                }
            } catch {
                // Even on error, mark as processed to prevent infinite retries
                processedMessageRef.current[messageId] = true;
            }
        }
    }, [params.message, refreshFiles]);

    const humanMessageStyle = {
        backgroundColor: theme.palette.primary.light,
        color: theme.palette.primary.contrastText,
        padding: theme.spacing(1),
        borderRadius: theme.shape.borderRadius,
        textAlign: 'right' as const,
        marginLeft: 'auto',
        maxWidth: '80%',
    };
    const aiMessageStyle = {
        backgroundColor: theme.palette.grey[200],
        padding: theme.spacing(1),
        borderRadius: theme.shape.borderRadius,
    };

    switch (params.message.role) {
        case 'ai':
            return <div style={aiMessageStyle}>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                >
                    {params.message.content?.text}
                </ReactMarkdown>
                {params.message.toolCalls && params.message.toolCalls !== '[]' && (
                    <div style={{
                        backgroundColor: theme.palette.grey[100],
                        padding: theme.spacing(1),
                        borderRadius: theme.shape.borderRadius,
                        marginTop: theme.spacing(1),
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                            Tool Calls
                        </Typography>
                        {JSON.parse(params.message.toolCalls).map((toolCall: { name: string, args: unknown, id: string }, index: number) => {
                            // Track expanded state for each tool call
                            const [expanded, setExpanded] = useState(false);
                            
                            // Parse and format the args to display
                            let formattedArgs;
                            try {
                                formattedArgs = stringify(JSON.parse(JSON.stringify(toolCall.args)));
                            } catch {
                                formattedArgs = stringify(toolCall.args);
                            }
                            
                            // Split into lines and limit to first 5 if not expanded
                            const lines = formattedArgs.split('\n');
                            const isLong = lines.length > 5;
                            const displayLines = expanded ? lines : lines.slice(0, 5);
                            
                            return (
                            <div key={toolCall.id || index} style={{
                                backgroundColor: theme.palette.common.white,
                                padding: theme.spacing(1),
                                borderRadius: theme.shape.borderRadius,
                                marginBottom: theme.spacing(1)
                            }}>
                                <Typography variant="body2" color="primary" fontWeight="bold" style={{ display: 'flex', alignItems: 'center' }}>
                                    <BuildIcon fontSize="small" style={{ marginRight: theme.spacing(0.5) }} />
                                    {toolCall.name}
                                </Typography>
                                <div style={{
                                    backgroundColor: theme.palette.grey[50],
                                    padding: theme.spacing(1),
                                    borderRadius: theme.shape.borderRadius,
                                    fontFamily: 'monospace',
                                    fontSize: '0.85rem',
                                    marginTop: theme.spacing(0.5)
                                }}>
                                    <pre>
                                        {displayLines.join('\n')}
                                        {isLong && !expanded && '...'}
                                    </pre>
                                    {isLong && (
                                        <Button 
                                            size="small"
                                            onClick={() => setExpanded(!expanded)}
                                            startIcon={expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                            style={{ 
                                                marginTop: theme.spacing(0.5),
                                                fontSize: '0.75rem',
                                                textTransform: 'none'
                                            }}
                                        >
                                            {expanded ? 'Show Less' : 'Show More'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )})}
                    </div>
                )}
            </div>
            break;
        case 'tool':
            switch (params.message.toolName) {
                case 'calculator':
                    return (
                        <div style={{
                            backgroundColor: theme.palette.grey[100],
                            padding: theme.spacing(2),
                            borderRadius: theme.shape.borderRadius,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            maxWidth: '80%'
                        }}>
                            <div style={{
                                backgroundColor: theme.palette.grey[900],
                                color: theme.palette.common.white,
                                padding: theme.spacing(1),
                                borderTopLeftRadius: theme.shape.borderRadius,
                                borderTopRightRadius: theme.shape.borderRadius,
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: theme.spacing(1)
                            }}>
                                <CalculateIcon fontSize="small" />
                                Calculator Result
                            </div>
                            <div style={{
                                backgroundColor: theme.palette.common.white,
                                padding: theme.spacing(2),
                                borderRadius: theme.shape.borderRadius,
                                border: `1px solid ${theme.palette.grey[200]}`,
                                overflow: 'auto',
                                maxHeight: '300px',
                                fontFamily: 'monospace',
                                fontSize: '1.2rem',
                                textAlign: 'right'
                            }}>
                                {params.message.content?.text}
                            </div>
                        </div>
                    )
                    break
                case 'userInputTool':
                    try {
                        const toolData = JSON.parse(params.message.content?.text || '{}');
                        return (
                            <div style={{
                                backgroundColor: theme.palette.background.paper,
                                padding: theme.spacing(2),
                                borderRadius: theme.shape.borderRadius,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                maxWidth: '90%',
                                margin: theme.spacing(1, 0)
                            }}>
                                <Typography variant="h6" gutterBottom sx={{
                                    color: theme.palette.primary.main,
                                    fontWeight: 'bold'
                                }}>
                                    {toolData.title || 'User Action Required'}
                                </Typography>

                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                >
                                    {toolData.description || 'Please take action by clicking the button below.'}
                                </ReactMarkdown>

                                <Button
                                    variant="contained"
                                    color="primary"
                                    sx={{
                                        fontWeight: 'medium',
                                        textTransform: 'none',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                        '&:hover': {
                                            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                                        }
                                    }}
                                    onClick={(e) => {
                                        const button = e.currentTarget;
                                        button.disabled = true;
                                        button.textContent = toolData.buttonTextAfterClick || 'Done!';
                                        button.style.backgroundColor = theme.palette.success.main;
                                    }}
                                >
                                    {toolData.buttonTextBeforeClick || 'Click to Proceed'}
                                </Button>
                            </div>
                        );
                    } catch {
                        return (
                            <div style={aiMessageStyle}>
                                <Typography variant="subtitle2" color="error" gutterBottom>
                                    Error parsing user input tool data
                                </Typography>
                                <div>
                                    {params.message.content?.text}
                                </div>
                            </div>
                        );
                    }
                    break;
                case 'searchFiles':
                    return <SearchFilesToolComponent 
                        content={params.message.content} 
                        theme={theme} 
                        chatSessionId={params.message.chatSessionId || ''}
                    />;
                    break;
                case 'listFiles':
                    try {
                        const listData = JSON.parse(params.message.content?.text || '{}');
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
                            <div style={aiMessageStyle}>
                                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                    List of files in the requested directory
                                </Typography>
                                <pre>
                                    {params.message.content?.text}
                                </pre>
                            </div>
                        );
                    }
                    break;
                case 'readFile':
                    try {
                        const fileContent = JSON.parse(params.message.content?.text || '{}').content;
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
                                        File Content
                                    </Typography>
                                </div>
                                <div style={{
                                    backgroundColor: theme.palette.common.white,
                                    padding: theme.spacing(2),
                                    borderRadius: theme.shape.borderRadius,
                                    border: `1px solid ${theme.palette.grey[200]}`,
                                    overflow: 'auto',
                                    maxHeight: '300px',
                                    fontFamily: 'monospace',
                                    fontSize: '0.9rem',
                                    whiteSpace: 'pre-wrap',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                }}>
                                    {typeof fileContent === 'string' ? fileContent : JSON.stringify(fileContent, null, 2)}
                                </div>
                            </div>
                        );
                    } catch {
                        return (
                            <div style={aiMessageStyle}>
                                <Typography variant="subtitle2" color="error" gutterBottom>
                                    Error processing file content
                                </Typography>
                                <pre>
                                    {params.message.content?.text}
                                </pre>
                            </div>
                        );
                    }
                    break;
                case 'writeFile':
                    try {
                        const fileData = JSON.parse(params.message.content?.text || '{}');
                        return (
                            <div style={{
                                backgroundColor: theme.palette.success.light,
                                padding: theme.spacing(1.5),
                                borderRadius: theme.shape.borderRadius,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                maxWidth: '80%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: theme.spacing(1.5)
                            }}>
                                <CheckCircleIcon style={{ color: theme.palette.success.dark }} />
                                <Typography variant="body1" color="textPrimary">
                                    {fileData.success 
                                        ? `File saved successfully` 
                                        : `Error: ${fileData.message || 'Unknown error writing file'}`}
                                </Typography>
                            </div>
                        );
                    } catch {
                        return (
                            <div style={aiMessageStyle}>
                                <Typography variant="subtitle2" color="error" gutterBottom>
                                    Error processing file write result
                                </Typography>
                                <pre>
                                    {params.message.content?.text}
                                </pre>
                            </div>
                        );
                    }
                    break;
                case 'updateFile':
                    try {
                        const fileData = JSON.parse(params.message.content?.text || '{}');
                        return (
                            <div style={{
                                backgroundColor: theme.palette.info.light,
                                padding: theme.spacing(1.5),
                                borderRadius: theme.shape.borderRadius,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                maxWidth: '80%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: theme.spacing(1.5)
                            }}>
                                <UpdateIcon style={{ color: theme.palette.info.dark }} />
                                <Typography variant="body1" color="textPrimary">
                                    {fileData.success 
                                        ? `File updated successfully` 
                                        : `Error: ${fileData.message || 'Unknown error updating file'}`}
                                </Typography>
                            </div>
                        );
                    } catch {
                        return (
                            <div style={aiMessageStyle}>
                                <Typography variant="subtitle2" color="error" gutterBottom>
                                    Error processing file update result
                                </Typography>
                                <pre>
                                    {params.message.content?.text}
                                </pre>
                            </div>
                        );
                    }
                    break;
                case 'textToTableTool':
                    return <TextToTableToolComponent content={params.message.content} theme={theme} />;
                case 'plotDataTool':
                    return <PlotDataToolComponent content={params.message.content} theme={theme} chatSessionId={params.message.chatSessionId || ''} />;
                case 'pysparkTool':
                    return <PySparkToolComponent content={params.message.content} theme={theme} />;
                default:
                    return <>
                        <p>Tool message</p>
                        <pre>
                            {JSON.stringify(JSON.parse(params.message.content?.text || '{}'), null, 2)}
                        </pre>
                        <pre>
                            {JSON.stringify(params.message, null, 2)}
                        </pre>
                        
                    </>
            }

            break;
        case 'human':
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    width: '100%'
                }}>
                    <div style={humanMessageStyle}>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                        >
                            {params.message.content?.text}
                        </ReactMarkdown>
                    </div>
                    {params.onRegenerateMessage && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Button 
                                size="small"
                                onClick={() => {
                                    // Set deleting state to true when retry is clicked
                                    setIsDeletingMessages(true);
                                    
                                    // Create a fake progress simulation
                                    const startTime = Date.now();
                                    const expectedDuration = 1500; // 1.5 seconds for deletion animation
                                    
                                    const progressInterval = setInterval(() => {
                                        const elapsedTime = Date.now() - startTime;
                                        const progress = Math.min(100, Math.round((elapsedTime / expectedDuration) * 100));
                                        setDeletionProgress(progress);
                                        
                                        if (progress >= 100) {
                                            clearInterval(progressInterval);
                                            // Reset states and call regenerate function simultaneously
                                            setIsDeletingMessages(false);
                                            setDeletionProgress(0);
                                            params.onRegenerateMessage!(
                                                params.message.id || '', 
                                                params.message.content?.text || ''
                                            );
                                        }
                                    }, 50);
                                }}
                                startIcon={<ReplayIcon fontSize="small" />}
                                disabled={isDeletingMessages}
                                sx={{ 
                                    mt: 0.5, 
                                    fontSize: '0.75rem',
                                    color: isDeletingMessages ? theme.palette.grey[400] : theme.palette.grey[700],
                                    '&:hover': {
                                        backgroundColor: theme.palette.grey[100]
                                    }
                                }}
                            >
                                {isDeletingMessages ? 'Deleting...' : 'Retry'}
                            </Button>
                            
                            {isDeletingMessages && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CircularProgress 
                                        size={16} 
                                        thickness={5}
                                        variant="determinate" 
                                        value={deletionProgress} 
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        {deletionProgress}%
                                    </Typography>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )
            break;
    }
}

export default ChatMessage