import React from 'react';
import { Theme } from '@mui/material/styles';
import { Typography } from '@mui/material';
import { Message } from '@/../utils/types';

interface ThinkingComponentProps {
    message: Message;
    theme: Theme;
}

const ThinkingMessageComponent: React.FC<ThinkingComponentProps> = ({ message, theme }) => {
    return (
        <div style={{
            // display: 'flex',
            // flexDirection: 'column',
            width: '100%',
            maxHeight: '100px',
            overflowY: 'auto'
        }}>
            <div style={{
                backgroundColor: theme.palette.grey[100],
                padding: theme.spacing(0.75),
                borderRadius: theme.shape.borderRadius,
                opacity: 0.8,
            }}>
                <Typography variant="body2" color="text.secondary">
                    Thinking:
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem', fontStyle: 'italic' }}>
                    {message.content?.text}
                </Typography>
            </div>
        </div>
    );
};

export default ThinkingMessageComponent;
