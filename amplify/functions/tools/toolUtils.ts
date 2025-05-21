// Global variable for storing the chat session ID provided by the handler
let _chatSessionId: string | null = null;

// Global variable for storing the origin provided by the handler
let _origin: string | null = null;

// Function to set the chat session ID from the handler
export function setChatSessionId(chatSessionId: string) {
    _chatSessionId = chatSessionId;
}

// Function to set the origin from the handler
export function setOrigin(origin: string) {
    _origin = process.env.ORIGIN_BASE_PATH + origin;
}

export function getOrigin() {
    return _origin;
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
