import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import chatbotService, { ChatMessage, ChatSession } from '@/services/chatbotService';
import { useThemeColor } from '@/contexts/ThemeColorContext';

export default function ChatbotScreen() {
  const { user } = useAuth();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showChatList, setShowChatList] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const hasLoadedRef = useRef(false);
  const { primaryColor } = useThemeColor();

  useEffect(() => {
    if (user?.userId && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadChatSessions();
    }
  }, [user]);

  useEffect(() => {
    if (currentChatId) {
      loadMessages(currentChatId);
    }
  }, [currentChatId]);

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to bottom when keyboard shows
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const loadChatSessions = async () => {
    if (!user?.userId) return;

    try {
      setIsLoading(true);
      const sessions = await chatbotService.getChatSessionsByUserId(user.userId);
      
      const validSessions = sessions.filter(s => s.messages && s.messages.length > 0);
      setChatSessions(validSessions);

      if (validSessions.length > 0) {
        const mostRecentChat = validSessions.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0];
        setCurrentChatId(mostRecentChat.chatId);
      } else {
        await createNewChat();
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      Alert.alert('Error', 'Failed to load chat sessions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const chatMessages = await chatbotService.getMessagesByChatId(chatId);
      setMessages(chatMessages);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === 'user';
    const isAI = item.sender === 'ai';

    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.aiMessageContainer]}>
        {isAI && (
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={16} color="#fff" />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? [styles.userBubble, { backgroundColor: primaryColor }] : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.aiMessageText]}>
            {item.messageContent}
          </Text>
          <Text style={[styles.messageTime, isUser ? styles.userTimeText : styles.aiTimeText]}>
            {new Date(item.createdAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        {isUser && (
          <View style={[styles.userAvatar, { backgroundColor: primaryColor }]}>
            <Ionicons name="person" size={16} color="#fff" />
          </View>
        )}
      </View>
    );
  };

  const createNewChat = async () => {
    if (!user?.userId) {
      Alert.alert('Error', 'Please log in to use chat');
      return;
    }

    try {
      setIsLoading(true);
      
      const newChat = await chatbotService.createChatSession(user.userId);
      
      if (!newChat.messages || newChat.messages.length === 0) {
        throw new Error('Chat created without greeting message');
      }

      setChatSessions([newChat, ...chatSessions]);
      setCurrentChatId(newChat.chatId);
      setMessages(newChat.messages);
      setShowChatList(false);
      
      console.log('✅ New chat created successfully');
    } catch (error) {
      console.error('Error creating chat:', error);
      Alert.alert('Error', 'Failed to create new chat. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentChatId || isSending) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    // Scroll to bottom immediately when sending
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const { userMessage, aiMessage } = await chatbotService.sendMessage(
        currentChatId,
        messageText
      );

      if (aiMessage.messageContent.includes('I apologize, but I encountered an error')) {
        Alert.alert(
          'AI Error',
          'The AI assistant encountered an error. This may be due to API limits or connectivity. Please try again.',
          [{ text: 'OK' }]
        );
      }

      setMessages((prev) => [...prev, userMessage, aiMessage]);

      const currentSession = chatSessions.find(s => s.chatId === currentChatId);
      if (currentSession?.title === 'New chat') {
        try {
          const updatedSession = await chatbotService.getChatSessionById(currentChatId);
          setChatSessions(prev => 
            prev.map(s => s.chatId === currentChatId ? { ...s, title: updatedSession.title } : s)
          );
        } catch (error) {
          console.error('Error updating chat title:', error);
        }
      }

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please check your connection and try again.');
      setInputMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const selectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    setShowChatList(false);
  };

  const deleteChat = async (chatId: string) => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this chat? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatbotService.deleteChatSession(chatId);
              
              const updatedSessions = chatSessions.filter((chat) => chat.chatId !== chatId);
              setChatSessions(updatedSessions);

              if (currentChatId === chatId) {
                if (updatedSessions.length > 0) {
                  setCurrentChatId(updatedSessions[0].chatId);
                } else {
                  setCurrentChatId(null);
                  setMessages([]);
                  await createNewChat();
                }
              }
            } catch (error: any) {
              console.error('Error deleting chat:', error);
              
              if (error?.message?.includes('not found') || error?.message?.includes('404')) {
                const updatedSessions = chatSessions.filter((chat) => chat.chatId !== chatId);
                setChatSessions(updatedSessions);
                
                if (currentChatId === chatId && updatedSessions.length > 0) {
                  setCurrentChatId(updatedSessions[0].chatId);
                } else if (currentChatId === chatId) {
                  await createNewChat();
                }
              } else {
                Alert.alert('Error', 'Failed to delete chat. Please try again.');
              }
            }
          },
        },
      ]
    );
  };

  const renderChatItem = ({ item }: { item: ChatSession }) => {
    const isActive = item.chatId === currentChatId;
    
    const lastMessage = item.messages && item.messages.length > 0 
      ? item.messages[item.messages.length - 1].messageContent.substring(0, 50) + '...'
      : 'No messages';
    
    return (
      <TouchableOpacity
        style={[
          styles.chatItem, 
          isActive && styles.activeChatItem, 
          { 
            borderColor: isActive ? primaryColor : '#E5E5E5',
            backgroundColor: isActive ? `${primaryColor}15` : '#fff'
          }
        ]}
        onPress={() => selectChat(item.chatId)}
      >
        <View style={styles.chatItemContent}>
          <View style={styles.chatIconContainer}>
            <Ionicons name="chatbubble-ellipses" size={24} color={isActive ? primaryColor : '#666'} />
          </View>
          <View style={styles.chatItemText}>
            <Text style={[styles.chatTitle, isActive && styles.activeChatTitle, { color: isActive ? primaryColor : '#000' }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.chatPreview} numberOfLines={1}>
              {lastMessage}
            </Text>
            <Text style={styles.chatDate}>
              {new Date(item.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation();
            deleteChat(item.chatId);
          }}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="person-circle-outline" size={80} color="#ccc" />
        <Text style={styles.emptyMessagesText}>Please log in to use AI Chat</Text>
        <Text style={styles.emptyMessagesSubtext}>
          Sign in to start chatting with our AI assistant
        </Text>
      </View>
    );
  }

  if (isLoading && chatSessions.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  if (showChatList) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowChatList(false)}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Chats</Text>
          <TouchableOpacity onPress={createNewChat} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color={primaryColor} />
            ) : (
              <Ionicons name="add-circle" size={24} color={primaryColor} />
            )}
          </TouchableOpacity>
        </View>

        <FlatList
          data={chatSessions}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.chatId}
          contentContainerStyle={styles.chatListContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>No chats yet</Text>
              <Text style={styles.emptyMessagesSubtext}>
                Start a conversation with our AI assistant
              </Text>
              <TouchableOpacity 
                style={[styles.createButton, { backgroundColor: primaryColor }]} 
                onPress={createNewChat}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.createButtonText}>Start New Chat</Text>
                )}
              </TouchableOpacity>
            </View>
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowChatList(true)}>
          <Ionicons name="menu" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="sparkles" size={20} color={primaryColor} />
          <Text style={styles.headerTitle}>AI Assistant</Text>
        </View>
        <TouchableOpacity onPress={createNewChat} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color={primaryColor} />
          ) : (
            <Ionicons name="add-circle-outline" size={24} color={primaryColor} />
          )}
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.messageId}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyMessages}>
            <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
            <Text style={styles.emptyMessagesText}>Start a conversation</Text>
            <Text style={styles.emptyMessagesSubtext}>
              Ask me anything about skincare, products, or skin conditions!
            </Text>
          </View>
        }
      />

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            placeholderTextColor="#999"
            value={inputMessage}
            onChangeText={setInputMessage}
            multiline
            maxLength={500}
            editable={!isSending}
            blurOnSubmit={false}
            onFocus={() => {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 300);
            }}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputMessage.trim() || isSending) && styles.sendButtonDisabled, { backgroundColor: (!inputMessage.trim() || isSending) ? '#ccc' : primaryColor }]}
            onPress={sendMessage}
            disabled={!inputMessage.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1,
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 12,
  },
  userBubble: {
    backgroundColor: '#007AFF', // This will be overridden by inline style
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  userMessageText: {
    color: '#fff',
  },
  aiMessageText: {
    color: '#1A1A1A',
  },
  messageTime: {
    fontSize: 11,
  },
  userTimeText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  aiTimeText: {
    color: '#999',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF', // This will be overridden by inline style
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF9500',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 12,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: '#1A1A1A',
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  emptyMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyMessagesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyMessagesSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  chatListContent: {
    padding: 16,
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activeChatItem: {
    backgroundColor: '#E3F2FD', // This will be overridden by inline style
    borderWidth: 2,
    borderColor: '#007AFF', // This will be overridden by inline style
  },
  chatItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  chatIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatItemText: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  activeChatTitle: {
    color: '#007AFF', // This will be overridden by inline style
  },
  chatPreview: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  chatDate: {
    fontSize: 11,
    color: '#999',
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  createButton: {
    backgroundColor: '#007AFF', // This will be overridden by inline style
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 16,
    minWidth: 150,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});