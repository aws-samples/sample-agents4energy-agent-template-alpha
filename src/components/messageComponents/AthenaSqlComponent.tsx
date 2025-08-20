import React, { useState } from 'react';
import { Theme } from '@mui/material/styles';
import { 
  Typography, 
  IconButton, 
  Tooltip, 
  Box, 
  Chip, 
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import StorageIcon from '@mui/icons-material/Storage';
import { Message } from '@/../utils/types';

interface AthenaSqlComponentProps {
  content: Message['content'];
  theme: Theme; 
  chatSessionId: string;
}

const AthenaSqlComponent: React.FC<AthenaSqlComponentProps> = ({ content, theme, chatSessionId }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showSampleData, setShowSampleData] = useState(false);

  try {
    const sqlData = JSON.parse(content?.text || '{}');
    const isSuccess = sqlData.status === 'SUCCEEDED';
    const basePath = `chatSessionArtifacts/sessionId=${chatSessionId}/`;

    const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatTime = (ms: number) => {
      if (ms < 1000) return `${ms}ms`;
      return `${(ms / 1000).toFixed(2)}s`;
    };

    return (
      <div style={{
        backgroundColor: isSuccess ? theme.palette.success.light : theme.palette.error.light,
        padding: theme.spacing(1.5),
        borderRadius: theme.shape.borderRadius,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        maxWidth: '90%',
      }}>
        {/* Header */}
        <Box display="flex" alignItems="center" gap={1.5} mb={1}>
          {isSuccess ? (
            <CheckCircleIcon style={{ color: theme.palette.success.dark }} />
          ) : (
            <ErrorIcon style={{ color: theme.palette.error.dark }} />
          )}
          <StorageIcon style={{ color: theme.palette.text.secondary }} />
          <Typography variant="body1" color="textPrimary" style={{ flex: 1 }}>
            {sqlData.message || (isSuccess ? 'SQL query executed successfully' : 'SQL query failed')}
          </Typography>
          
          {/* CSV File Link */}
          {isSuccess && sqlData.files?.csv && (
            <Tooltip title={`Open ${sqlData.files.csv} in new tab`}>
              <IconButton
                size="small"
                onClick={() => {
                  const encodedPath = sqlData.files.csv.split('/').map((segment: string) => encodeURIComponent(segment)).join('/');
                  window.open(`/preview/${basePath}${encodedPath}`, '_blank');
                }}
                sx={{
                  opacity: 0.7,
                  '&:hover': {
                    opacity: 1,
                    color: theme.palette.primary.main
                  }
                }}
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Quick Stats */}
        {isSuccess && (
          <Box display="flex" gap={1} mb={1} flexWrap="wrap">
            {sqlData.database && (
              <Chip 
                label={`Database: ${sqlData.database}`} 
                size="small" 
                variant="outlined"
              />
            )}
            {sqlData.rowCount !== undefined && (
              <Chip 
                label={`${sqlData.rowCount} rows`} 
                size="small" 
                variant="outlined"
              />
            )}
            {sqlData.columnCount !== undefined && (
              <Chip 
                label={`${sqlData.columnCount} columns`} 
                size="small" 
                variant="outlined"
              />
            )}
            {sqlData.statistics?.TotalExecutionTimeInMillis && (
              <Chip 
                label={`${formatTime(sqlData.statistics.TotalExecutionTimeInMillis)}`} 
                size="small" 
                variant="outlined"
              />
            )}
          </Box>
        )}

        {/* Expandable Details */}
        {isSuccess && sqlData.statistics && (
          <>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <IconButton
                size="small"
                onClick={() => setShowDetails(!showDetails)}
                sx={{ padding: 0.5 }}
              >
                {showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
              <Typography variant="body2" color="textSecondary">
                Query Statistics
              </Typography>
            </Box>
            
            <Collapse in={showDetails}>
              <Box bgcolor={theme.palette.background.paper} p={1.5} borderRadius={1} mb={1}>
                <Typography variant="subtitle2" gutterBottom>Execution Details</Typography>
                <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1}>
                  <Typography variant="body2">
                    <strong>Query ID:</strong> {sqlData.queryExecutionId}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Data Scanned:</strong> {formatBytes(sqlData.statistics.DataScannedInBytes || 0)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Engine Time:</strong> {formatTime(sqlData.statistics.EngineExecutionTimeInMillis || 0)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Queue Time:</strong> {formatTime(sqlData.statistics.QueryQueueTimeInMillis || 0)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Planning Time:</strong> {formatTime(sqlData.statistics.QueryPlanningTimeInMillis || 0)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Total Time:</strong> {formatTime(sqlData.statistics.TotalExecutionTimeInMillis || 0)}
                  </Typography>
                </Box>
              </Box>
            </Collapse>
          </>
        )}

        {/* Sample Data */}
        {isSuccess && sqlData.sampleRows && sqlData.sampleRows.length > 0 && (
          <>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <IconButton
                size="small"
                onClick={() => setShowSampleData(!showSampleData)}
                sx={{ padding: 0.5 }}
              >
                {showSampleData ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
              <Typography variant="body2" color="textSecondary">
                Sample Data ({sqlData.sampleRows.length} rows)
              </Typography>
            </Box>
            
            <Collapse in={showSampleData}>
              <TableContainer component={Paper} sx={{ maxHeight: 300, mb: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {Object.keys(sqlData.sampleRows[0]).map((column) => (
                        <TableCell key={column} sx={{ fontWeight: 'bold' }}>
                          {column}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sqlData.sampleRows.map((row: any, index: number) => (
                      <TableRow key={index}>
                        {Object.values(row).map((value: any, cellIndex: number) => (
                          <TableCell key={cellIndex}>
                            {value !== null && value !== undefined ? String(value) : '—'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Collapse>
          </>
        )}

        {/* Error Details */}
        {!isSuccess && (
          <Box bgcolor={theme.palette.background.paper} p={1.5} borderRadius={1} mt={1}>
            <Typography variant="body2" color="error">
              {sqlData.error || 'Unknown error occurred during query execution'}
            </Typography>
          </Box>
        )}
      </div>
    );
  } catch (error) {
    return (
      <div style={{
        backgroundColor: theme.palette.grey[200],
        padding: theme.spacing(1),
        borderRadius: theme.shape.borderRadius,
      }}>
        <Typography variant="subtitle2" color="error" gutterBottom>
          Error processing Athena SQL result
        </Typography>
        <pre style={{ fontSize: '0.8rem', overflow: 'auto' }}>
          {content?.text}
        </pre>
      </div>
    );
  }
};

export default AthenaSqlComponent;
