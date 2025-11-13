import apiService from "./apiService";
import tokenService from "./tokenService";

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

interface SendMessagePayload {
  chatId: string;
  messageContent: string;
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
   * Automatically generates an AI greeting message with "New chat" title
   */
  async createChatSession(userId: string): Promise<ChatSession> {
    try {
      console.log('💬 Creating new chat session for user:', userId);
      const token = await tokenService.getToken();

      if (!token) {
        throw new Error("Authentication is required");
      }

      const payload: CreateChatPayload = { userId };

      const response = await apiService.post<ChatSession>(
        "/chat-sessions",
        payload,
      );

      console.log('✅ Chat session created:', response.chatId);
      console.log('🤖 AI greeting included:', response.messages?.[0]?.messageContent);
      return response;
    } catch (error) {
      console.error('❌ Error creating chat session:', error);
      throw new Error("Failed to create chat session");
    }
  }

  /**
   * Get all chat sessions for a specific user
   * Returns sessions ordered by most recent (updatedAt DESC)
   */
  async getChatSessionsByUserId(userId: string): Promise<ChatSession[]> {
    try {
      console.log('📋 Fetching chat sessions for user:', userId);
      const token = await tokenService.getToken();

      if (!token) {
        throw new Error("Authentication is required");
      }

      const response = await apiService.get<ChatSession[]>(
        `/chat-sessions/user/${userId}`,
      );

      console.log(`✅ Loaded ${response.length} chat sessions`);
      return response;
    } catch (error) {
      console.error('❌ Error fetching chat sessions:', error);
      throw new Error("Failed to fetch chat sessions");
    }
  }

  /**
   * Get a specific chat session with all messages
   * Messages are sorted chronologically (oldest first)
   */
  async getChatSessionById(chatId: string): Promise<ChatSession> {
    try {
      console.log('📋 Fetching chat session:', chatId);
      const token = await tokenService.getToken();

      if (!token) {
        throw new Error("Authentication is required");
      }

      const response = await apiService.get<ChatSession>(
        `/chat-sessions/${chatId}`,
      );

      console.log(`✅ Chat session loaded with ${response.messages?.length || 0} messages`);
      return response;
    } catch (error) {
      console.error('❌ Error fetching chat session:', error);
      throw new Error("Failed to fetch chat session");
    }
  }

  /**
   * Delete a chat session and all associated messages (CASCADE)
   */
  async deleteChatSession(chatId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting chat session:', chatId);
      const token = await tokenService.getToken();

      if (!token) {
        throw new Error("Authentication is required");
      }

      // API returns { message: "Chat session deleted successfully" }
      const response = await apiService.delete<DeleteResponse>(
        `/chat-sessions/${chatId}`, 
      );

      console.log('✅ Chat session deleted:', response.message);
    } catch (error: any) {
      console.error('❌ Error deleting chat session:', error);
      
      // Check if it's a 404 (already deleted) - don't throw error
      if (error?.message?.includes('not found') || error?.message?.includes('404')) {
        console.log('ℹ️ Chat session already deleted or not found');
        return; // Return successfully
      }
      
      // For other errors, throw
      throw new Error("Failed to delete chat session");
    }
  }

  /**
   * Get all messages in a chat session
   * Returns messages ordered chronologically (oldest first)
   */
  async getMessagesByChatId(chatId: string): Promise<ChatMessage[]> {
    try {
      console.log('📥 Fetching messages for chat:', chatId);
      const token = await tokenService.getToken();

      if (!token) {
        throw new Error("Authentication is required");
      }

      const response = await apiService.get<ChatMessage[]>(
        `/chat-messages/chat/${chatId}`,
      );

      console.log(`✅ Loaded ${response.length} messages`);
      return response;
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      throw new Error("Failed to fetch messages");
    }
  }

  /**
   * Send user message and get AI response using Gemini 2.0 Flash
   * Automatically:
   * 1. Saves user message
   * 2. Generates AI response with conversation context
   * 3. Updates chat title on first user message (if title is "New chat")
   * 4. Returns both user and AI messages
   */
  async sendMessage(
    chatId: string,
    messageContent: string
  ): Promise<SendMessageResponse> {
    try {
      console.log('🤖 Sending message and generating AI response...');
      console.log('📝 Message:', messageContent);
      console.log('💬 Chat ID:', chatId);
      
      const token = await tokenService.getToken();

      if (!token) {
        throw new Error("Authentication is required");
      }

      const payload: SendMessagePayload = {
        chatId,
        messageContent,
      };

      const response = await apiService.post<SendMessageResponse>(
        "/chat-messages",
        payload,
      );

      console.log('✅ Message sent successfully');
      console.log('👤 User message ID:', response.userMessage.messageId);
      console.log('🤖 AI response ID:', response.aiMessage.messageId);
      console.log('📖 AI response preview:', response.aiMessage.messageContent.substring(0, 100) + '...');

      return response;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error instanceof Error ? error : new Error("Failed to send message");
    }
  }
}

export const chatbotService = new ChatbotService();
export default chatbotService;