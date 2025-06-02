"use client"
import React, { useEffect, useState } from 'react';
import { Chart as ChartJS, LinearScale, LogarithmicScale, PointElement, Tooltip, Legend } from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import { generateClient } from "aws-amplify/data";
import { fetchAuthSession } from 'aws-amplify/auth';
import { type Schema } from "@/../amplify/data/resource";
import {
    Box,
    Button,
    Paper,
    Typography,
    Grid2 as Grid, //MUI v6
    Chip,
    CircularProgress,
    Menu,
    MenuItem,
    Card,
    CardContent,
    Divider,
    CardActions,
    CardHeader,
    useTheme
} from '@mui/material';

// Register Chart.js components
ChartJS.register(LinearScale, LogarithmicScale, PointElement, Tooltip, Legend);
import GasIcon from '@mui/icons-material/Waves';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
const amplifyClient = generateClient<Schema>();

// Format large numbers with commas and handle millions/billions
const formatCurrency = (value: number): string => {
    if (value >= 1_000_000_000) {
        return `$${(value / 1_000_000_000).toFixed(1)}B`;
    }
    if (value >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
        return `$${(value / 1_000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
};

// Format numbers with commas
const formatNumber = (value: number): string => {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

// Format percentage with one decimal place
const formatPercentage = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return '—';
    return `${(value * 100).toFixed(1)}%`;
};

// Format date to a more readable format
const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

type ProjectStatus = NonNullable<Schema["Project"]["createType"]["status"]>;

// Available status options - these should match the schema
const STATUS_OPTIONS: ProjectStatus[] = [
    'drafting',
    'proposed',
    'approved',
    'rejected',
    'scheduled',
    'in_progress',
    'completed',
    'failed'
];

// Convert theme color to RGBA string
const getStatusColorRgba = (status: ProjectStatus | null | undefined, opacity: string, theme: any): string => {
    if (!status) return `rgba(158, 158, 158, ${opacity})`; // default gray for null/undefined status
    
    // Get the color name from the status
    const colorName = getStatusColor(status);
    
    // Get the RGB values from the theme
    let rgbColor;
    switch (colorName) {
        case 'primary': rgbColor = theme.palette.primary.main; break;
        case 'secondary': rgbColor = theme.palette.secondary.main; break;
        case 'error': rgbColor = theme.palette.error.main; break;
        case 'warning': rgbColor = theme.palette.warning.main; break;
        case 'info': rgbColor = theme.palette.info.main; break;
        case 'success': rgbColor = theme.palette.success.main; break;
        case 'default':
        default: rgbColor = theme.palette.grey[500]; break;
    }
    
    // Convert hex color to RGB components
    const hexToRgb = (hex: string) => {
        // Remove the # if present
        hex = hex.replace('#', '');
        
        // Parse the hex values
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return { r, g, b };
    };
    
    // Convert the theme color to RGB and return as rgba string
    const rgb = hexToRgb(rgbColor);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
};

const getStatusColor = (status: ProjectStatus | null | undefined): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    if (!status) return 'default';

    switch (status) {
        case 'proposed': return 'info';
        case 'approved': return 'success';
        case 'rejected': return 'error';
        case 'in_progress': return 'warning';
        case 'completed': return 'success';
        case 'failed': return 'error';
        case 'scheduled': return 'primary';
        case 'drafting': return 'default';
        default: return 'default';
    }
};

type createProjectTypeWithCreateAtField =  Omit<Schema["Project"]["createType"], "createdAt"> & {
    createdAt?: string;
  };
const Page = () => {
    const [projects, setProjects] = useState<Schema["Project"]["createType"][]>([]);
    const [selectedProject, setSelectedProject] = useState<createProjectTypeWithCreateAtField | null>(null);
    const [statusAnchorEl, setStatusAnchorEl] = useState<null | HTMLElement>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [reportIsOpen, setReportIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [nextActionClicked, setNextActionClicked] = useState(false);
    const hasNextAction = selectedProject?.nextAction?.buttonTextBeforeClick && selectedProject.nextAction?.buttonTextAfterClick;

    const theme = useTheme();

    const handleStatusClick = (event: React.MouseEvent<HTMLDivElement>) => {
        setStatusAnchorEl(event.currentTarget);
    };

    const handleStatusClose = () => {
        setStatusAnchorEl(null);
    };

    const handleStatusChange = async (newStatus: ProjectStatus) => {
        setIsUpdatingStatus(true);
        handleStatusClose();

        if (!selectedProject) return

        try {
            await amplifyClient.models.Project.update({
                id: selectedProject.id!,
                status: newStatus
            });
            setSelectedProject({ ...selectedProject, status: newStatus });
            setProjects(projects.map(project => {
                if (project.id === selectedProject.id) {
                    return { ...project, status: newStatus };
                }
                return project;
            }));
            // onStatusChange(project.id!, newStatus);
        } catch (error) {
            console.error('Failed to update status:', error);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    useEffect(() => {
        const fetchProjects = async () => {
            const { userSub } = await fetchAuthSession();
            const result = await amplifyClient.models.Project.list({
                authMode: userSub ? "userPool" : "identityPool",
            });
            console.log("First Project: ", result.data[0])
            const validProjects = result
                .data
                .filter(project => 
                    (project != null)
                    // project.financial?.revenuePresentValue// &&
                    // (project.financial?.revenuePresentValue > 0)
            );
            const sortedProjects = validProjects.sort((a, b) => {
                if (!a || !b) return 0;
                const dateA = a?.createdAt;
                const dateB = b?.createdAt;

                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;

                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });
            setProjects(sortedProjects);

            
        };

        fetchProjects();
    }, []);

    const handleDeleteProject = async (projectId: string, projectName: string) => {
        if (window.confirm(`Are you sure you want to delete the project "${projectName}"?`)) {
            await amplifyClient.models.Project.delete({ id: projectId });
            setProjects(projects.filter(p => p.id !== projectId));
        }
    };

    // Calculate summary statistics from valid projects
    const validProjects = projects.filter(project => project != null);
    const totalProjects = validProjects.length;
    const totalNPV10 = validProjects.reduce((sum, project) => {
        if (!project?.financial || !project.financial.revenuePresentValue || !project.financial.cost) return sum;
        const {revenuePresentValue, cost} = project.financial
        const npv10 = revenuePresentValue - cost;
        return sum + (npv10|| 0);
    }, 0);
    const totalOilRate = validProjects.reduce((sum, project) => {
        if (!project?.financial) return sum;
        return sum + (project.financial.incrimentalOilRateBOPD || 0);
    }, 0);
    const totalGasRate = validProjects.reduce((sum, project) => {
        if (!project?.financial) return sum;
        return sum + (project.financial.incrimentalGasRateMCFD || 0);
    }, 0);
    
    // Calculate total rate of return (weighted average based on project costs)
    let totalCost = 0;
    let totalRevenue = 0;
    validProjects.forEach(project => {
        if (project?.financial) {
            totalCost += project.financial.cost || 0;
            totalRevenue += project.financial.revenuePresentValue || 0;
        }
    });
    
    const totalNetPresentValue10Ratio = totalCost > 0 ? (totalRevenue - totalCost) / totalCost : 0;

    console.log({totalRevenue: totalRevenue, totalCost: totalCost, totalNetPresentValue10Ratio: totalNetPresentValue10Ratio})

    // Scatter plot data preparation
    const scatterData = {
        datasets: [{
            label: 'Projects',
            data: validProjects.map(project => ({
                x: project.financial?.cost || 0,
                y: project.financial?.revenuePresentValue || 0,
                project: project
            })),
            pointRadius: validProjects.map(project => 
                selectedProject && project.id === selectedProject.id ? 10 : 8
            ),
            pointHoverRadius: 12,
            borderColor: validProjects.map(project => 
                selectedProject && project.id === selectedProject.id ? '#000000' : 'transparent'
            ),
            borderWidth: validProjects.map(project => 
                selectedProject && project.id === selectedProject.id ? 2 : 0
            ),
            backgroundColor: validProjects.map(project => {
                const status = project.status;
                const opacity = (selectedProject && project.id === selectedProject.id) ? '0.9': '0.6';
                return getStatusColorRgba(status, opacity, theme);
            })
        }]
    };

    const chartOptions: any = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        const project = context.dataset.data[context.dataIndex].project;
                        return `${project.name} - PV10: ${formatCurrency(project.financial?.revenuePresentValue || 0)}, Cost: ${formatCurrency(project.financial?.cost || 0)}`;
                    }
                }
            }
        },
        scales: {
            x: {
                // type: 'linear',
                type: 'logarithmic' as const,
                title: {
                    display: true,
                    text: 'Project Cost',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                ticks: {
                    callback: (value: number) => formatCurrency(value),
                    maxTicksLimit: 8 // Limit the number of ticks displayed
                }
            },
            y: {
                type: 'logarithmic' as const,
                title: {
                    display: true,
                    text: 'PV10 (Present Value) - Log Scale',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                // min: 1,
                ticks: {
                    callback: (value: number) => formatCurrency(value),
                    maxTicksLimit: 8 // Limit the number of ticks displayed
                }
            }
        },
        onClick: (event: any, elements: any[]) => {
            if (elements.length > 0) {
                const dataIndex = elements[0].index;
                const selectedProjectData = scatterData.datasets[0].data[dataIndex];
                setSelectedProject(selectedProjectData.project);
                setIsLoading(false);
                setReportIsOpen(false);
                setNextActionClicked(false);
            }
        }
    };

    return (
        <Box p={3}>
            {/* Summary Statistics */}
            <Grid container spacing={3} sx={{ justifyContent: 'center' }}>
                <Grid>
                    <Paper
                        elevation={3}
                        sx={{
                            p: 3,
                            bgcolor: 'primary.main',
                            color: 'white',
                            borderRadius: 2
                        }}
                    >
                        <Typography variant="h6" sx={{ opacity: 0.8 }}>Total Projects</Typography>
                        <Typography variant="h3" sx={{ mt: 1 }}>{totalProjects}</Typography>
                    </Paper>
                </Grid>
                <Grid>
                    <Paper
                        elevation={3}
                        sx={{
                            p: 3,
                            bgcolor: 'success.main',
                            color: 'white',
                            borderRadius: 2
                        }}
                    >
                        <Typography variant="h6" sx={{ opacity: 0.8 }}>Total NPV10</Typography>
                        <Typography variant="h3" sx={{ mt: 1 }}>{formatCurrency(totalNPV10)}</Typography>
                    </Paper>
                </Grid>
                <Grid>
                    <Paper
                        elevation={3}
                        sx={{
                            p: 3,
                            bgcolor: 'secondary.main',
                            color: 'white',
                            borderRadius: 2,
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TrendingUpIcon />
                            <Typography variant="h6" sx={{ opacity: 0.8 }}>Total Net Present Value (10%) Ratio </Typography>
                        </Box>
                        <Typography variant="h3" sx={{ mt: 1 }}>
                            {totalNetPresentValue10Ratio.toFixed(1)}
                        </Typography>
                    </Paper>
                </Grid>
                {/* <Grid>
                    <Paper
                        elevation={3}
                        sx={{
                            p: 3,
                            bgcolor: 'success.main',
                            color: 'white',
                            borderRadius: 2,
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <OilBarrelIcon />
                            <Typography variant="h6" sx={{ opacity: 0.8 }}>Additional Oil Rate</Typography>
                        </Box>
                        <Typography variant="h3" sx={{ mt: 1 }}>
                            {formatNumber(totalOilRate)}
                            <Typography component="span" variant="h6" sx={{ ml: 1, opacity: 0.8 }}>BOPD</Typography>
                        </Typography>
                    </Paper>
                </Grid> */}
                <Grid>
                    <Paper
                        elevation={3}
                        sx={{
                            p: 3,
                            bgcolor: 'info.main',
                            color: 'white',
                            borderRadius: 2,
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <GasIcon />
                            <Typography variant="h6" sx={{ opacity: 0.8 }}>Additional Gas Rate</Typography>
                        </Box>
                        <Typography variant="h3" sx={{ mt: 1 }}>
                            {formatNumber(totalGasRate)}
                            <Typography component="span" variant="h6" sx={{ ml: 1, opacity: 0.8 }}>MCFD</Typography>
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Projects Scatter Plot and Details */}
            <Grid container spacing={3} mt='20px' sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
                <Grid size={3}>
                    <Paper elevation={3} sx={{ p: 2, paddingBottom: 5, height: '700px' }}>
                        <Typography variant="h6" gutterBottom>
                            Project Portfolio Visualization
                        </Typography>
                        <Scatter data={scatterData} options={chartOptions} />
                    </Paper>
                </Grid>
                <Grid size={9}>
                    {selectedProject ? (
                        <Card
                            elevation={3}
                            sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                flex: 1
                            }}
                        >
                            <CardHeader
                                title={selectedProject.name}
                            />
                            <CardContent sx={{
                                flexGrow: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                                overflow: 'hidden'
                            }}>
                                {reportIsOpen ? (
                                    <Box
                                        sx={{
                                            width: '100%',
                                            height: '100%',
                                            border: '1px solid',
                                            borderColor: 'grey.300',
                                            borderRadius: 1,
                                            position: 'relative'
                                        }}
                                    >
                                        {isLoading && (
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    bgcolor: 'rgba(255, 255, 255, 0.7)',
                                                    backdropFilter: 'blur(2px)',
                                                    zIndex: 1
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        textAlign: 'center',
                                                        bgcolor: 'background.paper',
                                                        p: 2,
                                                        borderRadius: 1,
                                                        boxShadow: 1
                                                    }}
                                                >
                                                    <CircularProgress size={30} />
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                        sx={{ mt: 1 }}
                                                    >
                                                        Loading report...
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        )}
                                        <iframe
                                            src={`file/chatSessionArtifacts/sessionId=${selectedProject.sourceChatSessionId}/` + selectedProject.reportS3Path}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                border: 'none'
                                            }}
                                            title={`Report for ${selectedProject.name}`}
                                            onLoad={() => setIsLoading(false)}
                                        />
                                    </Box>
                                ) : (<>
                                    <Typography variant="body1">
                                        <strong>Description:</strong> {selectedProject.description}
                                    </Typography>
                                    <Typography variant="body1" sx={{ mt: 1 }}>
                                        <strong>Cost:</strong> {formatCurrency(selectedProject.financial?.cost || 0)}
                                    </Typography>
                                    <Typography variant="body1" sx={{ mt: 1 }}>
                                        <strong>Revenue PV10:</strong> {formatCurrency(selectedProject.financial?.revenuePresentValue || 0)}
                                    </Typography>
                                    <Typography variant="body1" sx={{ mt: 1 }}>
                                        <strong>Success Probability:</strong> {formatPercentage(selectedProject.financial?.successProbability)}
                                    </Typography>
                                    <Typography variant="body1" sx={{ mt: 1 }}>
                                        <strong>Status: </strong>
                                        <Box
                                            onClick={handleStatusClick}
                                            sx={{
                                                display: 'inline-flex',
                                                cursor: 'pointer',
                                                position: 'relative'
                                            }}
                                        >
                                            <Chip
                                                label={isUpdatingStatus ? 'Updating...' : (selectedProject.status || 'Unknown')}
                                                color={getStatusColor(selectedProject.status)}
                                                size="small"
                                                sx={{
                                                    minWidth: '90px',
                                                    textTransform: 'capitalize'
                                                }}
                                            />
                                            {isUpdatingStatus && (
                                                <CircularProgress
                                                    size={16}
                                                    sx={{
                                                        position: 'absolute',
                                                        top: '50%',
                                                        left: '50%',
                                                        marginTop: '-8px',
                                                        marginLeft: '-8px'
                                                    }}
                                                />
                                            )}
                                        </Box>
                                        <Menu
                                            anchorEl={statusAnchorEl}
                                            open={Boolean(statusAnchorEl)}
                                            onClose={handleStatusClose}
                                        >
                                            {STATUS_OPTIONS.map((status) => (
                                                <MenuItem
                                                    key={status}
                                                    onClick={() => handleStatusChange(status)}
                                                    selected={status === selectedProject.status}
                                                >
                                                    <Chip
                                                        label={status}
                                                        color={getStatusColor(status)}
                                                        size="small"
                                                        sx={{
                                                            minWidth: '90px',
                                                            textTransform: 'capitalize'
                                                        }}
                                                    />
                                                </MenuItem>
                                            ))}
                                        </Menu>
                                    </Typography>
                                    <Typography variant="body1" sx={{ mt: 1 }}>
                                        <strong>Creation Date:</strong> {formatDate(selectedProject.createdAt)}
                                    </Typography>

                                </>
                                )
                                }
                            </CardContent>
                            <CardActions>
                                <Button
                                    variant="contained"
                                    color="warning"
                                    onClick={() => handleDeleteProject(selectedProject.id!, selectedProject.name!)}
                                >
                                    Delete Project
                                </Button>
                                {selectedProject.sourceChatSessionId && (
                                    <>
                                        <Button
                                            variant="outlined"
                                            color="primary"
                                            href={`/chat/${selectedProject.sourceChatSessionId}`}
                                        >
                                            View Chat
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            onClick={() => { setIsLoading(!reportIsOpen); setReportIsOpen(!reportIsOpen) }}
                                        >
                                            {reportIsOpen ? "Close Report" : "View Report"}
                                        </Button>
                                    </>
                                )}
                                {hasNextAction && (
                                    <Button
                                        // size="small"
                                        variant="contained"
                                        color={!nextActionClicked ? "info" : "success"}
                                        onClick={() => setNextActionClicked(!nextActionClicked)}
                                        sx={{
                                            transition: 'all 0.3s ease',
                                            alignSelf: 'flex-start',
                                        }}
                                    >
                                        {nextActionClicked ?
                                            selectedProject.nextAction?.buttonTextAfterClick :
                                            selectedProject.nextAction?.buttonTextBeforeClick}
                                    </Button>
                                )}
                            </CardActions>
                        </Card>
                    ) : (
                        <Paper
                            elevation={3}
                            sx={{
                                p: 4,
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Typography variant="h6" color="text.secondary">
                                Select a project to view details
                            </Typography>
                        </Paper>
                    )}
                </Grid>
            </Grid>
        </Box>
    );
}

export default Page;
