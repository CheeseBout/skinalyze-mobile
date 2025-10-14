import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import React, { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'

type ScreenState = 'options' | 'diseaseOptions';
type DetectionType = 'skinCondition' | 'facialSkin' | 'otherSkin';

export default function AnalyzeScreen() {
  const [screenState, setScreenState] = useState<ScreenState>('options');
  const [detectionType, setDetectionType] = useState<DetectionType | null>(null);

  const handleSkinConditionDetection = () => {
    setDetectionType('skinCondition');
    Alert.alert('Coming Soon', 'Camera feature requires development build. Building native app...');
  };

  const handleDiseaseDetection = () => {
    setScreenState('diseaseOptions');
  };

  const handleFacialSkin = () => {
    setDetectionType('facialSkin');
    Alert.alert('Coming Soon', 'Camera feature requires development build. Building native app...');
  };

  const handleOtherSkin = () => {
    setDetectionType('otherSkin');
    Alert.alert('Coming Soon', 'Camera feature requires development build. Building native app...');
  };

  const handleBack = () => {
    if (screenState === 'diseaseOptions') {
      setScreenState('options');
      setDetectionType(null);
    }
  };

  // Options Screen
  if (screenState === 'options') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Choose Detection Type</Text>
        <TouchableOpacity style={styles.optionButton} onPress={handleSkinConditionDetection}>
          <Ionicons name="water" size={40} color="#007AFF" />
          <Text style={styles.optionText}>Skin Condition Detection</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionButton} onPress={handleDiseaseDetection}>
          <Ionicons name="medical" size={40} color="#007AFF" />
          <Text style={styles.optionText}>Skin Disease Detection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Disease Options Screen
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Ionicons name="arrow-back" size={30} color="#007AFF" />
      </TouchableOpacity>
      <Text style={styles.title}>Choose Skin Area</Text>
      <TouchableOpacity style={styles.optionButton} onPress={handleFacialSkin}>
        <Ionicons name="happy" size={40} color="#007AFF" />
        <Text style={styles.optionText}>Facial Skin</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.optionButton} onPress={handleOtherSkin}>
        <Ionicons name="body" size={40} color="#007AFF" />
        <Text style={styles.optionText}>Other Skin Area</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#333',
  },
  optionButton: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 10,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1,
  },
});