// File: app/(stacks)/ManualSkinAnalysisScreen.tsx

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from "react-native";
import React, { useState, useContext } from "react";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

// Services
import skinAnalysisService from "@/services/skinAnalysisService";
import customerService from "@/services/customerService";
import { AuthContext } from "@/contexts/AuthContext";

export default function ManualSkinAnalysisScreen() {
  const router = useRouter();
  const { user } = useContext(AuthContext);

  // State cho Form
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUris, setImageUris] = useState<string[]>([]); // (Lưu mảng ảnh)

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Logic Chọn Ảnh (Hỗ trợ nhiều ảnh)
  const pickImages = async () => {
    // Yêu cầu quyền
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "We need access to your photos to upload skin images."
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Tắt edit để chọn được nhiều ảnh nhanh hơn
        allowsMultipleSelection: true, // <-- QUAN TRỌNG: Cho phép chọn nhiều
        quality: 0.8,
        selectionLimit: 5, // Giới hạn 5 ảnh
      });

      if (!result.canceled) {
        const newUris = result.assets.map((asset) => asset.uri);
        setImageUris((prev) => [...prev, ...newUris]); // Thêm vào danh sách hiện có
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick images.");
    }
  };

  // Hàm xóa ảnh khỏi danh sách
  const removeImage = (indexToRemove: number) => {
    setImageUris((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  // 2. Logic Submit Form
  const handleSubmit = async () => {
    if (!chiefComplaint.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter your main concern (Chief Complaint)."
      );
      return;
    }
    if (!symptoms.trim()) {
      Alert.alert("Missing Information", "Please describe your symptoms.");
      return;
    }

    if (!user?.userId) return;

    setIsSubmitting(true);
    try {
      // B2: Gọi API tạo Manual Entry
      await skinAnalysisService.createManualEntry({
        chiefComplaint,
        patientSymptoms: symptoms,
        notes,
        imageUris: imageUris,
      });

      // B3: Thành công -> Quay lại
      Alert.alert("Success", "Your skin profile has been created!", [
        {
          text: "Continue Booking",
          onPress: () => router.back(), // Quay lại BookingConfirmation để reload list
        },
      ]);
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Submission Failed",
        error.message || "Could not save your profile. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Self-Report Condition</Text>
            <Text style={styles.subtitle}>
              Please describe your skin condition details. The doctor will
              review this before your consultation.
            </Text>
          </View>

          {/* Card 1: Thông tin chính */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Condition Details</Text>

            {/* Chief Complaint */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Main Concern <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Acne breakouts on forehead"
                placeholderTextColor="#999"
                value={chiefComplaint}
                onChangeText={setChiefComplaint}
              />
            </View>

            {/* Symptoms */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Symptoms <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g. Redness, itching, started 3 days ago..."
                placeholderTextColor="#999"
                value={symptoms}
                onChangeText={setSymptoms}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Additional Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any allergies, current products using..."
                placeholderTextColor="#999"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Card 2: Hình ảnh */}
          <View style={styles.card}>
            <View style={styles.imageHeaderRow}>
              <Text style={styles.cardTitle}>Photos</Text>
              <Text style={styles.imageCount}>{imageUris.length}/5</Text>
            </View>
            <Text style={styles.helperText}>
              Upload close-up photos of the affected area.
            </Text>

            {/* Danh sách ảnh ngang */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imageList}
            >
              {/* Nút Thêm Ảnh */}
              {imageUris.length < 5 && (
                <Pressable style={styles.addImageButton} onPress={pickImages}>
                  <Ionicons name="camera" size={32} color="#007bff" />
                  <Text style={styles.addImageText}>Add Photo</Text>
                </Pressable>
              )}

              {/* Render các ảnh đã chọn */}
              {imageUris.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: uri }} style={styles.thumbnail} />
                  <Pressable
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>

        {/* Footer Button */}
        <View style={styles.footer}>
          <Pressable
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Profile</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5ff",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    // Shadow
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#444",
    marginBottom: 8,
  },
  required: {
    color: "#d9534f",
  },
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#333",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },

  // Image Section Styles
  imageHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  imageCount: {
    fontSize: 14,
    color: "#888",
    fontWeight: "600",
  },
  helperText: {
    fontSize: 14,
    color: "#888",
    marginBottom: 16,
  },
  imageList: {
    flexDirection: "row",
  },
  addImageButton: {
    width: 100,
    height: 100,
    backgroundColor: "#f0f8ff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cce5ff",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  addImageText: {
    color: "#007bff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  imageWrapper: {
    position: "relative",
    marginRight: 12,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  removeButton: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  // Footer Styles
  footer: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#eee",
    // Fixed at bottom
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  submitButton: {
    backgroundColor: "#007bff",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#007bff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: "#a0c4ff",
    elevation: 0,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
