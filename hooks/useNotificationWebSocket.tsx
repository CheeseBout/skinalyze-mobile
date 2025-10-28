import { useEffect, useState, useCallback } from "react";

import { useAuth } from "./useAuth";
import {
  notificationWebSocketService,
  Notification,
} from "@/services/notificationWebSocketService";
import { requestNotificationPermission } from "@/services/notificationPermissionService";
import { localNotificationService } from "@/services/localNotificationService";

/**
 * Custom hook để sử dụng WebSocket notifications
 */
export function useNotificationWebSocket() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Kết nối WebSocket khi user đăng nhập
  useEffect(() => {
    if (user) {
      console.log("╔══════════════════════════════════════════════════╗");
      console.log("║  � USER LOGGED IN - CONNECTING WEBSOCKET       ║");
      console.log("╚══════════════════════════════════════════════════╝");
      console.log("👤 User ID:", user.userId);
      console.log("📧 Email:", user.email);

      // Xin permission thông báo trước khi kết nối WebSocket
      requestNotificationPermission().then((granted) => {
        if (granted) {
          console.log("✅ Notification permission granted");
        } else {
          console.log("⚠️ Notification permission denied");
        }
      });

      // Request permission cho local notifications
      localNotificationService.requestPermissions().then((granted) => {
        if (granted) {
          console.log("✅ Local notification permission granted");
          // Configure notification channels
          localNotificationService.configure();
        } else {
          console.log("⚠️ Local notification permission denied");
        }
      });

      console.log("🔌 Initiating WebSocket connection...");
      notificationWebSocketService.connect();
    } else {
      console.log("╔══════════════════════════════════════════════════╗");
      console.log("║  � USER LOGGED OUT - DISCONNECTING WEBSOCKET   ║");
      console.log("╚══════════════════════════════════════════════════╝");
      console.log("🔌 Closing WebSocket connection...");
      notificationWebSocketService.disconnect();
      console.log("🧹 Clearing notifications list...");
      setNotifications([]);
      console.log("🧹 Resetting unread count...");
      setUnreadCount(0);
      console.log("✅ Cleanup completed!");
    }

    return () => {
      // Cleanup khi unmount
      console.log("🧹 Hook unmounting, disconnecting WebSocket...");
      notificationWebSocketService.disconnect();
    };
  }, [user]);

  // Lắng nghe connection status
  useEffect(() => {
    const unsubscribe = notificationWebSocketService.onConnectionChange(
      (connected) => {
        console.log("╔══════════════════════════════════════════════════╗");
        if (connected) {
          console.log("║  ✅ HOOK: WEBSOCKET CONNECTED!                  ║");
          console.log("╚══════════════════════════════════════════════════╝");
          console.log("🟢 Status: CONNECTED");
        } else {
          console.log("║  ❌ HOOK: WEBSOCKET DISCONNECTED!               ║");
          console.log("╚══════════════════════════════════════════════════╝");
          console.log("🔴 Status: DISCONNECTED");
        }
        console.log("⏰ Status changed at:", new Date().toLocaleString());
        console.log("🔄 Updating state...");
        setIsConnected(connected);
        console.log("✅ State updated! isConnected =", connected);
      }
    );

    return unsubscribe;
  }, []);

  // Lắng nghe notification mới
  useEffect(() => {
    const unsubscribe = notificationWebSocketService.onNewNotification(
      (notification) => {
        console.log("╔══════════════════════════════════════════════════╗");
        console.log("║  📱 HOOK: NEW NOTIFICATION RECEIVED!            ║");
        console.log("╚══════════════════════════════════════════════════╝");
        console.log("📝 Title:", notification.title);
        console.log("💬 Message:", notification.message);
        console.log("🏷️  Type:", notification.type);
        console.log("⚠️  Priority:", notification.priority);
        console.log("🆔 ID:", notification.notificationId);
        console.log(
          "⏰ Created:",
          new Date(notification.createdAt).toLocaleString()
        );
        console.log("🔄 Adding to notifications list...");

        // Hiển thị local notification popup
        localNotificationService.showNotification(notification);

        // Thêm vào đầu danh sách
        setNotifications((prev) => {
          const updated = [notification, ...prev];
          console.log(
            `✅ List updated! Total: ${updated.length} notifications`
          );
          return updated;
        });
      }
    );

    return unsubscribe;
  }, []);

  // Lắng nghe unread count
  useEffect(() => {
    const unsubscribe = notificationWebSocketService.onUnreadCount((data) => {
      console.log("╔══════════════════════════════════════════════════╗");
      console.log("║  📊 HOOK: UNREAD COUNT UPDATED!                 ║");
      console.log("╚══════════════════════════════════════════════════╝");
      console.log("🔢 New count:", data.count);
      console.log("⏰ Updated at:", new Date().toLocaleString());
      setUnreadCount(data.count);

      // Cập nhật badge count cho iOS
      localNotificationService.setBadgeCount(data.count);

      console.log("✅ State updated successfully!");
    });

    return unsubscribe;
  }, []);

  // Lắng nghe notifications read
  useEffect(() => {
    const unsubscribe = notificationWebSocketService.onNotificationsRead(
      (data) => {
        console.log("╔══════════════════════════════════════════════════╗");
        console.log("║  ✅ HOOK: NOTIFICATIONS MARKED AS READ!         ║");
        console.log("╚══════════════════════════════════════════════════╝");
        console.log("📋 IDs:", data.notificationIds);
        console.log("🔢 Count:", data.notificationIds.length);
        console.log("🔄 Updating notification states...");

        // Cập nhật trạng thái đã đọc trong danh sách
        setNotifications((prev) => {
          const updated = prev.map((n) =>
            data.notificationIds.includes(n.notificationId)
              ? { ...n, isRead: true }
              : n
          );
          const readCount = updated.filter((n) =>
            data.notificationIds.includes(n.notificationId)
          ).length;
          console.log(`✅ ${readCount} notifications marked as read in list!`);
          return updated;
        });
      }
    );

    return unsubscribe;
  }, []);

  // Hàm refresh unread count
  const refreshUnreadCount = useCallback(() => {
    notificationWebSocketService.getUnreadCount();
  }, []);

  // Hàm clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Hàm refresh notifications (get latest from server)
  const refreshNotifications = useCallback(async () => {
    console.log("🔄 Refreshing notifications...");
    await refreshUnreadCount();
    // Có thể thêm API call để fetch notifications history từ server
  }, [refreshUnreadCount]);

  // Hàm mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    console.log("✅ Marking notification as read:", notificationId);
    notificationWebSocketService.markAsRead([notificationId]);
    // Update local state
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.notificationId === notificationId
          ? { ...notif, isRead: true }
          : notif
      )
    );
  }, []);

  // Hàm mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    console.log("✅ Marking all notifications as read");
    const unreadIds = notifications
      .filter((n) => !n.isRead)
      .map((n) => n.notificationId);

    if (unreadIds.length > 0) {
      notificationWebSocketService.markAsRead(unreadIds);
      // Update local state
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );
    }
  }, [notifications]);

  // Hàm manually connect
  const connect = useCallback(() => {
    notificationWebSocketService.connect();
  }, []);

  // Hàm manually disconnect
  const disconnect = useCallback(() => {
    notificationWebSocketService.disconnect();
  }, []);

  return {
    isConnected,
    unreadCount,
    notifications,
    refreshUnreadCount,
    refreshNotifications,
    clearNotifications,
    markAsRead,
    markAllAsRead,
    connect,
    disconnect,
  };
}
