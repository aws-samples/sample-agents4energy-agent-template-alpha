import React, { useMemo } from 'react';
import { Theme } from '@mui/material/styles';
import { Typography, CircularProgress } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, LogarithmicScale, ChartOptions } from 'chart.js';
import { Line, Bar, Scatter } from 'react-chartjs-2';
import { getUrl } from 'aws-amplify/storage';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Import Message type for content prop
import { Message } from '@/../utils/types';

export const PlotDataToolComponent = ({ content, theme, chatSessionId }: { 
    content: Message['content'], 
    theme: Theme,
    chatSessionId: string
}) => {
    const [plotData, setPlotData] = React.useState<{
        messageContentType?: string;
        filePath?: string;
        filePaths?: string | string[];
        dataSeries?: Array<{
            filePath: string;
            xAxisColumn: string;
            yAxisColumn: string;
            label: string;
            color?: string;
        }>;
        plotType?: 'line' | 'scatter' | 'bar';
        title?: string;
        xAxis?: { label?: string; data?: string[] };
        series?: Array<{
            label: string;
            column: string;
            color?: string;
            data: string[];
        }>;
        xAxisColumn?: string;
        xAxisLabel?: string;
        yAxisColumns?: Array<{
            column: string;
            label?: string;
            color?: string;
        }>;
        yAxisLabel?: string;
        dataRows?: Array<any>;
        error?: string;
        suggestion?: string;
        availableColumns?: string[];
    } | null>(null);
    const [error, setError] = React.useState<boolean>(false);
    const [errorMessage, setErrorMessage] = React.useState<string>('');
    const [csvData, setCsvData] = React.useState<Array<{ [key: string]: string }> | null>(null);
    const [loading, setLoading] = React.useState(false);
    
    // Get array of standard colors to use for series
    const seriesColors = React.useMemo(() => [
        theme.palette.primary.main,
        theme.palette.secondary.main,
        '#FF5722', // deep orange
        '#2196F3', // blue
        '#4CAF50', // green
        '#9C27B0', // purple
        '#FFC107', // amber
        '#795548', // brown
        '#00BCD4', // cyan
        '#E91E63', // pink
        '#673AB7', // deep purple
        '#CDDC39'  // lime
    ], [theme]);

    // Parse the plot data when the component mounts or content changes
    React.useEffect(() => {
        try {
            const parsedData = JSON.parse(content?.text || '{}');
            console.log('Parsed plot data:', parsedData);
            setPlotData(parsedData);
            setError(false);
            setErrorMessage('');
        } catch (e: any) {
            console.error('Error parsing plot data:', e);
            setPlotData(null);
            setError(true);
            setErrorMessage(`Error parsing plot data: ${e.message || 'Unknown error'}`);
        }
    }, [content]);

    // Function to manually parse CSV data from the file content
    const parseCSV = React.useCallback((fileContent: string) => {
        try {
            // Split into lines and remove empty lines
            const lines = fileContent.trim().split('\n');
            
            if (lines.length <= 1) {
                throw new Error('CSV file is empty or contains only headers');
            }
            
            // Extract headers
            const headers = lines[0].split(',').map(h => h.trim());
            
            // Process all rows
            const rows = lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.trim());
                const row: { [key: string]: string } = {};
                
                // Map each value to its column header
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                
                return row;
            });
            
            return { headers, rows };
        } catch (error: any) {
            throw new Error(`Failed to parse CSV: ${error.message}`);
        }
    }, []);

    // Process the data when plotData is updated
    React.useEffect(() => {
        console.log('plotData updated:', plotData);
        
        if (!plotData) {
            console.log('No plotData, skipping fetch');
            return;
        }
        
        // Get the file paths to process
        let filePathsArray: string[] = [];
        
        // Handle filePaths as string or array
        if (plotData.filePaths) {
            if (typeof plotData.filePaths === 'string') {
                // Handle comma-separated list
                filePathsArray = plotData.filePaths.split(',').map(path => path.trim());
            } else if (Array.isArray(plotData.filePaths)) {
                // Handle array of paths
                filePathsArray = plotData.filePaths;
            }
        } else if (plotData.filePath) {
            // Handle single filePath
            filePathsArray = [plotData.filePath];
        } else if (plotData.dataSeries?.length) {
            // Extract file paths from dataSeries
            filePathsArray = plotData.dataSeries.map(series => series.filePath);
        }
        
        if (filePathsArray.length === 0) {
            console.log('No file paths found in plotData, skipping fetch');
            return;
        }

        console.log('Processing files:', filePathsArray);
        
        const processData = async () => {
            setLoading(true);
            try {
                // Fetch and process each file
                const allRows: Array<{ [key: string]: string }> = [];
                
                for (const filePath of filePathsArray) {
                    // Construct the full S3 key with the session prefix
                    const fullPath = `chatSessionArtifacts/sessionId=${chatSessionId}/${filePath}`;
                    console.log('Getting URL for:', fullPath);

                    // Use Amplify Storage's getUrl to fetch the file 
                    const result = await getUrl({
                        path: fullPath,
                    });
                    
                    // Fetch CSV data from the obtained URL
                    const response = await fetch(result.url.toString());
                    if (!response.ok) {
                        console.warn(`Failed to fetch data from ${filePath}: ${response.statusText}`);
                        continue; // Try the next file if this one fails
                    }
                    
                    // Get the file content as text
                    const fileContent = await response.text();
                    if (!fileContent) {
                        console.warn(`Empty file content from ${filePath}`);
                        continue;
                    }
                    
                    // Parse CSV data
                    const { headers, rows } = parseCSV(fileContent);
                    console.log(`Parsed CSV data from ${filePath}:`, rows.length, 'rows');
                    
                    // Add a source column to identify which file the data came from
                    const sourceFileName = filePath.split('/').pop() || filePath;
                    const rowsWithSource = rows.map(row => ({
                        ...row,
                        __source: sourceFileName
                    }));
                    
                    // Add rows to the collected data
                    allRows.push(...rowsWithSource);
                }
                
                if (allRows.length > 0) {
                    setCsvData(allRows);
                    console.log('Combined CSV data from all files:', allRows.length, 'total rows');
                } else if (plotData.series && plotData.series.length > 0) {
                    // Fall back to using the data already in plotData.series if no files were loaded
                    console.log('No CSV data loaded, using pre-parsed data from plotData');
                    setCsvData([]); // Just set to empty array to indicate success
                } else {
                    throw new Error('No data could be loaded from any of the specified files');
                }
            } catch (error: any) {
                console.error('Error processing data:', error);
                
                // Try to fall back to using the data already in plotData.series
                if (plotData.series && plotData.series.length > 0) {
                    console.log('Failed to fetch from S3, using pre-parsed data from plotData');
                    setCsvData([]); // Just set to empty array to indicate success
                } else {
                    setError(true);
                    setErrorMessage(`Error processing data: ${error.message}`);
                }
            } finally {
                setLoading(false);
            }
        };

        processData();
    }, [plotData, parseCSV, chatSessionId]);

    // Prepare chart data from CSV or directly from plotData.series
    const chartData = React.useMemo(() => {
        if (!plotData) {
            return { labels: [], datasets: [] };
        }
        
        // If we have plotData with series already prepared
        if (plotData.series && plotData.xAxis?.data) {
            return {
                labels: plotData.xAxis.data,
                datasets: plotData.series.map((series, index) => ({
                    label: series.label,
                    data: series.data.map(y => Number(y) || 0),
                    backgroundColor: series.color || seriesColors[index % seriesColors.length] + '66', // Add transparency
                    borderColor: series.color || seriesColors[index % seriesColors.length],
                    borderWidth: 2,
                    pointBackgroundColor: series.color || seriesColors[index % seriesColors.length],
                    tension: 0.1
                }))
            };
        }
        
        // If we have dataSeries format with multiple files and columns
        if (csvData && plotData.dataSeries?.length) {
            console.log('Using dataSeries format for chart data');
            
            // Group CSV data by source file
            const dataBySource = csvData.reduce((acc, row) => {
                const source = row.__source;
                if (!acc[source]) {
                    acc[source] = [];
                }
                acc[source].push(row);
                return acc;
            }, {} as Record<string, Array<{ [key: string]: string }>>);
            
            // Find all unique x-axis values across all sources
            const allFarms = new Set<string>();
            Object.values(dataBySource).forEach(rows => {
                rows.forEach(row => {
                    // Find the x-axis column for this source
                    const seriesForSource = plotData.dataSeries?.find(
                        s => row.__source === s.filePath.split('/').pop()
                    );
                    if (seriesForSource) {
                        const farmValue = row[seriesForSource.xAxisColumn];
                        if (farmValue) {
                            allFarms.add(farmValue);
                        }
                    }
                });
            });
            
            // Convert to array and sort
            const labels = Array.from(allFarms).sort();
            
            // Create datasets from dataSeries
            const datasets = plotData.dataSeries.map((series, index) => {
                const sourceFile = series.filePath.split('/').pop() || '';
                const sourceRows = dataBySource[sourceFile] || [];
                
                // Map farm names to values
                const data = labels.map(farm => {
                    const row = sourceRows.find(r => r[series.xAxisColumn] === farm);
                    return row ? Number(row[series.yAxisColumn]) || 0 : 0;
                });
                
                return {
                    label: series.label,
                    data,
                    backgroundColor: series.color || seriesColors[index % seriesColors.length] + '66', // Add transparency
                    borderColor: series.color || seriesColors[index % seriesColors.length],
                    borderWidth: 2,
                    pointBackgroundColor: series.color || seriesColors[index % seriesColors.length],
                    tension: 0.1
                };
            });
            
            return { labels, datasets };
        }
        
        // If we have csvData and need to extract specific columns
        if (csvData && plotData?.xAxisColumn && plotData.yAxisColumns) {
            // Check if we have multiple sources in the data
            const sources = [...new Set(csvData.map(row => row.__source))];
            const hasMultipleSources = sources.length > 1;
            
            if (hasMultipleSources) {
                console.log('Multiple data sources detected:', sources);
                
                // Prepare x-axis values from all sources
                const allXValues = csvData.map(row => row[plotData.xAxisColumn || ''] || '');
                
                // Create datasets by source and column
                const datasets = [];
                
                for (const column of plotData.yAxisColumns) {
                    for (const source of sources) {
                        // Filter rows for this source
                        const sourceRows = csvData.filter(row => row.__source === source);
                        
                        // Skip if no rows for this source
                        if (sourceRows.length === 0) continue;
                        
                        // Get a color index based on column and source
                        const sourceIndex = sources.indexOf(source);
                        const columnIndex = plotData.yAxisColumns.indexOf(column);
                        const colorIndex = (columnIndex * sources.length + sourceIndex) % seriesColors.length;
                        
                        // Create a dataset for this source and column
                        datasets.push({
                            label: `${column.label || column.column} (${source})`,
                            data: sourceRows.map(row => Number(row[column.column]) || 0),
                            backgroundColor: column.color || seriesColors[colorIndex] + '66', // Add transparency
                            borderColor: column.color || seriesColors[colorIndex],
                            borderWidth: 2,
                            pointBackgroundColor: column.color || seriesColors[colorIndex],
                            tension: 0.1
                        });
                    }
                }
                
                return {
                    labels: allXValues,
                    datasets
                };
            } else {
                // Single source, original behavior
                const xValues = csvData.map(row => row[plotData.xAxisColumn || ''] || '');
                
                return {
                    labels: xValues,
                    datasets: plotData.yAxisColumns.map((col, index) => ({
                        label: col.label || col.column,
                        data: csvData.map(row => Number(row[col.column]) || 0),
                        backgroundColor: col.color || seriesColors[index % seriesColors.length] + '66', // Add transparency
                        borderColor: col.color || seriesColors[index % seriesColors.length],
                        borderWidth: 2,
                        pointBackgroundColor: col.color || seriesColors[index % seriesColors.length],
                        tension: 0.1
                    }))
                };
            }
        }
        
        // Default empty data
        return {
            labels: [],
            datasets: []
        };
    }, [plotData, csvData, seriesColors]);

    // Chart options
    const chartOptions = React.useMemo(() => {
        const options: ChartOptions<'line' | 'bar' | 'scatter'> = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    display: (chartData.datasets?.length || 0) > 1, // Only show legend when multiple series
                },
                title: {
                    display: true,
                    text: plotData?.title || 'Data Plot',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: theme.palette.grey[800],
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    padding: 10,
                    cornerRadius: 4
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: plotData?.xAxisLabel || plotData?.xAxis?.label || 'X',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: true,
                        color: theme.palette.grey[200]
                    }
                },
                y: {
                    type: plotData?.plotType === 'scatter' ? 'linear' : 'logarithmic',
                    title: {
                        display: true,
                        text: plotData?.yAxisLabel || plotData?.series?.[0]?.label || 'Y',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: true,
                        color: theme.palette.grey[200]
                    },
                    ticks: {
                        callback: (value) => {
                            const numValue = Number(value);
                            if (numValue === 0) return '0';
                            if (numValue < 1) return numValue.toExponential(0);
                            return numValue.toLocaleString();
                        }
                    },
                    // min: 0.1 // Set minimum value to avoid log(0) error
                }
            }
        };
        
        return options;
    }, [plotData?.title, plotData?.xAxis?.label, plotData?.xAxisLabel, plotData?.yAxisLabel, plotData?.series?.[0]?.label, plotData?.plotType, theme, chartData.datasets?.length]);

    // Render the appropriate chart based on plotType
    const renderChart = () => {
        // Ensure we have data to display
        const hasData = (chartData.labels.length > 0 && chartData.datasets.length > 0 && chartData.datasets[0].data.length > 0);
        
        if (!hasData) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    color: theme.palette.text.secondary
                }}>
                    <Typography variant="body1" gutterBottom>
                        No data to display
                    </Typography>
                    <Typography variant="caption">
                        Data structure received: {JSON.stringify({
                            series: plotData?.series?.length || 0,
                            xAxis: plotData?.xAxis?.data?.length || 0,
                            csvData: csvData?.length || 0,
                            filePath: plotData?.filePath,
                            filePaths: plotData?.filePaths ? 
                                (typeof plotData.filePaths === 'string' ? 
                                    plotData.filePaths : 
                                    `${plotData.filePaths.length} files`) :
                                null,
                            dataSeries: plotData?.dataSeries?.length || 0
                        })}
                    </Typography>
                </div>
            );
        }
        
        switch (plotData?.plotType) {
            case 'bar':
                return <Bar data={chartData} options={chartOptions} />;
            case 'scatter':
                return <Scatter data={chartData} options={chartOptions} />;
            case 'line':
            default:
                return <Line data={chartData} options={chartOptions} />;
        }
    };

    // If there's an error processing the plot data
    if (error || !plotData) {
        return (
            <div style={{ 
                backgroundColor: theme.palette.error.light,
                color: theme.palette.error.contrastText,
                padding: theme.spacing(2),
                borderRadius: theme.shape.borderRadius,
                margin: theme.spacing(1, 0)
            }}>
                <Typography variant="subtitle2" fontWeight="bold">
                    Error processing plot data
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
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem', margin: theme.spacing(0.5, 0, 0, 0) }}>
                        Plot data: {plotData ? JSON.stringify(plotData, null, 2) : 'null'}
                    </pre>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem', margin: theme.spacing(0.5, 0, 0, 0) }}>
                        CSV data: {csvData ? `${csvData.length} rows` : 'null'}
                    </pre>
                </div>
                
                <Typography variant="caption" color="textSecondary" style={{ marginTop: theme.spacing(1), display: 'block' }}>
                    Try reloading the page or check the console for more details.
                </Typography>
            </div>
        );
    }

    // If there's an error in the data itself
    if (plotData.error) {
        return (
            <div style={{ 
                backgroundColor: theme.palette.warning.light,
                padding: theme.spacing(2),
                borderRadius: theme.shape.borderRadius,
                margin: theme.spacing(1, 0)
            }}>
                <Typography variant="subtitle2" fontWeight="bold" color={theme.palette.warning.dark}>
                    Plot Error: {plotData.error}
                </Typography>
                {plotData.suggestion && (
                    <Typography variant="body2" style={{ marginTop: theme.spacing(1) }}>
                        Suggestion: {plotData.suggestion}
                    </Typography>
                )}
                {plotData.availableColumns && (
                    <div style={{ marginTop: theme.spacing(1) }}>
                        <Typography variant="body2" fontWeight="medium">
                            Available columns:
                        </Typography>
                        <ul style={{ margin: theme.spacing(0.5, 0, 0, 2) }}>
                            {plotData.availableColumns.map((col, idx) => (
                                <li key={idx}>
                                    <Typography variant="body2" component="span">
                                        {col}
                                    </Typography>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }

    // Show loading state while fetching CSV
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
                height: '350px'
            }}>
                <CircularProgress size={40} />
                <Typography variant="body2" style={{ marginTop: theme.spacing(2) }}>
                    Loading data from {plotData.filePath}...
                </Typography>
            </div>
        );
    }

    // Render the complete chart
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
                <DescriptionIcon />
                <Typography variant="subtitle1" fontWeight="medium">
                    {plotData.title || 'Data Plot'}
                </Typography>
            </div>
            
            <div style={{
                border: `1px solid ${theme.palette.grey[300]}`,
                borderRadius: theme.shape.borderRadius,
                padding: theme.spacing(2),
                backgroundColor: theme.palette.common.white,
                height: '350px',
                width: '100%'
            }}>
                {renderChart()}
            </div>

            <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: theme.spacing(1)
            }}>
                <Typography variant="caption" color="textSecondary">
                    Source: {plotData.filePath}
                </Typography>
                
                <Typography variant="caption" color="textSecondary">
                    {chartData.datasets.length > 1 
                        ? `${chartData.datasets.length} series, ${chartData.labels.length} data points`
                        : `${chartData.labels.length} data points`}
                </Typography>
            </div>
        </div>
    );
}; 