import React from 'react';
import { Theme } from '@mui/material/styles';
import { Button, Typography } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Message } from '@/../utils/types';

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
            // Filter out relevanceScore and relevanceExplanation columns
            if (parsedData.columns) {
                parsedData.columns = parsedData.columns.filter((col: string) => 
                    col !== 'relevanceScore' && col !== 'relevanceExplanation'
                );
                // Also remove these fields from the data objects
                if (parsedData.data) {
                    parsedData.data = parsedData.data.map((row: Record<string, string | undefined>) => {
                        const newRow = { ...row };
                        delete newRow.relevanceScore;
                        delete newRow.relevanceExplanation;
                        return newRow;
                    });
                }
            }
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
                            <tr
                                key={`row-${rowIndex}-${row.filePath || rowIndex}`}
                                style={{
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

export default TextToTableToolComponent; 