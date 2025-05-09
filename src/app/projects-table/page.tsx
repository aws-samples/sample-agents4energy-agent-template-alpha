"use client"
import React, { useEffect, useState } from 'react';
// import { stringify } from 'yaml';
// import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import { generateClient } from "aws-amplify/data";
import { fetchAuthSession } from 'aws-amplify/auth';
import { type Schema } from "@/../amplify/data/resource";
import {
    Box,
    Button,
    Paper,
    Typography,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Collapse,
    // IconButton,
    CircularProgress,
    Menu,
    MenuItem
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
// import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import VisibilityIcon from '@mui/icons-material/Visibility';
import OilBarrelIcon from '@mui/icons-material/LocalGasStation';
import GasIcon from '@mui/icons-material/Waves';
import DescriptionIcon from '@mui/icons-material/Description';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ChatIcon from '@mui/icons-material/Chat';
const amplifyClient = generateClient<Schema>();

// import { withAuth } from '@/components/WithAuth';

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

interface ExpandableRowProps {
    project: Schema["Project"]["createType"];
    onDelete: () => void;
    onStatusChange: (projectId: string, newStatus: ProjectStatus) => void;
}

const ExpandableRow = ({ project, onDelete, onStatusChange }: ExpandableRowProps) => {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [nextActionClicked, setNextActionClicked] = useState(false);
    const [statusAnchorEl, setStatusAnchorEl] = useState<null | HTMLElement>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const handleIframeLoad = () => {
        setIsLoading(false);
    };

    // Reset loading state when row is collapsed
    useEffect(() => {
        if (!open) {
            setIsLoading(true);
        }
    }, [open]);

    const hasNextAction = project.nextAction?.buttonTextBeforeClick && project.nextAction?.buttonTextAfterClick;

    const handleStatusClick = (event: React.MouseEvent<HTMLDivElement>) => {
        setStatusAnchorEl(event.currentTarget);
    };

    const handleStatusClose = () => {
        setStatusAnchorEl(null);
    };

    const handleStatusChange = async (newStatus: ProjectStatus) => {
        setIsUpdatingStatus(true);
        handleStatusClose();

        try {
            await amplifyClient.models.Project.update({
                id: project.id!,
                status: newStatus
            });
            onStatusChange(project.id!, newStatus);
        } catch (error) {
            console.error('Failed to update status:', error);
            // You might want to show an error message to the user here
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    return (
        <>
            <TableRow
                sx={{
                    '&:hover': { bgcolor: 'grey.50' }
                }}
            >
                <TableCell
                    component="th"
                    scope="row"
                    sx={{
                        fontWeight: 500,
                        pl: 3
                    }}
                >
                    {project.name}
                </TableCell>
                <TableCell
                    sx={{
                        maxWidth: '300px',
                        color: 'text.secondary',
                        fontSize: '0.875rem'
                    }}
                >
                    {project.description}
                </TableCell>
                <TableCell
                    align="right"
                    sx={{
                        fontFamily: 'monospace',
                        fontWeight: 500
                    }}
                >
                    {formatCurrency(project.financial?.revenuePresentValue || 0)}
                </TableCell>
                <TableCell
                    align="right"
                    sx={{
                        fontFamily: 'monospace',
                        fontWeight: 500
                    }}
                >
                    {formatCurrency(project.financial?.cost || 0)}
                </TableCell>
                <TableCell
                    align="right"
                    sx={{
                        fontFamily: 'monospace',
                        fontWeight: 500,
                        color: project.financial?.successProbability ?
                            project.financial.successProbability >= 0.7 ? 'success.main' :
                                project.financial.successProbability >= 0.4 ? 'warning.main' :
                                    'error.main'
                            : 'text.secondary'
                    }}
                >
                    {formatPercentage(project.financial?.successProbability)}
                </TableCell>
                <TableCell align="center">
                    <Box
                        onClick={handleStatusClick}
                        sx={{
                            display: 'inline-flex',
                            cursor: 'pointer',
                            position: 'relative'
                        }}
                    >
                        <Chip
                            label={isUpdatingStatus ? 'Updating...' : (project.status || 'Unknown')}
                            color={getStatusColor(project.status)}
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
                                selected={status === project.status}
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
                </TableCell>
                <TableCell align="right" sx={{ pr: 3 }}>
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                        {hasNextAction && (
                            <Button
                                size="small"
                                variant="contained"
                                color={nextActionClicked ? "primary" : "success"}
                                onClick={() => setNextActionClicked(true)}
                                sx={{
                                    transition: 'all 0.3s ease',
                                    ...(nextActionClicked && {
                                        bgcolor: 'primary.main',
                                        '&:hover': {
                                            bgcolor: 'primary.dark',
                                        }
                                    })
                                }}
                            >
                                {nextActionClicked ?
                                    project.nextAction?.buttonTextAfterClick :
                                    project.nextAction?.buttonTextBeforeClick}
                            </Button>
                        )}
                        <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                            <Button
                                size="small"
                                variant="outlined"
                                color="info"
                                onClick={() => setOpen(!open)}
                                startIcon={open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                endIcon={<DescriptionIcon />}
                            >
                                {open ? 'Hide Report' : 'View Report'}
                            </Button>
                            {project.sourceChatSessionId && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="secondary"
                                    startIcon={<ChatIcon />}
                                    href={`/chat/${project.sourceChatSessionId}`}
                                >
                                    View Chat
                                </Button>
                            )}
                            <Button
                                size="small"
                                variant="contained"
                                color="warning"
                                startIcon={<DeleteIcon />}
                                onClick={onDelete}
                            >
                                Delete
                            </Button>
                        </Box>
                    </Box>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <DescriptionIcon /> Project Report
                                </Typography>
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    startIcon={<VisibilityIcon />}
                                    onClick={() => window.open(`preview/chatSessionArtifacts/sessionId=${project.sourceChatSessionId}/${project.reportS3Path}`, '_blank')}
                                >
                                    Open in New Tab
                                </Button>
                            </Box>
                            <Box
                                sx={{
                                    width: '100%',
                                    height: '600px',
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
                                    src={`file/chatSessionArtifacts/sessionId=${project.sourceChatSessionId}/` + project.reportS3Path}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        border: 'none'
                                    }}
                                    title={`Report for ${project.name}`}
                                    onLoad={handleIframeLoad}
                                />
                            </Box>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
};

const Page = () => {
    // const { user } = useAuthenticator((context) => [context.user]);
    const [projects, setProjects] = useState<Schema["Project"]["createType"][]>([]);

    useEffect(() => {
        const fetchProjects = async () => {
            //First fetch the Auth Session to load the user's credentials (including guest credentials)
            const { userSub } = await fetchAuthSession();
            console.log('user sub: ', userSub);

            // const result = await amplifyClient.models.Project.list({
            //     // filter: {
            //     //     owner: {
            //     //         contains: user.userId
            //     //     }
            //     // }
            // });

            const result = await amplifyClient.models.Project.list({
                authMode: userSub ? "userPool" : "identityPool", //This allows unauthenticated users to read projects
            });
            // Filter out null/undefined projects before sorting
            const validProjects = result.data.filter(project => project != null);
            const sortedProjects = validProjects.sort((a, b) => {
                // Handle null/undefined projects
                if (!a || !b) return 0;

                // If either project lacks a createdAt, sort it to the end
                const dateA = a?.createdAt;
                const dateB = b?.createdAt;

                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;

                // Normal date comparison for projects with createdAt
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });
            setProjects(sortedProjects);
        };
        
        fetchProjects();
        // }, [user.userId]);
    }, []);

    const handleDeleteProject = async (projectId: string, projectName: string) => {
        if (window.confirm(`Are you sure you want to delete the project "${projectName}"?`)) {
            await amplifyClient.models.Project.delete({ id: projectId });
            setProjects(projects.filter(p => p.id !== projectId));
        }
    };

    const handleStatusChange = (projectId: string, newStatus: ProjectStatus) => {
        setProjects(currentProjects =>
            currentProjects.map(project =>
                project.id === projectId
                    ? { ...project, status: newStatus }
                    : project
            )
        );
    };

    // Calculate summary statistics from valid projects
    const validProjects = projects.filter(project => project != null);
    const totalProjects = validProjects.length;
    const totalNPV10 = validProjects.reduce((sum, project) => {
        if (!project?.financial) return sum;
        return sum + (project.financial.NPV10 || 0);
    }, 0);
    const totalOilRate = validProjects.reduce((sum, project) => {
        if (!project?.financial) return sum;
        return sum + (project.financial.incrimentalOilRateBOPD || 0);
    }, 0);
    const totalGasRate = validProjects.reduce((sum, project) => {
        if (!project?.financial) return sum;
        return sum + (project.financial.incrimentalGasRateMCFD || 0);
    }, 0);

    return (
        // <Authenticator>
            <Box p={3}>
                {/* Summary Statistics */}
                <Grid container spacing={3} mb={4}>
                    <Grid item xs={12} sm={6} md={3}>
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
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper
                            elevation={3}
                            sx={{
                                p: 3,
                                bgcolor: 'warning.main',
                                color: 'white',
                                borderRadius: 2
                            }}
                        >
                            <Typography variant="h6" sx={{ opacity: 0.8 }}>Total NPV10</Typography>
                            <Typography variant="h3" sx={{ mt: 1 }}>{formatCurrency(totalNPV10)}</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
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
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
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

                {/* Projects Table */}
                <TableContainer
                    component={Paper}
                    sx={{
                        borderRadius: 2,
                        '& .MuiTableCell-head': {
                            fontWeight: 'bold',
                            bgcolor: 'grey.50',
                            borderBottom: 'none',
                            borderRight: 'none'
                        },
                        '& .MuiTableCell-body': {
                            borderBottom: 'none',
                            borderRight: 'none',
                            py: 2
                        },
                        '& .MuiTableRow-root': {
                            borderBottom: '1px solid',
                            borderColor: 'grey.100',
                            '&:last-child': {
                                borderBottom: 'none'
                            }
                        },
                        '& .MuiTable-root': {
                            borderCollapse: 'collapse',
                            '& td, & th': {
                                borderRight: 'none'
                            }
                        }
                    }}
                >
                    <Table sx={{ minWidth: 650 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ pl: 3 }}>Name</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell align="right">PV10</TableCell>
                                <TableCell align="right">Cost</TableCell>
                                <TableCell align="right">Success Probability</TableCell>
                                <TableCell align="center">Status</TableCell>
                                <TableCell align="right" sx={{ pr: 3 }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {validProjects.map((project) => (
                                <ExpandableRow
                                    key={project.id}
                                    project={project}
                                    onDelete={() => handleDeleteProject(project.id!, project.name!)}
                                    onStatusChange={handleStatusChange}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        // </Authenticator>
    );
}

// Format percentage with one decimal place
const formatPercentage = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return '—';
    return `${(value * 100).toFixed(1)}%`;
};

export default Page;