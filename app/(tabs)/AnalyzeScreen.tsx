import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native'
import React, { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import FacialSkinCamera from '@/components/FacialSkinCamera'
import OtherAreaCamera from '@/components/OtherAreaCamera'
import { useAuth } from '@/hooks/useAuth';
import skinAnalysisService from '@/services/skinAnalysisService';

type ScreenState = 'options' | 'diseaseOptions' | 'camera';
type DetectionType = 'skinCondition' | 'facialDisease' | 'otherDisease';

export default function AnalyzeScreen() {
  const [screenState, setScreenState] = useState<ScreenState>('options');
  const [detectionType, setDetectionType] = useState<DetectionType | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

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
    console.log('📸 Image captured:', imageUri);
    console.log('🔍 Detection type:', detectionType);
    
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
        console.log('🌊 Starting skin condition analysis...');
        result = await skinAnalysisService.detectCondition(user.userId, imageUri);
        
        // Navigate to detail screen with result
        setScreenState('options');
        setDetectionType(null);
        setIsAnalyzing(false);
        
        router.push({
          pathname: '/(stacks)/AnalysisDetailScreen',
          params: {
            result: JSON.stringify(result)
          }
        });
        
      } else if (detectionType === 'facialDisease' || detectionType === 'otherDisease') {
        console.log('🔬 Starting disease detection...');
        result = await skinAnalysisService.detectDisease(user.userId, imageUri);
        
        // Navigate to detail screen with result
        setScreenState('options');
        setDetectionType(null);
        setIsAnalyzing(false);
        
        router.push({
          pathname: '/(stacks)/AnalysisDetailScreen',
          params: {
            result: JSON.stringify(result)
          }
        });
      }

      console.log('📊 Full analysis result:', result);
      
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
    // Front camera for Skin Condition and Facial Disease
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
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Analyzing image...</Text>
              </View>
            </View>
          )}
        </>
      );
    }

    // Back camera for Other Disease Detection
    return (
      <>
        <OtherAreaCamera 
          onCapture={handleCapture}
          onClose={handleBack}
          title="Hold the camera close for best image quality and detection accuracy"
        />
        {isAnalyzing && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Analyzing image...</Text>
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
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Skin Analysis with AI</Text>
            <Text style={styles.headerSubtitle}>Choose your analysis type</Text>
          </View>

          {/* Cards */}
          <View style={styles.cardsContainer}>
            <TouchableOpacity 
              style={styles.card}
              onPress={handleSkinConditionDetection}
              activeOpacity={0.8}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="water" size={32} color="#2196F3" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Skin Condition Detection</Text>
                <Text style={styles.cardDescription}>Analyze dryness, oiliness & texture</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.card}
              onPress={handleDiseaseDetection}
              activeOpacity={0.8}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#FCE4EC' }]}>
                <Ionicons name="medical" size={32} color="#E91E63" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Disease Detection</Text>
                <Text style={styles.cardDescription}>Identify potential skin conditions</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Ionicons name="information-circle-outline" size={20} color="#FF9800" />
            <Text style={styles.disclaimerText}>
              Results are for reference only and not a medical diagnosis. Consult a healthcare professional for any health concerns.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Disease Options Screen
  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Choose Skin Area</Text>
          <Text style={styles.headerSubtitle}>Select the area to analyze for disease detection</Text>
        </View>

        {/* Cards */}
        <View style={styles.cardsContainer}>
          <TouchableOpacity 
            style={styles.card}
            onPress={handleFacialDisease}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="happy" size={32} color="#FF9800" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Facial Skin Area</Text>
              <Text style={styles.cardDescription}>Use front camera with face guide</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card}
            onPress={handleOtherDisease}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="body" size={32} color="#4CAF50" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Other Skin Area</Text>
              <Text style={styles.cardDescription}>Use back camera for body areas</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={20} color="#FF9800" />
          <Text style={styles.disclaimerText}>
            Results are for reference only and not a medical diagnosis. Consult a healthcare professional for any health concerns.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '400',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 10,
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginLeft: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});