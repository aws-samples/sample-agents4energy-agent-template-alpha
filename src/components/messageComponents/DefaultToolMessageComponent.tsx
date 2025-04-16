import React from 'react';
import { Message } from '@/../utils/types';

interface DefaultToolMessageComponentProps {
  message: Message;
}

const DefaultToolMessageComponent: React.FC<DefaultToolMessageComponentProps> = ({ message }) => {
  const renderContent = (text: string | null | undefined) => {
    if (!text) return null;
    
    try {
      const parsedJson = JSON.parse(text);
      return JSON.stringify(parsedJson, null, 2);
    } catch {
      // If parsing fails, return the raw text
      return text;
    }
  };

  return (
    <>
      <p>Tool message</p>
      <pre>
        {renderContent(message.content?.text)}
      </pre>
      <pre>
        {JSON.stringify(message, null, 2)}
      </pre>
    </>
  );
};

export default DefaultToolMessageComponent; 