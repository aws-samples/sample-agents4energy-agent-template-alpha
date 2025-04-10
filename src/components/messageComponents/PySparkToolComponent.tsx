import { Theme } from '@mui/material/styles';
import { Typography, Divider, Tooltip } from '@mui/material';
import TerminalIcon from '@mui/icons-material/Terminal';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { Message } from '../../../utils/types';

// Helper function to parse and render ASCII tables from PySpark stdout
const renderAsciiTable = (tableText: string, theme: Theme) => {
  // Split the text by lines
  const lines = tableText.trim().split('\n');
  
  // If we don't have enough lines for a table, just return the text
  if (lines.length < 3) {
    return <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{tableText}</pre>;
  }
  
  // Find separator lines that look like +----+----+
  const separatorPattern = /^\+[-+]+\+$/;
  const separatorLines = lines
    .map((line, index) => separatorPattern.test(line) ? index : -1)
    .filter(index => index !== -1);
  
  // If we don't have separator lines, just return the text
  if (separatorLines.length < 2) {
    return <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{tableText}</pre>;
  }
  
  // Extract the header row (between first and second separator)
  const headerIndex = separatorLines[0] + 1;
  
  // If there's no valid header, return plain text
  if (headerIndex >= lines.length) {
    return <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{tableText}</pre>;
  }
  
  const headerRow = lines[headerIndex];
  
  // Parse header cells by splitting on |
  const headerCells = headerRow
    .split('|')
    .filter(cell => cell.trim() !== '');
  
  // Extract data rows (between second separator and last separator)
  const dataStartIndex = separatorLines[1] + 1;
  const dataEndIndex = separatorLines[separatorLines.length - 1];
  
  const dataRows = lines
    .slice(dataStartIndex, dataEndIndex)
    .filter(line => line.trim() !== '' && !separatorPattern.test(line));
  
  return (
    <div style={{ 
      backgroundColor: theme.palette.common.white,
      borderRadius: theme.shape.borderRadius,
      overflow: 'auto',
      boxShadow: `inset 0 0 5px ${theme.palette.grey[300]}`,
      marginBottom: theme.spacing(2)
    }}>
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse',
        fontSize: '0.875rem'
      }}>
        <thead>
          <tr style={{
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText
          }}>
            {headerCells.map((cell, idx) => (
              <th key={idx} style={{ 
                padding: theme.spacing(0.75, 1),
                textAlign: 'left',
                fontWeight: 'bold',
                whiteSpace: 'nowrap'
              }}>
                {cell.trim()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, rowIdx) => {
            const cells = row
              .split('|')
              .filter(cell => cell.trim() !== '');
            
            return (
              <tr key={rowIdx} style={{
                backgroundColor: rowIdx % 2 === 0 ? theme.palette.common.white : theme.palette.grey[50],
                borderBottom: `1px solid ${theme.palette.grey[200]}`
              }}>
                {cells.map((cell, cellIdx) => (
                  <td key={cellIdx} style={{ 
                    padding: theme.spacing(0.75, 1),
                    whiteSpace: 'nowrap'
                  }}>
                    {cell.trim()}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Process PySpark output to separate individual tables and text blocks
const processPySparkOutput = (stdout: string, theme: Theme) => {
  if (!stdout) return null;
  
  // Split by double newlines to separate sections
  const sections = stdout.split('\n\n\n');
  
  return sections.map((section, idx) => {
    // Check if section contains a table
    if (section.includes('+---') && section.includes('|')) {
      // Try to extract title if present (line before the table)
      const titleMatch = section.match(/^(.*?):\n/);
      const title = titleMatch ? titleMatch[1].trim() : '';
      
      return (
        <div key={idx} style={{ marginBottom: theme.spacing(3) }}>
          {title && (
            <Typography variant="subtitle2" 
              style={{ 
                marginBottom: theme.spacing(1),
                color: theme.palette.primary.main,
                fontWeight: 'bold' 
              }}
            >
              {title}
            </Typography>
          )}
          {renderAsciiTable(section.replace(/^.*?:\n/, ''), theme)}
        </div>
      );
    } else {
      // It's just text
      return (
        <div key={idx} style={{ marginBottom: theme.spacing(2) }}>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            margin: 0,
            fontFamily: 'monospace',
            fontSize: '0.85rem'
          }}>
            {section.trim()}
          </pre>
        </div>
      );
    }
  });
};

// Status icon based on job status
const StatusIcon = ({ status, theme }: { status: string, theme: Theme }) => {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircleIcon style={{ color: theme.palette.success.main }} />;
    case 'FAILED':
      return <ErrorIcon style={{ color: theme.palette.error.main }} />;
    case 'RUNNING':
    case 'PENDING':
      return <HourglassEmptyIcon style={{ color: theme.palette.warning.main }} />;
    default:
      return <TerminalIcon />;
  }
};

export const PySparkToolComponent = ({ 
  content, 
  theme 
}: { 
  content: Message['content'], 
  theme: Theme 
}) => {
  let pysparkData;
  let errorMessage = null;
  
  try {
    pysparkData = JSON.parse(content?.text || '{}');
  } catch (e) {
    errorMessage = "Error parsing PySpark response";
    pysparkData = { status: "ERROR", output: { message: errorMessage, stdout: content?.text || "" } };
  }
  
  const { status, output } = pysparkData;
  const { stdout = "", stderr = "", message = "", result = "{}" } = output || {};
  
  return (
    <div style={{
      backgroundColor: theme.palette.grey[50],
      padding: theme.spacing(2),
      borderRadius: theme.shape.borderRadius,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      width: '100%',
      maxWidth: '100%',
      overflow: 'hidden'
    }}>
      {/* Header with status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing(1),
        marginBottom: theme.spacing(1.5)
      }}>
        <StatusIcon status={status} theme={theme} />
        <Typography variant="subtitle1" fontWeight="medium" style={{
          color: status === 'COMPLETED' 
            ? theme.palette.success.dark 
            : status === 'FAILED' 
              ? theme.palette.error.dark 
              : theme.palette.text.primary
        }}>
          PySpark {status ? status.toLowerCase() : 'unknown'}
        </Typography>
        
        <Tooltip title={message || status || ''} arrow placement="top">
          <Typography 
            variant="body2" 
            color="textSecondary" 
            style={{ 
              marginLeft: 'auto',
              cursor: 'help',
              fontStyle: 'italic'
            }}
          >
            {message || (status === 'COMPLETED' ? 'Execution successful' : status)}
          </Typography>
        </Tooltip>
      </div>
      
      <Divider style={{ margin: theme.spacing(1, 0, 2) }} />
      
      {/* Output section */}
      <div style={{
        backgroundColor: theme.palette.common.white,
        borderRadius: theme.shape.borderRadius,
        padding: theme.spacing(1.5),
        maxHeight: '500px',
        overflow: 'auto'
      }}>
        {/* Always process and display stdout with tables if available */}
        {stdout && processPySparkOutput(stdout, theme)}
        
        {/* If we have stderr, show it below stdout */}
        {stderr && (
          <div style={{
            backgroundColor: theme.palette.error.light || '#FFEBEE',
            padding: theme.spacing(2),
            borderRadius: theme.shape.borderRadius,
            marginTop: theme.spacing(2),
            borderLeft: `4px solid ${theme.palette.error.main}`,
            boxShadow: `0 1px 2px rgba(0,0,0,0.05)`
          }}>
            <Typography variant="h6" style={{ 
              color: theme.palette.error.dark,
              fontWeight: 'bold',
              marginBottom: theme.spacing(1.5),
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing(1),
            }}>
              <ErrorIcon fontSize="small" />
              Error Details
            </Typography>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              margin: 0,
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              color: theme.palette.error.dark,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              padding: theme.spacing(1.5),
              borderRadius: theme.shape.borderRadius,
              overflow: 'auto',
              maxHeight: '300px',
              lineHeight: 1.5
            }}>
              {stderr}
            </pre>
          </div>
        )}
        
        {/* Only show "No output" message if both stdout and stderr are empty */}
        {!stdout && !stderr && (
          <Typography variant="body2" color="textSecondary" style={{ fontStyle: 'italic' }}>
            {errorMessage || "No output available"}
          </Typography>
        )}
      </div>
    </div>
  );
};

export default PySparkToolComponent;
