import React, { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

interface CopyButtonProps {
  text: string;
  size?: 'small' | 'medium' | 'large';
}

const CopyButton: React.FC<CopyButtonProps> = ({ text, size = 'small' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <Tooltip title={copied ? 'Copied!' : 'Copy message'}>
      <IconButton
        onClick={handleCopy}
        size={size}
        sx={{
          opacity: 0.7,
          '&:hover': {
            opacity: 1
          }
        }}
      >
        {copied ? <CheckIcon fontSize={size} /> : <ContentCopyIcon fontSize={size} />}
      </IconButton>
    </Tooltip>
  );
};

export default CopyButton; 