import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import skinAnalysisService, { SkinAnalysisResult } from '@/services/skinAnalysisService';
import tokenService from '@/services/tokenService';
import userService from '@/services/userService';
import { useThemeColor } from '@/contexts/ThemeColorContext';

export default function AnalysisListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { primaryColor } = useThemeColor();
  const [analyses, setAnalyses] = useState<SkinAnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    if (!user?.userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = await tokenService.getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      // Get customer data first to retrieve customerId
      const customerData = await userService.getCustomerByUserId(user.userId, token);
      
      // Use customerId to fetch analyses
      const data = await skinAnalysisService.getUserAnalyses(customerData.customerId);
      
      // Sort by most recent first
      const sortedData = data.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setAnalyses(sortedData);
    } catch (error) {
      console.error('Error loading analyses:', error);
      setAnalyses([]); // Set empty array on error to prevent undefined
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalyses();
    setRefreshing(false);
  };

  const handleAnalysisPress = (analysis: SkinAnalysisResult) => {
    router.push({
      pathname: '/(stacks)/AnalysisDetailScreen',
      params: {
        result: JSON.stringify(analysis),
      },
    });
  };

  const renderAnalysisItem = ({ item }: { item: SkinAnalysisResult }) => {
    const isConditionDetection = item.aiDetectedCondition !== null;
    const isDiseaseDetection = item.aiDetectedDisease !== null;
    const detectedValue = isConditionDetection
      ? item.aiDetectedCondition
      : item.aiDetectedDisease;
    const iconName = isConditionDetection ? 'water' : 'medical';
    const iconColor = isConditionDetection ? '#2196F3' : '#E91E63';

    return (
      <TouchableOpacity
        style={styles.analysisCard}
        onPress={() => handleAnalysisPress(item)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.imageUrls[0] }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.typeContainer}>
              <Ionicons name={iconName} size={20} color={iconColor} />
              <Text style={[styles.typeText, { color: iconColor }]}>
                {isConditionDetection ? 'Condition' : 'Disease'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
          <Text style={styles.detectedValue} numberOfLines={2}>
            {detectedValue}
          </Text>
          <View style={styles.cardFooter}>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={14} color="#666" />
              <Text style={styles.dateText}>
                {new Date(item.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.sourceContainer}>
              <Ionicons
                name={item.source === 'AI_SCAN' ? 'sparkles' : 'create'}
                size={14}
                color="#666"
              />
              <Text style={styles.sourceText}>
                {item.source === 'AI_SCAN' ? 'AI Scan' : 'Manual'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analysis History</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={styles.loadingText}>Loading analyses...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analysis History</Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/AnalyzeScreen')}
          style={styles.addButton}
        >
          <Ionicons name="add-circle" size={24} color={primaryColor} />
        </TouchableOpacity>
      </View>

      {/* Analysis List */}
      <FlatList
        data={analyses}
        renderItem={renderAnalysisItem}
        keyExtractor={(item) => item.analysisId}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[primaryColor]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="analytics-outline" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>No Analysis Yet</Text>
            <Text style={styles.emptySubtitle}>
              Start analyzing your skin to see your history here
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: primaryColor }]}
              onPress={() => router.push('/(tabs)/AnalyzeScreen')}
            >
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Start Analysis</Text>
            </TouchableOpacity>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  analysisCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  thumbnail: {
    width: 120,
    height: 140,
    backgroundColor: '#f0f0f0',
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detectedValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    lineHeight: 22,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#666',
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sourceText: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF', // Will be overridden
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});