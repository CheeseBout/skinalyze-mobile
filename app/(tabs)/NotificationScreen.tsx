import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useNotificationWebSocket } from "@/hooks/useNotificationWebSocket";
import { Notification } from "@/services/notificationWebSocketService";

export default function NotificationScreen() {
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  } = useNotificationWebSocket();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      Alert.alert("Error", "Failed to mark notification as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      Alert.alert("Success", "All notifications marked as read");
    } catch (error) {
      Alert.alert("Error", "Failed to mark all as read");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "#FF3B30";
      case "high":
        return "#FF9500";
      case "medium":
        return "#007AFF";
      case "low":
        return "#8E8E93";
      default:
        return "#8E8E93";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "alert-circle";
      case "high":
        return "warning";
      case "medium":
        return "information-circle";
      case "low":
        return "chatbubble-ellipses";
      default:
        return "notifications";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "appointment":
        return "calendar";
      case "reminder":
        return "alarm";
      case "message":
        return "chatbubble";
      case "system":
        return "settings";
      case "promotion":
        return "pricetag";
      default:
        return "notifications";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
      onPress={() => handleMarkAsRead(item.notificationId)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={getTypeIcon(item.type) as any}
            size={24}
            color={getPriorityColor(item.priority)}
          />
        </View>
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.timestamp}>{formatDate(item.createdAt)}</Text>
        </View>
        <Ionicons
          name={getPriorityIcon(item.priority) as any}
          size={20}
          color={getPriorityColor(item.priority)}
        />
      </View>

      <Text style={styles.message} numberOfLines={3}>
        {item.message}
      </Text>

      <View style={styles.footer}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.type}</Text>
        </View>
        <View
          style={[
            styles.priorityBadge,
            { backgroundColor: getPriorityColor(item.priority) + "20" },
          ]}
        >
          <Text
            style={[
              styles.priorityText,
              { color: getPriorityColor(item.priority) },
            ]}
          >
            {item.priority}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={80} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptySubtitle}>
        You're all caught up! Check back later for updates.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Connection Status */}
      <View style={styles.statusBar}>
        <View style={styles.statusIndicator}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isConnected ? "#34C759" : "#FF3B30" },
            ]}
          />
          <Text style={styles.statusText}>
            {isConnected ? "Connected" : "Disconnected"}
          </Text>
        </View>
        <View style={styles.statusRight}>
          {unreadCount > 0 && (
            <Text style={styles.unreadCount}>
              {unreadCount} unread
            </Text>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity
              onPress={handleMarkAllAsRead}
              style={styles.markAllButton}
            >
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.notificationId}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: "#666666",
  },
  statusRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  unreadCount: {
    fontSize: 14,
    color: "#666666",
    fontWeight: "500",
    marginRight: 12,
  },
  markAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markAllText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  notificationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#007AFF",
    marginLeft: 8,
  },
  timestamp: {
    fontSize: 12,
    color: "#999999",
  },
  message: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  badge: {
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    color: "#666666",
    fontWeight: "500",
    textTransform: "capitalize",
  },
  priorityBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333333",
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#999999",
    textAlign: "center",
    lineHeight: 24,
  },
});