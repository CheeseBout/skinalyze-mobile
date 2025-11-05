import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import React from "react";
import { router } from "expo-router";

export default function SettingsScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⚙️ Settings</Text>
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
        <Text style={styles.sectionTitle}>📱 App Settings</Text>

        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingIcon}>🌐</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Language</Text>
            <Text style={styles.settingDescription}>English</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingIcon}>🎨</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Theme</Text>
            <Text style={styles.settingDescription}>Light</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#3498db",
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
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
});
