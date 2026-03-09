export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ChatHistory {
    gfId: string;
    messages: Message[];
    lastUpdate: number;
}

export interface GF {
    id: string;
    name: string;
    avatar: string;
    occupation: string;
    personality: string;
    intro: string;
    style: string;
    measurements: string;
}

export interface User {
    userId: string;
    points: number;
    currentModel: 'deepseek' | 'grok';
    isAllUnlocked: boolean;
    free_chat_count: number;
    free_story_count: number;
    local_chat_count: number;
    local_story_count: number;
    storyCopyPrefix: string;
}
