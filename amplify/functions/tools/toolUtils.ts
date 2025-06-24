// Global variable for storing the chat session ID provided by the handler
let _chatSessionId: string | null = null;
let _foundationModelId: string | null = null;

export function setFoundationModelId(foundationModel: string) {
    _foundationModelId = foundationModel;
}

export function getFoundationModelId() {
    return _foundationModelId;
}

// Function to set the chat session ID from the handler
export function setChatSessionId(chatSessionId: string) {
    _chatSessionId = chatSessionId;
}

export function getChatSessionId() {
    return _chatSessionId;
}

export function getChatSessionPrefix() {
    if (!_chatSessionId) {
        throw new Error("Chat session ID not set. Call setChatSessionId first.");
    }
    
    return `chatSessionArtifacts/sessionId=${_chatSessionId}/`;
}
