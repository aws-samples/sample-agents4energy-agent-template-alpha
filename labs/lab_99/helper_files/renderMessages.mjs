import { createTheme } from '@mui/material/styles';

// Create a default theme similar to your app's theme
export const defaultTheme = createTheme({
    palette: {
      primary: {
        main: '#1976d2',
        contrastText: '#ffffff'
      },
      error: {
        main: '#d32f2f',
        dark: '#c62828',
        light: '#ffebee'
      },
      success: {
        main: '#4caf50',
        dark: '#388e3c'
      },
      warning: {
        main: '#ff9800'
      },
      grey: {
        50: '#fafafa',
        200: '#eeeeee',
        300: '#e0e0e0'
      },
      common: {
        white: '#ffffff'
      },
      text: {
        primary: '#212121',
        secondary: '#757575'
      }
    },
    shape: {
      borderRadius: 4
    },
    spacing: (factor) => `${0.5 * factor}rem`
  });

// Helper functions to render different message types
export const renderHumanMessage = (message) => `
    <div style="margin: 10px 0; padding: 10px; border-radius: 5px; background-color: #f0f7ff; border-left: 4px solid #007bff;">
        <div style="font-weight: bold; color: #007bff; margin-bottom: 5px;">User</div>
        <div style="white-space: pre-wrap;">${message.content}</div>
    </div>
`;

export const renderAIMessage = (message) => `
    <div style="margin: 10px 0; padding: 10px; border-radius: 5px; background-color: #f8f9fa; border-left: 4px solid #28a745;">
        <div style="font-weight: bold; color: #28a745; margin-bottom: 5px;">Assistant</div>
        <div style="white-space: pre-wrap;">${
            Array.isArray(message.content) 
                ? message.content.map(c => c.text).join('\n')
                : message.content
        }</div>
        ${message.tool_calls && message.tool_calls.length > 0 ? `
        <div style="margin-top: 10px; padding: 8px; background-color: #f0f7ff; border-radius: 4px; border: 1px solid #ccc;">
            <div style="font-weight: bold; color: #0066cc; margin-bottom: 5px;">Tool Calls:</div>
            ${message.tool_calls.map(tool => `
                <div style="margin: 5px 0; padding: 5px; background-color: #ffffff; border-radius: 3px; border: 1px solid #e0e0e0;">
                    <div><strong>Tool:</strong> ${tool.name}</div>
                    <div><strong>Arguments:</strong> <pre style="margin: 5px 0; padding: 5px; background-color: #f5f5f5; border-radius: 3px; overflow-x: auto;">${JSON.stringify(tool.args, null, 2)}</pre></div>
                </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
`;

export const renderUserInputToolMessage = (message) => {
    const toolContent = JSON.parse(message.content);
    return `
        <div style="margin: 10px 0; padding: 15px; border-radius: 5px; border: 1px solid #ccc; background-color: white;">
            <h3 style="margin-top: 0; color: #333;">${toolContent.title}</h3>
            <p style="white-space: pre-wrap; color: #666;">${toolContent.description}</p>
            <button 
                onclick="this.textContent='${toolContent.buttonTextAfterClick}'; this.disabled=true; this.style.backgroundColor='#28a745';"
                style="padding: 8px 16px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                ${toolContent.buttonTextBeforeClick}
            </button>
        </div>
    `;
};

export const renderCalculatorToolMessage = (message) => `
    <div style="margin: 10px 0; padding: 15px; border-radius: 5px; border: 1px solid #ccc; background-color: #f8f9fa;">
        <div style="font-weight: bold; color: #6610f2; margin-bottom: 5px;">Calculator</div>
        <div style="display: flex; align-items: center; gap: 10px; margin: 10px 0;">
            <span style="font-size: 1.2em;">${message.content}</span>
        </div>
    </div>
`;

export const renderPermeabilityCalculatorMessage = (message) => {
    const data = JSON.parse(message.content);
    
    // Define color based on assessment
    const getAssessmentColor = (assessment) => {
        const colorMap = {
            'Excellent reservoir quality': '#28a745',
            'Good reservoir quality': '#17a2b8',
            'Moderate reservoir quality': '#ffc107',
            'Poor reservoir quality': '#dc3545',
            'Very poor reservoir quality': '#6c757d'
        };
        return colorMap[assessment] || '#6c757d';
    };

    return `
        <div style="margin: 10px 0; padding: 20px; border-radius: 8px; background-color: #f8f9fa; border: 1px solid #e9ecef; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="font-weight: bold; color: #495057; margin-bottom: 15px; font-size: 1.1em;">
                Permeability Analysis Results
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px;">
                <div style="background-color: white; padding: 12px; border-radius: 6px; border: 1px solid #dee2e6;">
                    <div style="color: #6c757d; font-size: 0.9em; margin-bottom: 5px;">Permeability</div>
                    <div style="font-weight: bold; font-size: 1.2em; color: #212529;">${data.permeability_md} mD</div>
                </div>
                <div style="background-color: white; padding: 12px; border-radius: 6px; border: 1px solid #dee2e6;">
                    <div style="color: #6c757d; font-size: 0.9em; margin-bottom: 5px;">Rock Type</div>
                    <div style="font-weight: bold; font-size: 1.2em; color: #212529; text-transform: capitalize;">${data.rock_type}</div>
                </div>
                <div style="background-color: white; padding: 12px; border-radius: 6px; border: 1px solid #dee2e6;">
                    <div style="color: #6c757d; font-size: 0.9em; margin-bottom: 5px;">Porosity</div>
                    <div style="font-weight: bold; font-size: 1.2em; color: #212529;">${(data.porosity * 100).toFixed(1)}%</div>
                </div>
                <div style="background-color: white; padding: 12px; border-radius: 6px; border: 1px solid #dee2e6;">
                    <div style="color: #6c757d; font-size: 0.9em; margin-bottom: 5px;">Assessment</div>
                    <div style="font-weight: bold; font-size: 1.1em; color: ${getAssessmentColor(data.assessment)};">
                        ${data.assessment}
                    </div>
                </div>
            </div>
        </div>
    `;
};

