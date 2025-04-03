import React from 'react';
import { Theme } from '@mui/material/styles';
import CalculateIcon from '@mui/icons-material/Calculate';
import { Message } from '@/../utils/types';

interface CalculatorToolComponentProps {
  content: Message['content'];
  theme: Theme;
}

const CalculatorToolComponent: React.FC<CalculatorToolComponentProps> = ({ content, theme }) => {
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
        {content?.text}
      </div>
    </div>
  );
};

export default CalculatorToolComponent; 