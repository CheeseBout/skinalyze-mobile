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
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

export default function AnalysisDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { primaryColor } = useThemeColor();
  const { t } = useTranslation();
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
        <View style={styles.backgroundPattern}>
          <View style={[styles.circle1, { backgroundColor: `${primaryColor}08` }]} />
          <View style={[styles.circle2, { backgroundColor: `${primaryColor}05` }]} />
        </View>
        <View style={styles.errorContainer}>
          <View style={[styles.errorIcon, { backgroundColor: '#FFE8E8' }]}>
            <Ionicons name="alert-circle" size={56} color="#FF3B30" />
          </View>
          <Text style={styles.errorTitle}>{t('analysis.noData')}</Text>
          <Text style={styles.errorText}>{t('analysis.unableLoad')}</Text>
          <TouchableOpacity
            style={[styles.errorButton, { backgroundColor: primaryColor }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.errorButtonText}>{t('analysis.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isConditionDetection = result.aiDetectedCondition !== null;
  const isDiseaseDetection = result.aiDetectedDisease !== null;
  const imageUrl = result.imageUrls[0];
  const detectionColor = isConditionDetection ? primaryColor : '#E91E63';

  // Handle Ask AI Logic
  const handleAskAI = (path: any) => {
    const analysisText = `I have a skin analysis result that I'd like to understand better:

Detection Type: ${isConditionDetection ? t('analysis.skinCondition') : t('analysis.diseaseDetection')}
Result: ${isConditionDetection ? t('analysis.' + result.aiDetectedCondition) : t('analysis.' + result.aiDetectedDisease)}
Date: ${new Date(result.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })}
Source: ${result.source === 'AI_SCAN' ? t('analysis.aiScan') : t('analysis.manual')}

${result.chiefComplaint ? `Chief Complaint: ${result.chiefComplaint}\n` : ''}${result.patientSymptoms ? `Symptoms: ${result.patientSymptoms}\n` : ''}${result.notes ? `Notes: ${result.notes}\n` : ''}
Can you provide more information about this condition and suggest what steps I should take?`;

    router.push({
      pathname: '/(tabs)/ChatbotScreen',
      params: {
        prefillText: analysisText,
        prefillImage: imageUrl,
      }
    })
  }

  // Mask Logic
  let maskUrl: string | null = null;
  if (result.mask) {
    if (Array.isArray(result.mask) && result.mask.length > 0) {
      maskUrl = result.mask[0];
    } else if (typeof result.mask === 'string') {
      maskUrl = result.mask;
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Section */}
        <View style={styles.imageSection}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />

            {/* Mask Overlay */}
            {isDiseaseDetection && maskUrl && showMask && (
              <View style={styles.maskContainer}>
                <Image
                  source={{ uri: maskUrl }}
                  style={styles.maskImage}
                  resizeMode="cover"
                />
                <View style={styles.redTintOverlay} />
              </View>
            )}

            {/* Gradient Overlay */}
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
            <View style={styles.overlayButton} />
          </View>

          {/* Mask Toggle Button */}
          {isDiseaseDetection && maskUrl && result.aiDetectedDisease?.toLowerCase() !== "normal" && (
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
                  {showMask ? t('analysis.hideMask') : t('analysis.showMask')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          
          {/* Unified Analysis Card */}
          <Animated.View
            style={[
              styles.unifiedCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Header: Icon, Title, Type */}
            <View style={styles.unifiedHeader}>
              <View style={[styles.resultIconWrapper, { backgroundColor: `${detectionColor}15` }]}>
                <View style={[styles.resultIcon, { backgroundColor: detectionColor }]}>
                  <Ionicons
                    name={isConditionDetection ? 'water' : 'medical'}
                    size={28}
                    color="#FFFFFF"
                  />
                </View>
              </View>
              
              <View style={styles.unifiedHeaderText}>
                 {/* Type Badge */}
                 <View style={[styles.typeBadge, { backgroundColor: `${detectionColor}10`, borderColor: `${detectionColor}30` }]}>
                  <Text style={[styles.typeBadgeText, { color: detectionColor }]}>
                    {isConditionDetection ? t('analysis.condition') : t('analysis.disease')}
                  </Text>
                </View>
                
                {/* Result Name */}
                <Text style={styles.resultTitle}>
                  {isConditionDetection ? t('analysis.' + result.aiDetectedCondition) : t('analysis.' + result.aiDetectedDisease)}
                </Text>
              </View>
            </View>

            {/* Description Box */}
            <View style={styles.descriptionBox}>
               <Text style={styles.descriptionLabel}>{t('analysis.analysisDetails')}</Text>
               <Text style={styles.descriptionText}>
                  {isConditionDetection 
                    ? t('analysis.' + result.aiDetectedCondition + '_desc') 
                    : t('analysis.' + result.aiDetectedDisease + '_desc')}
               </Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Footer: Date, Time, Source */}
            <View style={styles.infoFooter}>
              {/* Date */}
              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={16} color="#999" style={{ marginBottom: 4 }} />
                <Text style={styles.infoValue}>
                  {new Date(result.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
                <Text style={styles.infoLabel}>{t('analysis.date')}</Text>
              </View>

              <View style={styles.verticalDivider} />

              {/* Time */}
              <View style={styles.infoItem}>
                <Ionicons name="time-outline" size={16} color="#999" style={{ marginBottom: 4 }} />
                <Text style={styles.infoValue}>
                  {new Date(result.createdAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
                <Text style={styles.infoLabel}>{t('analysis.time')}</Text>
              </View>

              <View style={styles.verticalDivider} />

              {/* Source */}
              <View style={styles.infoItem}>
                <Ionicons 
                  name={result.source === 'AI_SCAN' ? 'sparkles-outline' : 'create-outline'} 
                  size={16} 
                  color={result.source === 'AI_SCAN' ? '#A855F7' : '#999'} 
                  style={{ marginBottom: 4 }} 
                />
                <Text style={[
                  styles.infoValue, 
                  result.source === 'AI_SCAN' && { color: '#A855F7', fontWeight: '800' }
                ]}>
                  {result.source === 'AI_SCAN' ? 'AI Scan' : 'Manual'}
                </Text>
                <Text style={styles.infoLabel}>{t('analysis.source')}</Text>
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
              <Text style={styles.disclaimerTitle}>{t('analysis.medicalDisclaimer')}</Text>
            </View>
            <Text style={styles.disclaimerText}>
              {t('analysis.disclaimerText')}
            </Text>
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }}
          >
            <TouchableOpacity
              style={[styles.askAIButton, { backgroundColor: '#F5F5F5', borderColor: detectionColor }]}
              onPress={handleAskAI}
              activeOpacity={0.8}
            >
              <View style={[styles.askAIIcon, { backgroundColor: `${detectionColor}20` }]}>
                <Ionicons name="sparkles" size={20} color={detectionColor} />
              </View>
              <Text style={[styles.askAIText, { color: detectionColor }]}>{t('analysis.askAI')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: primaryColor }]}
              onPress={() => router.push('/(tabs)/AnalyzeScreen')}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>{t('analysis.startNew')}</Text>
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
    opacity: 0.6,
  },
  redTintOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 0, 50, 0.15)',
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
  
  // UNIFIED CARD STYLES
  unifiedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  unifiedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 20,
  },
  resultIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  unifiedHeaderText: {
    flex: 1,
    paddingTop: 4,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    lineHeight: 28,
  },
  descriptionBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#444',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  descriptionText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#444',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginBottom: 20,
  },
  infoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#EEEEEE',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
    textAlign: 'center',
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#999',
    textTransform: 'uppercase',
  },

  // Disclaimer Styles
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
  
  // Button Styles
  askAIButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  askAIIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  askAIText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
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

  // Error Styles
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