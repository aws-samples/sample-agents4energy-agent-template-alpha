"use client"
import React, { useEffect, useState } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { generateClient } from "aws-amplify/data";
import { type Schema } from "@/../amplify/data/resource";
import {
    Box,
    Button,
    Card,
    CardContent,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControlLabel,
    Checkbox,
    IconButton,
    Chip,
    Grid2 as Grid,
    Paper,
    Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import ServerIcon from '@mui/icons-material/Storage';

const amplifyClient = generateClient<Schema>();

type McpServer = Schema["McpServer"]["type"];
type HeaderEntry = Schema["HeaderEntry"]["type"];

const McpServersPage = () => {
    const { user } = useAuthenticator((context) => [context.user]);
    const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingServer, setEditingServer] = useState<McpServer | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        headers: [] as HeaderEntry[],
        signRequestsWithAwsCreds: false,
        enabled: true
    });

    useEffect(() => {
        fetchMcpServers();
    }, [user.userId]);

    const fetchMcpServers = async () => {
        try {
            const result = await amplifyClient.models.McpServer.list({
                filter: {
                    owner: {
                        contains: user.userId
                    }
                }
            });
            const sortedServers = result.data.sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setMcpServers(sortedServers);
        } catch (error) {
            console.error('Error fetching MCP servers:', error);
        }
    };

    const handleOpenDialog = (server?: McpServer) => {
        if (server) {
            setEditingServer(server);
            setFormData({
                name: server.name || '',
                url: server.url || '',
                headers: (server.headers || []).filter((h): h is HeaderEntry => h !== null && h !== undefined),
                signRequestsWithAwsCreds: server.signRequestsWithAwsCreds || false,
                enabled: server.enabled ?? true
            });
        } else {
            setEditingServer(null);
            setFormData({
                name: '',
                url: '',
                headers: [],
                signRequestsWithAwsCreds: false,
                enabled: true
            });
        }
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingServer(null);
        setFormData({
            name: '',
            url: '',
            headers: [],
            signRequestsWithAwsCreds: false,
            enabled: true
        });
    };

    const handleSave = async () => {
        console.log('handle save triggered')
        try {
            if (editingServer) {
                // Update existing server
                await amplifyClient.models.McpServer.update({
                    id: editingServer.id!,
                    name: formData.name,
                    url: formData.url,
                    headers: formData.headers,
                    signRequestsWithAwsCreds: formData.signRequestsWithAwsCreds,
                    enabled: formData.enabled
                });
            } else {
                console.log('creating new server')
                console.log({formData})
                // Create new server
                const createServerResponse = await amplifyClient.models.McpServer.create({
                    name: formData.name,
                    url: formData.url,
                    headers: formData.headers,
                    signRequestsWithAwsCreds: formData.signRequestsWithAwsCreds,
                    enabled: formData.enabled
                });

                console.log({createServerResponse})
            }
            handleCloseDialog();
            fetchMcpServers();
        } catch (error) {
            console.error('Error saving MCP server:', error);
            alert(`Failed to save MCP server: ${error}`);
        }
    };

    const handleDelete = async (serverId: string, serverName: string) => {
        if (window.confirm(`Are you sure you want to delete the MCP server "${serverName}"?`)) {
            try {
                await amplifyClient.models.McpServer.delete({ id: serverId });
                setMcpServers(mcpServers.filter(s => s.id !== serverId));
            } catch (error) {
                console.error('Error deleting MCP server:', error);
                alert('Failed to delete MCP server.');
            }
        }
    };

    const handleAddHeader = () => {
        setFormData({
            ...formData,
            headers: [...formData.headers, { key: '', value: '' }]
        });
    };

    const handleRemoveHeader = (index: number) => {
        const newHeaders = formData.headers.filter((_, i) => i !== index);
        setFormData({
            ...formData,
            headers: newHeaders
        });
    };

    const handleHeaderChange = (index: number, field: 'key' | 'value', value: string) => {
        const newHeaders = [...formData.headers];
        newHeaders[index] = { ...newHeaders[index], [field]: value };
        setFormData({
            ...formData,
            headers: newHeaders
        });
    };

    return (
        <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    MCP Servers
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Add MCP Server
                </Button>
            </Box>

            {mcpServers.length === 0 ? (
                <Paper
                    elevation={3}
                    sx={{
                        p: 4,
                        textAlign: 'center',
                        bgcolor: 'grey.50'
                    }}
                >
                    <ServerIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        No MCP Servers Configured
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={3}>
                        Add your first MCP server to start using external tools and resources.
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                    >
                        Add MCP Server
                    </Button>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {mcpServers.map((server) => (
                        <Grid key={server.id} size={{ xs: 12, md: 6, lg: 4 }}>
                            <Card elevation={3}>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                        <Typography variant="h6" component="h2">
                                            {server.name}
                                        </Typography>
                                        <Box>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleOpenDialog(server)}
                                                color="primary"
                                            >
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDelete(server.id!, server.name!)}
                                                color="error"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>
                                    </Box>

                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        <strong>URL:</strong> {server.url}
                                    </Typography>

                                    <Box mb={2} display="flex" gap={1} flexWrap="wrap">
                                        <Chip
                                            label={server.enabled ?? true ? "Enabled" : "Disabled"}
                                            color={server.enabled ?? true ? "success" : "error"}
                                            size="small"
                                        />
                                        <Chip
                                            label={server.signRequestsWithAwsCreds ? "AWS Signed" : "No AWS Signing"}
                                            color={server.signRequestsWithAwsCreds ? "success" : "default"}
                                            size="small"
                                        />
                                    </Box>

                                    {server.headers && server.headers.length > 0 && (
                                        <>
                                            <Divider sx={{ my: 1 }} />
                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                <strong>Headers:</strong>
                                            </Typography>
                                            {server.headers.map((header, index) => (
                                                header && (
                                                    <Typography key={index} variant="caption" display="block">
                                                        {header.key}: {header.value}
                                                    </Typography>
                                                )
                                            ))}
                                        </>
                                    )}

                                    <Typography variant="caption" color="text.secondary" display="block" mt={2}>
                                        Created: {new Date(server.createdAt).toLocaleDateString()}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {editingServer ? 'Edit MCP Server' : 'Add MCP Server'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <TextField
                            fullWidth
                            label="Server Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Server URL"
                            value={formData.url}
                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                            margin="normal"
                            required
                            placeholder="https://example.com/mcp"
                        />
                        
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={formData.signRequestsWithAwsCreds}
                                    onChange={(e) => setFormData({ 
                                        ...formData, 
                                        signRequestsWithAwsCreds: e.target.checked 
                                    })}
                                />
                            }
                            label="Sign requests with AWS credentials"
                            sx={{ mt: 2, mb: 1 }}
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={formData.enabled}
                                    onChange={(e) => setFormData({ 
                                        ...formData, 
                                        enabled: e.target.checked 
                                    })}
                                />
                            }
                            label="Enable server"
                            sx={{ mt: 2, mb: 1 }}
                        />

                        <Box>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6">Headers</Typography>
                                <Button
                                    size="small"
                                    onClick={handleAddHeader}
                                    startIcon={<AddIcon />}
                                >
                                    Add Header
                                </Button>
                            </Box>
                            
                            {formData.headers.map((header, index) => (
                                <Box key={index} display="flex" gap={2} mb={2} alignItems="center">
                                    <TextField
                                        label="Key"
                                        value={header.key}
                                        onChange={(e) => handleHeaderChange(index, 'key', e.target.value)}
                                        size="small"
                                        sx={{ flex: 1 }}
                                    />
                                    <TextField
                                        label="Value"
                                        value={header.value}
                                        onChange={(e) => handleHeaderChange(index, 'value', e.target.value)}
                                        size="small"
                                        sx={{ flex: 1 }}
                                    />
                                    <IconButton
                                        size="small"
                                        onClick={() => handleRemoveHeader(index)}
                                        color="error"
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button 
                        onClick={handleSave} 
                        variant="contained"
                        disabled={!formData.name || !formData.url}
                    >
                        {editingServer ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default McpServersPage;
