import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Dimensions,
  StatusBar,
  Animated
} from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SkinAnalysisResult } from '@/services/skinAnalysisService';
import { useThemeColor } from '@/contexts/ThemeColorContext';

const { width } = Dimensions.get('window');

export default function AnalysisDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { primaryColor } = useThemeColor();
  const [showMask, setShowMask] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const result: SkinAnalysisResult = params.result 
    ? JSON.parse(params.result as string) 
    : null;

  if (!result) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
        
        {/* Decorative Background */}
        <View style={styles.backgroundPattern}>
          <View style={[styles.circle1, { backgroundColor: `${primaryColor}08` }]} />
          <View style={[styles.circle2, { backgroundColor: `${primaryColor}05` }]} />
        </View>

        <View style={styles.errorContainer}>
          <View style={[styles.errorIcon, { backgroundColor: '#FFE8E8' }]}>
            <Ionicons name="alert-circle" size={56} color="#FF3B30" />
          </View>
          <Text style={styles.errorTitle}>No Data Available</Text>
          <Text style={styles.errorText}>Unable to load analysis details</Text>
          <TouchableOpacity 
            style={[styles.errorButton, { backgroundColor: primaryColor }]} 
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isConditionDetection = result.aiDetectedCondition !== null;
  const isDiseaseDetection = result.aiDetectedDisease !== null;
  const imageUrl = result.imageUrls[0];
  
  let maskBase64: string | null = null;
  if (result.mask) {
    if (Array.isArray(result.mask)) {
      maskBase64 = result.mask.find(m => m && m.length > 0) || null;
    } else if (typeof result.mask === 'string') {
      maskBase64 = result.mask;
    }
  }

  const detectionColor = isConditionDetection ? primaryColor : '#E91E63';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Section with Header Overlay */}
        <View style={styles.imageSection}>
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
            
            {/* Mask Overlay */}
            {isDiseaseDetection && maskBase64 && showMask && (
              <View style={styles.maskContainer}>
                <Image 
                  source={{ uri: `data:image/png;base64,${maskBase64}` }}
                  style={styles.maskImage}
                  resizeMode="cover"
                />
                <View style={styles.redTintOverlay} />
              </View>
            )}

            {/* Gradient Overlay for better header visibility */}
            <View style={styles.gradientOverlay} />
          </View>

          {/* Header Overlay */}
          <View style={styles.headerOverlay}>
            <TouchableOpacity 
              style={styles.overlayButton} 
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.headerBadgeContainer}>
              <View style={[styles.headerBadge, { backgroundColor: detectionColor }]}>
                <Ionicons 
                  name={isConditionDetection ? 'water' : 'medical'} 
                  size={16} 
                  color="#FFFFFF" 
                />
              </View>
              <Text style={styles.headerTitle}>Analysis Result</Text>
            </View>
            
            <View style={styles.overlayButton} />
          </View>

          {/* Mask Toggle Button */}
          {isDiseaseDetection && maskBase64 && result.aiDetectedDisease.toLowerCase() !== "normal" && (
            <View style={styles.maskControls}>
              <TouchableOpacity 
                style={[
                  styles.maskToggle,
                  showMask && [styles.maskToggleActive, { backgroundColor: detectionColor }]
                ]}
                onPress={() => setShowMask(!showMask)}
                activeOpacity={0.8}
              >
                <View style={[styles.maskToggleIcon, showMask && styles.maskToggleIconActive]}>
                  <Ionicons 
                    name={showMask ? 'eye-off' : 'eye'} 
                    size={18} 
                    color={showMask ? '#FFFFFF' : detectionColor} 
                  />
                </View>
                <Text style={[
                  styles.maskToggleText,
                  showMask && styles.maskToggleTextActive
                ]}>
                  {showMask ? 'Hide Mask' : 'Show Mask'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {/* Detection Result Card */}
          <Animated.View 
            style={[
              styles.resultCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.resultHeader}>
              <View style={[styles.resultIconWrapper, { backgroundColor: `${detectionColor}15` }]}>
                <View style={[styles.resultIcon, { backgroundColor: detectionColor }]}>
                  <Ionicons 
                    name={isConditionDetection ? 'water' : 'medical'} 
                    size={24} 
                    color="#FFFFFF" 
                  />
                </View>
              </View>
              
              <View style={styles.resultContent}>
                <Text style={styles.resultLabel}>
                  {isConditionDetection ? 'Skin Condition' : 'Disease Detection'}
                </Text>
                <Text style={[styles.resultValue, { color: detectionColor }]}>
                  {isConditionDetection ? result.aiDetectedCondition : result.aiDetectedDisease}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Details Grid */}
          <Animated.View 
            style={[
              styles.detailsSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={styles.sectionTitle}>Analysis Details</Text>
            
            <View style={styles.detailsGrid}>
              <View style={styles.detailCard}>
                <View style={[styles.detailIconWrapper, { backgroundColor: '#F0F9FF' }]}>
                  <Ionicons name="calendar" size={20} color="#2196F3" />
                </View>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>
                  {new Date(result.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </View>

              <View style={styles.detailCard}>
                <View style={[styles.detailIconWrapper, { backgroundColor: '#FFF4E6' }]}>
                  <Ionicons name="time" size={20} color="#FF9800" />
                </View>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>
                  {new Date(result.createdAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>

              <View style={styles.detailCard}>
                <View style={[styles.detailIconWrapper, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons 
                    name={result.source === 'AI_SCAN' ? 'sparkles' : 'create'} 
                    size={20} 
                    color="#34C759" 
                  />
                </View>
                <Text style={styles.detailLabel}>Source</Text>
                <Text style={styles.detailValue}>
                  {result.source === 'AI_SCAN' ? 'AI Scan' : 'Manual'}
                </Text>
              </View>

              <View style={styles.detailCard}>
                <View style={[styles.detailIconWrapper, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="document-text" size={20} color="#A855F7" />
                </View>
                <Text style={styles.detailLabel}>Type</Text>
                <Text style={styles.detailValue}>
                  {isConditionDetection ? 'Condition' : 'Disease'}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Disclaimer */}
          <Animated.View 
            style={[
              styles.disclaimer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.disclaimerHeader}>
              <View style={styles.disclaimerIconWrapper}>
                <Ionicons name="shield-checkmark" size={18} color="#FF9800" />
              </View>
              <Text style={styles.disclaimerTitle}>Medical Disclaimer</Text>
            </View>
            <Text style={styles.disclaimerText}>
              This analysis is for informational purposes only and should not replace professional medical advice. Always consult a qualified healthcare provider for diagnosis and treatment.
            </Text>
          </Animated.View>

          {/* Action Button */}
          <Animated.View 
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }}
          >
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: primaryColor }]}
              onPress={() => router.push('/(tabs)/AnalyzeScreen')}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Start New Analysis</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    top: -150,
    right: -80,
  },
  circle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    top: -80,
    left: -60,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageSection: {
    position: 'relative',
  },
  imageContainer: {
    width: width,
    height: width * 1.1,
    backgroundColor: '#000',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    transform: [{ scaleX: -1 }],
  },
  maskContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  maskImage: {
    width: '100%',
    height: '100%',
    opacity: 0.15,
  },
  redTintOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: 'transparent',
    backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  overlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  maskControls: {
    position: 'absolute',
    bottom: 20,
    left: 24,
    right: 24,
  },
  maskToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  maskToggleActive: {
    backgroundColor: '#007AFF',
  },
  maskToggleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  maskToggleIconActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  maskToggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  maskToggleTextActive: {
    color: '#FFFFFF',
  },
  contentSection: {
    padding: 24,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  resultIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  resultContent: {
    flex: 1,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultValue: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  detailsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  detailIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  disclaimer: {
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  disclaimerIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  actionArrow: {
    position: 'absolute',
    right: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 28,
    textAlign: 'center',
  },
  errorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});