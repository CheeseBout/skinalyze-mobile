import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from "react-native";
import React, { useState } from "react";
import { router } from "expo-router";
import { useThemeColor } from "@/contexts/ThemeColorContext";
import { Ionicons } from "@expo/vector-icons";
import ColorPicker from 'react-native-wheel-color-picker';

export default function SettingsScreen() {
  const { themeColor, setThemeColor, primaryColor, customColor, setCustomColor } = useThemeColor();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState(customColor || '#007AFF');
  
  const themeOptions: Array<{ color: "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "custom"; label: string; hex: string }> = [
    { color: 'red', label: 'Red', hex: '#FF3B30' },
    { color: 'orange', label: 'Orange', hex: '#FF9500' },
    { color: 'yellow', label: 'Yellow', hex: '#FFCC00' },
    { color: 'green', label: 'Green', hex: '#34C759' },
    { color: 'blue', label: 'Blue', hex: '#007AFF' },
    { color: 'purple', label: 'Purple', hex: '#AF52DE' },
    { color: 'custom', label: 'Custom', hex: customColor || '#007AFF' },
  ];

  const handleCustomColorSelect = () => {
    setSelectedColor(customColor || '#007AFF');
    setShowColorPicker(true);
  };

  const handleSaveCustomColor = () => {
    setCustomColor(selectedColor);
    setThemeColor('custom');
    setShowColorPicker(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, { backgroundColor: primaryColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 Developer Tools</Text>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => router.push("../(tabs)/NotificationScreen")}
        >
          <Text style={styles.settingIcon}>🔔</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Notification Test</Text>
            <Text style={styles.settingDescription}>
              Test WebSocket real-time notifications
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎨 Theme Color</Text>
        
        <View style={styles.themeContainer}>
          {themeOptions.map((option) => (
            <TouchableOpacity
              key={option.color}
              style={styles.themeOption}
              onPress={() => {
                if (option.color === 'custom') {
                  handleCustomColorSelect();
                } else {
                  setThemeColor(option.color);
                }
              }}
            >
              <View
                style={[
                  styles.colorCircle,
                  { backgroundColor: option.color === 'custom' ? (customColor || option.hex) : option.hex },
                  themeColor === option.color && styles.colorCircleSelected,
                ]}
              >
                {themeColor === option.color && (
                  <Ionicons name="checkmark" size={24} color="#fff" />
                )}
                {option.color === 'custom' && themeColor !== 'custom' && (
                  <Ionicons name="color-palette" size={24} color="#fff" />
                )}
              </View>
              <Text style={styles.themeLabel}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 App Settings</Text>

        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingIcon}>🌐</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Language</Text>
            <Text style={styles.settingDescription}>English</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ About</Text>

        <View style={styles.settingItem}>
          <Text style={styles.settingIcon}>📦</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Version</Text>
            <Text style={styles.settingDescription}>1.0.0</Text>
          </View>
        </View>
      </View>

      {/* Color Picker Modal */}
      <Modal
        visible={showColorPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowColorPicker(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowColorPicker(false)}
        >
          <Pressable 
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Custom Color</Text>
              <TouchableOpacity onPress={() => setShowColorPicker(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              <ColorPicker
                color={selectedColor}
                onColorChange={(color) => setSelectedColor(color)}
                thumbSize={30}
                sliderSize={30}
                noSnap={true}
                row={false}
                swatches={true}
                discrete={false}
              />
            </View>

            <View style={styles.colorPreview}>
              <Text style={styles.previewLabel}>Selected Color</Text>
              <View
                style={[
                  styles.previewCircle,
                  { backgroundColor: selectedColor }
                ]}
              />
              <Text style={styles.hexText}>{selectedColor.toUpperCase()}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowColorPicker(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: selectedColor }]}
                onPress={handleSaveCustomColor}
              >
                <Text style={styles.saveButtonText}>Apply Color</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  section: {
    marginTop: 20,
    backgroundColor: "#fff",
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7f8c8d",
    paddingHorizontal: 20,
    paddingVertical: 10,
    textTransform: "uppercase",
  },
  themeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 16,
  },
  themeOption: {
    alignItems: 'center',
    width: 80,
  },
  colorCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#000',
  },
  themeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50',
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  arrow: {
    fontSize: 24,
    color: "#bdc3c7",
    fontWeight: "300",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  pickerContainer: {
    height: 350,
    marginBottom: 20,
  },
  colorPreview: {
    alignItems: 'center',
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  previewCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  hexText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    fontFamily: 'monospace',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});