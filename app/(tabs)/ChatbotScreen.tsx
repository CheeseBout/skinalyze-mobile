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
  Image,
  SafeAreaView,
} from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import chatbotService, { ChatMessage, ChatSession } from '@/services/chatbotService';
import { useThemeColor } from '@/contexts/ThemeColorContext';

export default function ChatbotScreen() {
  const { user } = useAuth();
  const { primaryColor } = useThemeColor();
  const params = useLocalSearchParams();

  // --- State Management ---
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Input State
  const [inputMessage, setInputMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false); // Controls the "Thinking..." bubble
  const [showChatList, setShowChatList] = useState(false);
  
  // Refs
  const flatListRef = useRef<FlatList>(null);
  const hasLoadedRef = useRef(false);
  const hasPrefillAppliedRef = useRef(false);

  // --- Effects ---

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

  // Handle prefilled data from navigation params
  useEffect(() => {
    const handlePrefill = async () => {
      if (!hasPrefillAppliedRef.current && user?.userId) {
        const hasPrefillData = params.prefillText || params.prefillImage;
        
        if (hasPrefillData) {
          await createNewChatForAnalysis();
          hasPrefillAppliedRef.current = true;
          
          if (params.prefillText && typeof params.prefillText === 'string') {
            setInputMessage(params.prefillText);
          }
          if (params.prefillImage && typeof params.prefillImage === 'string') {
            setSelectedImage(params.prefillImage);
          }
        }
      }
    };

    handlePrefill();
  }, [params.prefillText, params.prefillImage, user?.userId]);

  // Auto-scroll logic
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => flatListRef.current?.scrollToEnd({ animated: true })
    );
    return () => keyboardDidShowListener.remove();
  }, []);

  // --- Data Loading ---

  const loadChatSessions = async () => {
    if (!user?.userId) return;
    try {
      setIsLoading(true);
      const sessions = await chatbotService.getChatSessionsByUserId(user.userId);
      setChatSessions(sessions);

      if (sessions.length > 0 && !params.prefillText && !params.prefillImage) {
        const mostRecent = sessions.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0];
        setCurrentChatId(mostRecent.chatId);
      } else if (sessions.length === 0 && !params.prefillText && !params.prefillImage) {
        await createNewChat();
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const chatMessages = await chatbotService.getMessagesByChatId(chatId);
      setMessages(chatMessages);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // --- Actions ---

  const createNewChat = async () => {
    if (!user?.userId) return;
    try {
      setIsLoading(true);
      const newChat = await chatbotService.createChatSession(user.userId);
      setChatSessions([newChat, ...chatSessions]);
      setCurrentChatId(newChat.chatId);
      setMessages(newChat.messages || []);
      setShowChatList(false);
      hasPrefillAppliedRef.current = false;
    } catch (error) {
      Alert.alert('Error', 'Failed to start new chat');
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChatForAnalysis = async () => {
    if (!user?.userId) return;
    try {
      setIsLoading(true);
      const newChat = await chatbotService.createChatSession(user.userId);
      setChatSessions([newChat, ...chatSessions]);
      setCurrentChatId(newChat.chatId);
      setMessages([]);
      setShowChatList(false);
    } catch (error) {
      console.error('Error creating chat for analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChat = async (chatId: string) => {
    Alert.alert('Delete Chat', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await chatbotService.deleteChatSession(chatId);
            const updated = chatSessions.filter(c => c.chatId !== chatId);
            setChatSessions(updated);
            if (currentChatId === chatId) {
              updated.length > 0 ? setCurrentChatId(updated[0].chatId) : createNewChat();
            }
          } catch (e) { 
            console.error(e); 
          }
        }
      }
    ]);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled) setSelectedImage(result.assets[0].uri);
    } catch (error) {
      Alert.alert('Error', 'Could not select image');
    }
  };

  // --- Core Logic: Send Message with Optimistic UI ---
  const sendMessage = async () => {
    // 1. Validation
    if ((!inputMessage.trim() && !selectedImage) || !currentChatId || isSending) return;

    const textToSend = inputMessage.trim();
    const imageToSend = selectedImage;
    const tempId = `temp-${Date.now()}`; // Temporary ID for optimistic message

    // 2. Clear inputs immediately (Responsive feel)
    setInputMessage('');
    setSelectedImage(null);
    setIsSending(true);

    // 3. Create Optimistic Message
    // Mimic the backend data structure
    const optimisticMessage: ChatMessage = {
      messageId: tempId,
      chatId: currentChatId,
      sender: 'user',
      messageContent: imageToSend 
        ? `${textToSend}\n[Uploading Image...]` 
        : textToSend,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 4. Update UI Immediately
    setMessages(prev => [...prev, optimisticMessage]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // 5. API Call
      const { userMessage, aiMessage } = await chatbotService.sendMessage(
        currentChatId,
        textToSend,
        imageToSend
      );

      // 6. Swap Temp Message with Real Data
      setMessages(prev => {
        // Remove the temporary message
        const filtered = prev.filter(msg => msg.messageId !== tempId);
        // Append the actual confirmed messages from backend
        return [...filtered, userMessage, aiMessage];
      });

      // Update session title if it's the first message
      const session = chatSessions.find(s => s.chatId === currentChatId);
      if (session?.title === 'New chat') {
        loadChatSessions(); 
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message');
      
      // Rollback: Remove temp message and restore input
      setMessages(prev => prev.filter(msg => msg.messageId !== tempId));
      setInputMessage(textToSend);
      setSelectedImage(imageToSend);
    } finally {
      setIsSending(false);
    }
  };

  // --- Render Helpers ---

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[
        styles.messageRow, 
        isUser ? styles.messageRowUser : styles.messageRowAi
      ]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: '#fff', borderColor: primaryColor, borderWidth: 1 }]}>
            <Ionicons name="sparkles" size={14} color={primaryColor} />
          </View>
        )}
        
        <View style={[
          styles.bubble,
          isUser ? [styles.bubbleUser, { backgroundColor: primaryColor }] : styles.bubbleAi
        ]}>
          <Text style={[styles.messageText, isUser && styles.messageTextUser]}>
            {item.messageContent}
          </Text>
          <Text style={[styles.timestamp, isUser ? { color: 'rgba(255,255,255,0.7)' } : { color: '#999' }]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  // New Footer Component for "Thinking" State
  const renderFooter = () => {
    if (!isSending) return <View style={{ height: 20 }} />;

    return (
      <View style={[styles.messageRow, styles.messageRowAi, { marginBottom: 20 }]}>
        <View style={[styles.avatar, { backgroundColor: '#fff', borderColor: primaryColor, borderWidth: 1 }]}>
          <Ionicons name="sparkles" size={14} color={primaryColor} />
        </View>
        <View style={[styles.bubble, styles.bubbleAi, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
          <ActivityIndicator size="small" color={primaryColor} />
          <Text style={{ color: '#999', fontSize: 13, fontStyle: 'italic' }}>Thinking...</Text>
        </View>
      </View>
    );
  };

  const renderChatItem = ({ item }: { item: ChatSession }) => {
    const isActive = item.chatId === currentChatId;
    return (
      <TouchableOpacity 
        style={[styles.chatItem, isActive && { backgroundColor: `${primaryColor}15`, borderColor: primaryColor }]}
        onPress={() => { 
          setCurrentChatId(item.chatId); 
          setShowChatList(false);
          hasPrefillAppliedRef.current = false;
        }}
      >
        <View style={styles.chatItemIcon}>
          <Ionicons name="chatbubble-ellipses" size={24} color={isActive ? primaryColor : '#666'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.chatItemTitle, isActive && { color: primaryColor }]} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.chatItemDate}>
            {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
        </View>
        <TouchableOpacity onPress={() => deleteChat(item.chatId)} style={{ padding: 8 }}>
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // --- Main Views ---

  if (!user) return (
    <View style={[styles.container, styles.center]}>
      <Text style={{ color: '#666' }}>Please log in to use the chatbot.</Text>
    </View>
  );

  if (showChatList) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowChatList(false)} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>History</Text>
          <TouchableOpacity onPress={createNewChat} style={styles.iconButton}>
            <Ionicons name="add" size={24} color={primaryColor} />
          </TouchableOpacity>
        </View>
        <FlatList 
          data={chatSessions} 
          renderItem={renderChatItem} 
          keyExtractor={item => item.chatId}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: '#999', marginTop: 40 }}>No chat history</Text>
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowChatList(true)} style={styles.iconButton}>
          <Ionicons name="menu" size={24} color="#333" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="sparkles" size={18} color={primaryColor} />
          <Text style={styles.headerTitle}>Assistant</Text>
        </View>
        <TouchableOpacity onPress={createNewChat} style={styles.iconButton}>
          <Ionicons name="add-circle-outline" size={24} color={primaryColor} />
        </TouchableOpacity>
      </View>

      {/* Chat Area */}
      <KeyboardAvoidingView 
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.messageId}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={renderFooter} // Added Footer here
          ListEmptyComponent={
            <View style={[styles.center, { marginTop: 100 }]}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ddd" />
              <Text style={{ color: '#999', marginTop: 16 }}>
                {params.prefillText ? 'Ready to ask about your analysis' : 'Start a new conversation'}
              </Text>
            </View>
          }
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          {/* Image Preview */}
          {selectedImage && (
            <View style={styles.imagePreviewCard}>
              <Image source={{ uri: selectedImage }} style={styles.previewThumb} />
              <View style={{ flex: 1 }}>
                <Text style={styles.previewLabel}>Image Attached</Text>
                <Text style={styles.previewSub}>Ready to send</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedImage(null)} style={styles.closePreview}>
                <Ionicons name="close" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          )}

          {/* Input Row */}
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={pickImage} style={styles.attachBtn}>
              <Ionicons name="image-outline" size={24} color={primaryColor} />
            </TouchableOpacity>

            <View style={styles.textInputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder={selectedImage ? "Ask about this image..." : "Type a message..."}
                placeholderTextColor="#999"
                multiline
                value={inputMessage}
                onChangeText={setInputMessage}
                maxLength={1000}
              />
            </View>

            <TouchableOpacity 
              onPress={sendMessage} 
              disabled={(!inputMessage.trim() && !selectedImage) || isSending}
              style={[
                styles.sendBtn, 
                { backgroundColor: (!inputMessage.trim() && !selectedImage) || isSending ? '#E0E0E0' : primaryColor }
              ]}
            >
              {isSending ? (
                // Keep activity indicator here too just in case
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="arrow-up" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  flex1: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  iconButton: {
    padding: 8,
  },

  // Chat List (Sidebar)
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  chatItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  chatItemDate: {
    fontSize: 12,
    color: '#999',
  },

  // Messages
  chatContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAi: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  messageTextUser: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },

  // Input Area
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 10 : 10,
  },
  imagePreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 8,
    marginBottom: 10,
  },
  previewThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#ddd',
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  previewSub: {
    fontSize: 12,
    color: '#666',
  },
  closePreview: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  attachBtn: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInputWrapper: {
    flex: 1,
    backgroundColor: '#F2F2F2',
    borderRadius: 20,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});