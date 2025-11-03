import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SkinAnalysisResult } from '@/services/skinAnalysisService';

const { width } = Dimensions.get('window');

export default function AnalysisDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [showMask, setShowMask] = useState(false);

  // Parse the result from navigation params
  const result: SkinAnalysisResult = params.result 
    ? JSON.parse(params.result as string) 
    : null;

  if (!result) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>No analysis data available</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isConditionDetection = result.aiDetectedCondition !== null;
  const isDiseaseDetection = result.aiDetectedDisease !== null;
  const imageUrl = result.imageUrls[0];
  const maskBase64 = result.mask?.[0];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analysis Result</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Display */}
        <View style={styles.imageContainer}>
          {isDiseaseDetection && maskBase64 ? (
            <>
              {/* Original Image */}
              <Image 
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="cover"
              />
              
              {/* Mask Overlay with Red Tint */}
              {showMask && (
                <View style={styles.maskContainer}>
                  <Image 
                    source={{ uri: `data:image/png;base64,${maskBase64}` }}
                    style={styles.maskImage}
                    resizeMode="cover"
                  />
                  {/* Red tint overlay */}
                  <View style={styles.redTintOverlay} />
                </View>
              )}
              
              {/* Toggle Mask Button */}
              <View style={styles.imageControls}>
                <TouchableOpacity 
                  style={[styles.toggleButton, showMask && styles.toggleButtonActive]}
                  onPress={() => setShowMask(!showMask)}
                >
                  <Ionicons 
                    name={showMask ? "eye-off" : "eye"} 
                    size={20} 
                    color={showMask ? "#fff" : "#007AFF"} 
                  />
                  <Text style={[styles.toggleButtonText, showMask && styles.toggleButtonTextActive]}>
                    {showMask ? "Hide Detection Mask" : "Show Detection Mask"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Image 
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          )}
        </View>

        {/* Analysis Information */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons 
              name={isConditionDetection ? "water" : "medical"} 
              size={32} 
              color={isConditionDetection ? "#2196F3" : "#E91E63"} 
            />
            <Text style={styles.infoTitle}>
              {isConditionDetection ? "Skin Condition" : "Disease Detection"}
            </Text>
          </View>

          <View style={styles.resultContainer}>
            <Text style={styles.resultLabel}>Detected:</Text>
            <Text style={[
              styles.resultValue,
              isConditionDetection ? styles.conditionValue : styles.diseaseValue
            ]}>
              {isConditionDetection ? result.aiDetectedCondition : result.aiDetectedDisease}
            </Text>
          </View>

          {/* Analysis Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>
                  {new Date(result.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>
                  {new Date(result.createdAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="analytics-outline" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Source</Text>
                <Text style={styles.detailValue}>
                  {result.source === 'AI_SCAN' ? 'AI Scan' : 'Manual'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={24} color="#FF9800" />
          <Text style={styles.disclaimerText}>
            This result is for reference only and not a medical diagnosis. 
            Please consult a healthcare professional for proper medical advice.
          </Text>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/AnalyzeScreen')}
        >
          <Ionicons name="camera" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>New Analysis</Text>
        </TouchableOpacity>
      </ScrollView>
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
  headerButton: {
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
  scrollContent: {
    paddingBottom: 40,
  },
  imageContainer: {
    backgroundColor: '#000',
    position: 'relative',
  },
  image: {
    width: width,
    height: width * 1.2,
  },
  maskContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: width * 1.2,
  },
  maskImage: {
    width: '100%',
    height: '100%',
    opacity: 0.15, 
  },
  redTintOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    mixBlendMode: 'multiply',
  },
  imageControls: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  resultContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  resultValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  conditionValue: {
    color: '#2196F3',
  },
  diseaseValue: {
    color: '#E91E63',
  },
  detailsContainer: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});