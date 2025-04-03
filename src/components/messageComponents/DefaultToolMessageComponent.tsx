import React from 'react';
import { Message } from '@/../utils/types';

interface DefaultToolMessageComponentProps {
  message: Message;
}

const DefaultToolMessageComponent: React.FC<DefaultToolMessageComponentProps> = ({ message }) => {
  return (
    <>
      <p>Tool message</p>
      <pre>
        {JSON.stringify(JSON.parse(message.content?.text || '{}'), null, 2)}
      </pre>
      <pre>
        {JSON.stringify(message, null, 2)}
      </pre>
    </>
  );
};

export default DefaultToolMessageComponent; 