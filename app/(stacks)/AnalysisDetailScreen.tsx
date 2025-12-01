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
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('analysis.noData')}</Text>
        </View>
      </View>
    );
  }

  const isManual = result.source === 'MANUAL';
  const isConditionDetection = result.aiDetectedCondition !== null;
  const isDiseaseDetection = result.aiDetectedDisease !== null;
  const imageUrl = result.imageUrls[0];

  // Determine Display Values based on Source
  let displayTitle = '';
  let displayType = '';
  let displayDescription = '';
  let detectionColor = primaryColor;

  if (isManual) {
    displayTitle = result.chiefComplaint || t('analysis.manual');
    displayType = t('analysis.manual');
    displayDescription = result.patientSymptoms || result.notes || 'No details provided.';
    detectionColor = '#666'; // Neutral color for manual
  } else if (isConditionDetection) {
    displayTitle = t('analysis.' + result.aiDetectedCondition);
    displayType = t('analysis.condition');
    displayDescription = t('analysis.' + result.aiDetectedCondition + '_desc');
    detectionColor = primaryColor;
  } else {
    displayTitle = t('analysis.' + result.aiDetectedDisease);
    displayType = t('analysis.disease');
    displayDescription = t('analysis.' + result.aiDetectedDisease + '_desc');
    detectionColor = '#E91E63';
  }

  // Mask Logic
  let maskUrl: string | null = null;
  if (!isManual && result.mask) {
    if (Array.isArray(result.mask) && result.mask.length > 0) {
      maskUrl = result.mask[0];
    } else if (typeof result.mask === 'string') {
      maskUrl = result.mask;
    }
  }

  const handleAskAI = () => {
    const analysisText = `I have a skin analysis result:
    Type: ${displayType}
    Result: ${displayTitle}
    Source: ${result.source}
    Description: ${displayDescription}
    
    Can you explain this condition and suggest skincare routines?`;

    router.push({
      pathname: '/(tabs)/ChatbotScreen',
      params: { prefillText: analysisText }
    });
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

            {/* Mask Overlay (Only for AI Disease) */}
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
            
            <View style={styles.gradientOverlay} />
          </View>

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

          {/* Mask Toggle (Only for AI Disease) */}
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
                <Text style={[styles.maskToggleText, showMask && styles.maskToggleTextActive]}>
                  {showMask ? t('analysis.hideMask') : t('analysis.showMask')} 
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.contentSection}>
          
          {/* Diagnosis Card */}
          <Animated.View
            style={[
              styles.resultCard,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.resultHeader}>
              <View style={[styles.resultIconWrapper, { backgroundColor: `${detectionColor}15` }]}>
                <View style={[styles.resultIcon, { backgroundColor: detectionColor }]}>
                  <Ionicons
                    name={isManual ? 'create' : (isConditionDetection ? 'water' : 'medical')}
                    size={28}
                    color="#FFFFFF"
                  />
                </View>
              </View>
              
              <View style={styles.resultTitleContainer}>
                <Text style={styles.resultLabel}>{displayType}</Text>
                <Text style={[styles.resultValue, { color: detectionColor }]}>
                  {displayTitle}
                </Text>
              </View>
            </View>

            <View style={styles.resultDivider} />

            <View style={styles.descriptionContainer}>
              <View style={styles.descriptionHeaderRow}>
                <Ionicons name="information-circle-outline" size={18} color="#666" />
                <Text style={styles.descriptionLabel}>{t('analysis.analysisDetails')}</Text>
              </View>
              <Text style={styles.resultDescription}>
                {displayDescription}
              </Text>
            </View>
          </Animated.View>

          {/* Metadata Grid */}
          <Animated.View
            style={[
              styles.detailsSection,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <Text style={styles.sectionTitle}>{t('analysis.analysisDetails')}</Text> 

            <View style={styles.detailsGrid}>
              <View style={styles.detailCard}>
                <View style={[styles.detailIconWrapper, { backgroundColor: '#F0F9FF' }]}>
                  <Ionicons name="calendar" size={20} color="#2196F3" />
                </View>
                <Text style={styles.detailLabel}>{t('analysis.date')}</Text> 
                <Text style={styles.detailValue}>
                  {new Date(result.createdAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </Text>
              </View>

              <View style={styles.detailCard}>
                <View style={[styles.detailIconWrapper, { backgroundColor: '#FFF4E6' }]}>
                  <Ionicons name="time" size={20} color="#FF9800" />
                </View>
                <Text style={styles.detailLabel}>{t('analysis.time')}</Text> 
                <Text style={styles.detailValue}>
                  {new Date(result.createdAt).toLocaleTimeString('en-US', {
                    hour: '2-digit', minute: '2-digit'
                  })}
                </Text>
              </View>

              <View style={styles.detailCard}>
                <View style={[styles.detailIconWrapper, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name={isManual ? 'create' : 'sparkles'} size={20} color="#34C759" />
                </View>
                <Text style={styles.detailLabel}>{t('analysis.source')}</Text> 
                <Text style={styles.detailValue}>
                  {isManual ? t('analysis.manual') : t('analysis.aiScan')} 
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Disclaimer */}
          <Animated.View
            style={[
              styles.disclaimer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
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

          {/* Actions */}
          <Animated.View
            style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          >
            <TouchableOpacity
              style={[styles.askAIButton, { backgroundColor: '#F5F5F5', borderColor: detectionColor }]}
              onPress={handleAskAI}
              activeOpacity={0.8}
            >
              <View style={[styles.askAIIcon, { backgroundColor: `${detectionColor}15` }]}>
                <Ionicons name="chatbubbles" size={20} color={detectionColor} />
              </View>
              <Text style={[styles.askAIText, { color: detectionColor }]}>{t('analysis.askAI')}</Text> 
              <Ionicons name="arrow-forward" size={18} color={detectionColor} />
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
    top: 0, left: 0, right: 0, height: 400, overflow: 'hidden',
  },
  circle1: {
    position: 'absolute', width: 350, height: 350, borderRadius: 175, top: -150, right: -80,
  },
  circle2: {
    position: 'absolute', width: 250, height: 250, borderRadius: 125, top: -80, left: -60,
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
    transform: [{ scaleX: -1 }],
  },
  redTintOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 0, 50, 0.15)',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, height: 150,
    backgroundColor: 'transparent',
    backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  overlayButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  maskControls: {
    position: 'absolute', bottom: 20, left: 24, right: 24,
  },
  maskToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#FFFFFF', paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  maskToggleActive: {
    // backgroundColor set inline
  },
  maskToggleIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center', alignItems: 'center',
  },
  maskToggleIconActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  maskToggleText: {
    fontSize: 14, fontWeight: '700', color: '#1A1A1A',
  },
  maskToggleTextActive: {
    color: '#FFFFFF',
  },
  contentSection: {
    padding: 24,
    marginTop: -20, 
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
    marginBottom: 20,
  },
  resultIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
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
  resultTitleContainer: {
    flex: 1,
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultValue: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  resultDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginBottom: 20,
  },
  descriptionContainer: {
    backgroundColor: '#FAFAFA',
    padding: 16,
    borderRadius: 16,
  },
  descriptionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
  },
  resultDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#333',
    lineHeight: 22,
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
  askAIButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
  },
  askAIIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  askAIText: {
    fontSize: 16,
    fontWeight: '700',
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