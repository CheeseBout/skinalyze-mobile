import apiService from "./apiService"; // Kept for other methods
import tokenService from "./tokenService";
// We need the BASE_URL. Usually it's in apiService or config. 
// Assuming a standard location or hardcoding for safety based on your logs:
const BASE_URL = "http://192.168.1.35:3000/api/v1"; 

export interface ChatMessage {
  messageId: string;
  chatId: string;
  sender: "user" | "ai";
  messageContent: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSession {
  chatId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

interface CreateChatPayload {
  userId: string;
}

interface SendMessageResponse {
  userMessage: ChatMessage;
  aiMessage: ChatMessage;
}

interface DeleteResponse {
  message: string;
}

class ChatbotService {
  /**
   * Create a new chat session
   */
  async createChatSession(userId: string): Promise<ChatSession> {
    try {
      const token = await tokenService.getToken();
      if (!token) throw new Error("Authentication is required");

      const payload: CreateChatPayload = { userId };
      const response = await apiService.post<ChatSession>("/chat-sessions", payload);
      return response;
    } catch (error) {
      console.error('❌ Error creating chat session:', error);
      throw new Error("Failed to create chat session");
    }
  }

  /**
   * Get all chat sessions for a specific user
   */
  async getChatSessionsByUserId(userId: string): Promise<ChatSession[]> {
    try {
      const token = await tokenService.getToken();
      if (!token) throw new Error("Authentication is required");

      const response = await apiService.get<ChatSession[]>(`/chat-sessions/user/${userId}`);
      return response;
    } catch (error) {
      console.error('❌ Error fetching chat sessions:', error);
      throw new Error("Failed to fetch chat sessions");
    }
  }

  /**
   * Get a specific chat session with all messages
   */
  async getChatSessionById(chatId: string): Promise<ChatSession> {
    try {
      const token = await tokenService.getToken();
      if (!token) throw new Error("Authentication is required");

      const response = await apiService.get<ChatSession>(`/chat-sessions/${chatId}`);
      return response;
    } catch (error) {
      console.error('❌ Error fetching chat session:', error);
      throw new Error("Failed to fetch chat session");
    }
  }

  /**
   * Delete a chat session
   */
  async deleteChatSession(chatId: string): Promise<void> {
    try {
      const token = await tokenService.getToken();
      if (!token) throw new Error("Authentication is required");

      const response = await apiService.delete<DeleteResponse>(`/chat-sessions/${chatId}`);
      console.log('✅ Chat session deleted:', response.message);
    } catch (error: any) {
      console.error('❌ Error deleting chat session:', error);
      if (error?.message?.includes('not found') || error?.message?.includes('404')) {
        return; 
      }
      throw new Error("Failed to delete chat session");
    }
  }

  /**
   * Get all messages in a chat session
   */
  async getMessagesByChatId(chatId: string): Promise<ChatMessage[]> {
    try {
      const token = await tokenService.getToken();
      if (!token) throw new Error("Authentication is required");

      const response = await apiService.get<ChatMessage[]>(`/chat-messages/chat/${chatId}`);
      return response;
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      throw new Error("Failed to fetch messages");
    }
  }

  /**
   * Send user message (Text + Optional Image)
   * Uses native fetch to handle FormData correctly
   */
  async sendMessage(
    chatId: string,
    messageContent: string,
    imageUri?: string | null
  ): Promise<SendMessageResponse> {
    try {
      console.log('🤖 Sending message...');
      const token = await tokenService.getToken();
      if (!token) throw new Error("Authentication is required");

      // 1. Create FormData
      const formData = new FormData();
      formData.append('chatId', chatId);
      formData.append('messageContent', messageContent);

      if (imageUri) {
        const filename = imageUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        // @ts-ignore: React Native FormData requires this specific shape
        formData.append('image', {
          uri: imageUri,
          name: filename,
          type: type,
        });
        console.log('📸 Attaching image:', filename);
      }

      // 2. Use Native Fetch instead of apiService/Axios
      // This avoids issues where Axios interceptors might force Content-Type: application/json
      const response = await fetch(`${BASE_URL}/chat-messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // IMPORTANT: Do NOT set Content-Type here. 
          // Fetch will automatically set 'multipart/form-data; boundary=...'
        },
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('🔥 API Error Details:', responseData);
        throw new Error(responseData.message || "Failed to send message");
      }

      console.log('✅ Message sent successfully');
      return responseData as SendMessageResponse;

    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error instanceof Error ? error : new Error("Failed to send message");
    }
  }
}

export const chatbotService = new ChatbotService();
export default chatbotService;