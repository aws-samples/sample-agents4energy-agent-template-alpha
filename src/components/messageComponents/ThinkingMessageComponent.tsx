import React from 'react';
import { Theme } from '@mui/material/styles';
import { Typography } from '@mui/material';
import { Message } from '@/../utils/types';
import { Streamdown } from 'streamdown';

interface ThinkingComponentProps {
    message: Message;
    theme: Theme;
}

const ThinkingMessageComponent: React.FC<ThinkingComponentProps> = ({ message, theme }) => {
    return (
        <div style={{
            width: '100%',
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
                    <Streamdown isAnimating={true}>
                        {message.content?.text}
                    </Streamdown>
                </Typography>
            </div>
        </div>
    );
};

export default ThinkingMessageComponent;
