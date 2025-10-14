import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { FaceDetector, FilesetResolver, Detection } from '@mediapipe/tasks-vision';

interface FacialSkinCameraProps {
  onCapture?: (imageUri: string, faceData: Detection[]) => void;
  onClose: () => void;
}

export default function FacialSkinCamera({ onCapture, onClose }: FacialSkinCameraProps) {
  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [faceDetector, setFaceDetector] = useState<FaceDetector | null>(null);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    initializeFaceDetector();
  }, []);

  const initializeFaceDetector = async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      
      const detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
          delegate: 'GPU'
        },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.5,
      });

      setFaceDetector(detector);
    } catch (error) {
      console.error('Failed to initialize face detector:', error);
      Alert.alert('Error', 'Failed to initialize face detection');
    }
  };

  if (!permission) {
    return <View style={styles.container}><ActivityIndicator size="large" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to use the camera</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const takePicture = async () => {
    if (!cameraRef.current || !faceDetector) {
      Alert.alert('Error', 'Camera or face detector not ready');
      return;
    }

    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!photo || !photo.base64) {
        throw new Error('Failed to capture image');
      }

      // Convert base64 to image for MediaPipe
      const image = new Image();
      image.src = `data:image/jpeg;base64,${photo.base64}`;
      
      await new Promise((resolve) => {
        image.onload = resolve;
      });

      // Detect faces
      const detections = faceDetector.detect(image);

      if (detections.detections.length === 0) {
        Alert.alert('No Face Detected', 'Please ensure your face is visible in the frame');
        setIsProcessing(false);
        return;
      }

      // Call the callback with image and face data
      if (onCapture) {
        onCapture(photo.uri, detections.detections);
      }

      Alert.alert(
        'Face Detected!',
        `Found ${detections.detections.length} face(s) with confidence ${(detections.detections[0].categories[0].score * 100).toFixed(1)}%`
      );

    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to capture and analyze image');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing={facing}
        ref={cameraRef}
      >
        <View style={styles.overlay}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={32} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Position your face in the frame</Text>
          </View>

          <View style={styles.faceGuide} />

          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
              <Ionicons name="camera-reverse" size={32} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]} 
              onPress={takePicture}
              disabled={isProcessing || !faceDetector}
            >
              {isProcessing ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>
            
            <View style={styles.placeholder} />
          </View>
        </View>
      </CameraView>

      {!faceDetector && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Initializing face detection...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  closeButton: {
    padding: 10,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 20,
  },
  faceGuide: {
    position: 'absolute',
    top: '30%',
    left: '15%',
    width: '70%',
    height: '40%',
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: 200,
    opacity: 0.5,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  flipButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  placeholder: {
    width: 60,
  },
  message: {
    textAlign: 'center',
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
});