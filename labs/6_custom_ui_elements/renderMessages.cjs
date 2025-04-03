// Helper functions to render different message types
const renderHumanMessage = (message) => `
    <div style="margin: 10px 0; padding: 10px; border-radius: 5px; background-color: #f0f7ff; border-left: 4px solid #007bff;">
        <div style="font-weight: bold; color: #007bff; margin-bottom: 5px;">User</div>
        <div style="white-space: pre-wrap;">${message.content}</div>
    </div>
`;

const renderAIMessage = (message) => `
    <div style="margin: 10px 0; padding: 10px; border-radius: 5px; background-color: #f8f9fa; border-left: 4px solid #28a745;">
        <div style="font-weight: bold; color: #28a745; margin-bottom: 5px;">Assistant</div>
        <div style="white-space: pre-wrap;">${
            Array.isArray(message.content) 
                ? message.content.map(c => c.text).join('\n')
                : message.content
        }</div>
    </div>
`;

const renderToolMessage = (message) => {
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

module.exports = {
    renderHumanMessage,
    renderAIMessage,
    renderToolMessage
}; 