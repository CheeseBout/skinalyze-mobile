import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native'
import React, { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import FacialSkinCamera from '@/components/FacialSkinCamera'
import OtherAreaCamera from '@/components/OtherAreaCamera'

type ScreenState = 'options' | 'diseaseOptions' | 'camera';
type DetectionType = 'skinCondition' | 'facialSkin' | 'otherSkin';

export default function AnalyzeScreen() {
  const [screenState, setScreenState] = useState<ScreenState>('options');
  const [detectionType, setDetectionType] = useState<DetectionType | null>(null);

  const handleSkinConditionDetection = () => {
    setDetectionType('skinCondition');
    setScreenState('camera');
  };

  const handleDiseaseDetection = () => {
    setScreenState('diseaseOptions');
  };

  const handleFacialSkin = () => {
    setDetectionType('facialSkin');
    setScreenState('camera');
  };

  const handleOtherSkin = () => {
    setDetectionType('otherSkin');
    setScreenState('camera');
  };

  const handleBack = () => {
    if (screenState === 'camera') {
      if (detectionType === 'facialSkin') {
        setScreenState('diseaseOptions');
      } else if (detectionType === 'otherSkin') {
        setScreenState('diseaseOptions');
      } else {
        setScreenState('options');
      }
      setDetectionType(null);
    } else if (screenState === 'diseaseOptions') {
      setScreenState('options');
      setDetectionType(null);
    }
  };

  const handleCapture = (imageUri: string) => {
    console.log('Image captured:', imageUri);
    console.log('Detection type:', detectionType);
    
    let message = '';
    switch (detectionType) {
      case 'skinCondition':
        message = 'Analyzing skin condition...';
        break;
      case 'facialSkin':
        message = 'Analyzing facial skin for disease detection...';
        break;
      case 'otherSkin':
        message = 'Analyzing skin area for disease detection...';
        break;
    }
    
    Alert.alert('Image Captured', message);
    setScreenState('options');
    setDetectionType(null);
  };

  // Camera Screen
  if (screenState === 'camera') {
    // Use FacialSkinCamera ONLY for facial skin (Disease Detection -> Facial Skin)
    if (detectionType === 'facialSkin') {
      return (
        <FacialSkinCamera 
          onCapture={handleCapture}
          onClose={handleBack}
          initialFacing="front"
          title="Position your face in the frame"
        />
      );
    }

    // Use OtherAreaCamera for BOTH Skin Condition AND Other Skin Area
    const cameraTitle = "Hold the camera close for best image quality and detection accuracy."
    
    return (
      <OtherAreaCamera 
        onCapture={handleCapture}
        onClose={handleBack}
        title={cameraTitle}
      />
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
                <Text style={styles.cardTitle}>Skin Condition</Text>
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
          <Text style={styles.headerSubtitle}>Select the area to analyze</Text>
        </View>

        {/* Cards */}
        <View style={styles.cardsContainer}>
          <TouchableOpacity 
            style={styles.card}
            onPress={handleFacialSkin}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="happy" size={32} color="#FF9800" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Facial Skin</Text>
              <Text style={styles.cardDescription}>Use front camera with face guide</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card}
            onPress={handleOtherSkin}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="body" size={32} color="#4CAF50" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Other Skin Area</Text>
              <Text style={styles.cardDescription}>Use back camera</Text>
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
});