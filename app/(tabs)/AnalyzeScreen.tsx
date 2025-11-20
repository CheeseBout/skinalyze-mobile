import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  ActivityIndicator,
  StatusBar,
  Animated
} from 'react-native'
import React, { useState, useRef, useEffect } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import FacialSkinCamera from '@/components/FacialSkinCamera'
import OtherAreaCamera from '@/components/OtherAreaCamera'
import { useAuth } from '@/hooks/useAuth'
import skinAnalysisService from '@/services/skinAnalysisService'
import { useThemeColor } from '@/contexts/ThemeColorContext'

type ScreenState = 'options' | 'diseaseOptions' | 'camera';
type DetectionType = 'skinCondition' | 'facialDisease' | 'otherDisease';

export default function AnalyzeScreen() {
  const [screenState, setScreenState] = useState<ScreenState>('options');
  const [detectionType, setDetectionType] = useState<DetectionType | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { user } = useAuth();
  const { primaryColor } = useThemeColor();
  const router = useRouter();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    
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
  }, [screenState]);

  const handleSkinConditionDetection = () => {
    setDetectionType('skinCondition');
    setScreenState('camera');
  };

  const handleDiseaseDetection = () => {
    setScreenState('diseaseOptions');
  };

  const handleFacialDisease = () => {
    setDetectionType('facialDisease');
    setScreenState('camera');
  };

  const handleOtherDisease = () => {
    setDetectionType('otherDisease');
    setScreenState('camera');
  };

  const handleBack = () => {
    if (screenState === 'camera') {
      if (detectionType === 'facialDisease' || detectionType === 'otherDisease') {
        setScreenState('diseaseOptions');
      } else {
        setScreenState('options');
      }
      setDetectionType(null);
    } else if (screenState === 'diseaseOptions') {
      setScreenState('options');
    }
  };

  const handleCapture = async (imageUri: string) => {
    if (!user?.userId) {
      Alert.alert('Authentication Required', 'Please log in to use this feature');
      setScreenState('options');
      setDetectionType(null);
      return;
    }

    setIsAnalyzing(true);

    try {
      let result;
      
      if (detectionType === 'skinCondition') {
        result = await skinAnalysisService.detectCondition(user.userId, imageUri);
      } else if (detectionType === 'facialDisease' || detectionType === 'otherDisease') {
        result = await skinAnalysisService.detectDisease(user.userId, imageUri);
      }

      setScreenState('options');
      setDetectionType(null);
      setIsAnalyzing(false);
      
      router.push({
        pathname: '/(stacks)/AnalysisDetailScreen',
        params: {
          result: JSON.stringify(result)
        }
      });
      
    } catch (error: any) {
      console.error('❌ Analysis error:', error);
      Alert.alert(
        'Analysis Failed', 
        error.message || 'Failed to analyze image. Please try again.',
        [
          { text: 'OK', onPress: () => {
            setScreenState('options');
            setDetectionType(null);
          }}
        ]
      );
      setIsAnalyzing(false);
    }
  };

  // Camera Screen with Loading Overlay
  if (screenState === 'camera') {
    if (detectionType === 'skinCondition' || detectionType === 'facialDisease') {
      const title = detectionType === 'skinCondition' 
        ? 'Position your face in the frame'
        : 'Position your face in the frame for disease detection';
      
      return (
        <>
          <FacialSkinCamera 
            onCapture={handleCapture}
            onClose={handleBack}
            initialFacing="front"
            title={title}
          />
          {isAnalyzing && (
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingCard}>
                <View style={[styles.loadingIconWrapper, { backgroundColor: `${primaryColor}15` }]}>
                  <ActivityIndicator size="large" color={primaryColor} />
                </View>
                <Text style={styles.loadingTitle}>Analyzing...</Text>
                <Text style={styles.loadingText}>AI is processing your image</Text>
              </View>
            </View>
          )}
        </>
      );
    }

    return (
      <>
        <OtherAreaCamera 
          onCapture={handleCapture}
          onClose={handleBack}
          title="Hold the camera close for best image quality and detection accuracy"
        />
        {isAnalyzing && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <View style={[styles.loadingIconWrapper, { backgroundColor: `${primaryColor}15` }]}>
                <ActivityIndicator size="large" color={primaryColor} />
              </View>
              <Text style={styles.loadingTitle}>Analyzing...</Text>
              <Text style={styles.loadingText}>AI is processing your image</Text>
            </View>
          </View>
        )}
      </>
    );
  }

  // Options Screen
  if (screenState === 'options') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
        
        {/* Decorative Background */}
        <View style={styles.backgroundPattern}>
          <View style={[styles.circle1, { backgroundColor: `${primaryColor}08` }]} />
          <View style={[styles.circle2, { backgroundColor: `${primaryColor}05` }]} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View 
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={[styles.headerIcon, { backgroundColor: `${primaryColor}15` }]}>
              <Ionicons name="scan" size={32} color={primaryColor} />
            </View>
            <Text style={styles.headerTitle}>AI Skin Analysis</Text>
            <Text style={styles.headerSubtitle}>Choose your analysis type</Text>
          </Animated.View>

          {/* Feature Cards */}
          <Animated.View 
            style={[
              styles.cardsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.featureCard}
              onPress={handleSkinConditionDetection}
              activeOpacity={0.7}
            >
              <View style={styles.cardTop}>
                <View style={[styles.cardIconWrapper, { backgroundColor: '#F0F9FF' }]}>
                  <View style={[styles.cardIcon, { backgroundColor: '#2196F3' }]}>
                    <Ionicons name="water" size={28} color="#FFFFFF" />
                  </View>
                </View>
                <View style={[styles.cardBadge, { backgroundColor: '#E3F2FF' }]}>
                  <Ionicons name="sparkles" size={12} color="#2196F3" />
                  <Text style={[styles.cardBadgeText, { color: '#2196F3' }]}>Popular</Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>Skin Condition</Text>
              <Text style={styles.cardDescription}>
                Analyze dryness, oiliness, texture & overall skin health
              </Text>

              <View style={styles.cardFooter}>
                <View style={styles.cardFeatures}>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                    <Text style={styles.featureText}>Face analysis</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                    <Text style={styles.featureText}>Instant result</Text>
                  </View>
                </View>
                <View style={[styles.cardArrow, { backgroundColor: `${primaryColor}15` }]}>
                  <Ionicons name="arrow-forward" size={18} color={primaryColor} />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.featureCard}
              onPress={handleDiseaseDetection}
              activeOpacity={0.7}
            >
              <View style={styles.cardTop}>
                <View style={[styles.cardIconWrapper, { backgroundColor: '#FFF0F6' }]}>
                  <View style={[styles.cardIcon, { backgroundColor: '#E91E63' }]}>
                    <Ionicons name="medical" size={28} color="#FFFFFF" />
                  </View>
                </View>
                <View style={[styles.cardBadge, { backgroundColor: '#FFE8F0' }]}>
                  <Ionicons name="shield-checkmark" size={12} color="#E91E63" />
                  <Text style={[styles.cardBadgeText, { color: '#E91E63' }]}>Advanced</Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>Disease Detection</Text>
              <Text style={styles.cardDescription}>
                Identify potential skin diseases & conditions with AI
              </Text>

              <View style={styles.cardFooter}>
                <View style={styles.cardFeatures}>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                    <Text style={styles.featureText}>Any skin area</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                    <Text style={styles.featureText}>AI powered</Text>
                  </View>
                </View>
                <View style={[styles.cardArrow, { backgroundColor: `${primaryColor}15` }]}>
                  <Ionicons name="arrow-forward" size={18} color={primaryColor} />
                </View>
              </View>
            </TouchableOpacity>
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
            <View style={styles.disclaimerIconWrapper}>
              <Ionicons name="shield-checkmark" size={18} color="#FF9800" />
            </View>
            <View style={styles.disclaimerContent}>
              <Text style={styles.disclaimerTitle}>Medical Disclaimer</Text>
              <Text style={styles.disclaimerText}>
                Results are for informational purposes only. Always consult a healthcare professional for diagnosis.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // Disease Options Screen
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      
      {/* Decorative Background */}
      <View style={styles.backgroundPattern}>
        <View style={[styles.circle1, { backgroundColor: `${primaryColor}08` }]} />
        <View style={[styles.circle2, { backgroundColor: `${primaryColor}05` }]} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <Animated.View 
          style={[
            styles.backButtonContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
        </Animated.View>

        {/* Header */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={[styles.headerIcon, { backgroundColor: '#FFE8F0' }]}>
            <Ionicons name="medical" size={32} color="#E91E63" />
          </View>
          <Text style={styles.headerTitle}>Choose Skin Area</Text>
          <Text style={styles.headerSubtitle}>Select the area to analyze for disease detection</Text>
        </Animated.View>

        {/* Area Selection Cards */}
        <Animated.View 
          style={[
            styles.cardsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.areaCard}
            onPress={handleFacialDisease}
            activeOpacity={0.7}
          >
            <View style={[styles.areaIconWrapper, { backgroundColor: '#FFF4E6' }]}>
              <Ionicons name="happy" size={28} color="#FF9800" />
            </View>
            <View style={styles.areaContent}>
              <Text style={styles.areaTitle}>Facial Skin Area</Text>
              <Text style={styles.areaDescription}>Use front camera with face guide</Text>
            </View>
            <View style={[styles.areaArrow, { backgroundColor: `${primaryColor}10` }]}>
              <Ionicons name="chevron-forward" size={20} color={primaryColor} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.areaCard}
            onPress={handleOtherDisease}
            activeOpacity={0.7}
          >
            <View style={[styles.areaIconWrapper, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="body" size={28} color="#34C759" />
            </View>
            <View style={styles.areaContent}>
              <Text style={styles.areaTitle}>Other Skin Area</Text>
              <Text style={styles.areaDescription}>Use back camera for body areas</Text>
            </View>
            <View style={[styles.areaArrow, { backgroundColor: `${primaryColor}10` }]}>
              <Ionicons name="chevron-forward" size={20} color={primaryColor} />
            </View>
          </TouchableOpacity>
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
          <View style={styles.disclaimerIconWrapper}>
            <Ionicons name="shield-checkmark" size={18} color="#FF9800" />
          </View>
          <View style={styles.disclaimerContent}>
            <Text style={styles.disclaimerTitle}>Medical Disclaimer</Text>
            <Text style={styles.disclaimerText}>
              Results are for informational purposes only. Always consult a healthcare professional for diagnosis.
            </Text>
          </View>
        </Animated.View>
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
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  backButtonContainer: {
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  cardBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardFeatures: {
    flex: 1,
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  cardArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  areaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  areaIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  areaContent: {
    flex: 1,
  },
  areaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  areaDescription: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  areaArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  disclaimerIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  disclaimerContent: {
    flex: 1,
  },
  disclaimerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    fontWeight: '500',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  loadingIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});