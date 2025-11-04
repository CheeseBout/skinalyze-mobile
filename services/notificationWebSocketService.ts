import { io, Socket } from "socket.io-client";
import { tokenService } from "./tokenService";

// Định nghĩa types cho notifications
export interface Notification {
  notificationId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "urgent";
  isRead: boolean;
  createdAt: string;
  metadata?: any;
}

export interface UnreadCountData {
  count: number;
}

export interface NotificationsReadData {
  notificationIds: string[];
}

// Event listeners type
type NotificationListener = (notification: Notification) => void;
type UnreadCountListener = (data: UnreadCountData) => void;
type NotificationsReadListener = (data: NotificationsReadData) => void;
type ConnectionListener = (isConnected: boolean) => void;

class NotificationWebSocketService {
  private socket: Socket | null = null;
  private isConnecting: boolean = false;
  private listeners: {
    newNotification: NotificationListener[];
    unreadCount: UnreadCountListener[];
    notificationsRead: NotificationsReadListener[];
    connection: ConnectionListener[];
  } = {
    newNotification: [],
    unreadCount: [],
    notificationsRead: [],
    connection: [],
  };

  // Thay đổi URL này theo backend của bạn
  private readonly SOCKET_URL = process.env.EXPO_BASE_URL || "http://192.168.1.249:3000"; // Android emulator localhost
  // private readonly SOCKET_URL = 'http://localhost:3000'; // iOS simulator
  // private readonly SOCKET_URL = 'https://api.skinalyze.com'; // Production

  /**
   * Kết nối đến WebSocket server
   */
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      console.log("✅ Already connected to WebSocket");
      return;
    }

    if (this.isConnecting) {
      console.log("⏳ Already connecting...");
      return;
    }

    this.isConnecting = true;

    try {
      // Lấy JWT token
      const token = await tokenService.getToken();

      if (!token) {
        console.error("❌ No access token found");
        this.isConnecting = false;
        return;
      }

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🔌 CONNECTING TO WEBSOCKET");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🌐 URL:", `${this.SOCKET_URL}/notifications`);
      console.log("🔑 Token:", token.substring(0, 20) + "...");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // Tạo socket connection
      this.socket = io(`${this.SOCKET_URL}/notifications`, {
        auth: {
          token: token,
        },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      // Setup event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error("❌ Error connecting to WebSocket:", error);
      this.isConnecting = false;
    }
  }

  /**
   * Setup các event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Kết nối thành công
    this.socket.on("connect", () => {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("✅ WEBSOCKET CONNECTED SUCCESSFULLY!");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🔌 Socket ID:", this.socket?.id);
      console.log("🌐 Server URL:", `${this.SOCKET_URL}/notifications`);
      console.log("⏰ Connected at:", new Date().toLocaleString());
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      this.isConnecting = false;
      this.notifyConnectionListeners(true);

      // Request unread count khi kết nối
      this.getUnreadCount();
    });

    // Lỗi kết nối
    this.socket.on("connect_error", (error) => {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("❌ WEBSOCKET CONNECTION ERROR!");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("🔴 Error:", error.message);
      console.error(
        "🌐 Trying to connect to:",
        `${this.SOCKET_URL}/notifications`
      );
      console.error("⏰ Error at:", new Date().toLocaleString());
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      this.isConnecting = false;
      this.notifyConnectionListeners(false);
    });

    // Ngắt kết nối
    this.socket.on("disconnect", (reason) => {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🔌 WEBSOCKET DISCONNECTED");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📍 Reason:", reason);
      console.log("⏰ Disconnected at:", new Date().toLocaleString());
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      this.notifyConnectionListeners(false);

      // Auto-reconnect nếu server ngắt kết nối
      if (reason === "io server disconnect") {
        console.log("🔄 Server disconnected, will auto-reconnect in 1s...");
        setTimeout(() => {
          this.socket?.connect();
        }, 1000);
      }
    });

    // Nhận notification mới
    this.socket.on("new-notification", (notification: Notification) => {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🔔 NEW NOTIFICATION FROM BACKEND!");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📝 Title:", notification.title);
      console.log("💬 Message:", notification.message);
      console.log("🏷️  Type:", notification.type);
      console.log("⚠️  Priority:", notification.priority);
      console.log("📖 Is Read:", notification.isRead);
      console.log("🆔 Notification ID:", notification.notificationId);
      console.log("👤 User ID:", notification.userId);
      console.log("⏰ Created At:", notification.createdAt);
      if (notification.metadata) {
        console.log(
          "📦 Metadata:",
          JSON.stringify(notification.metadata, null, 2)
        );
      }
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      this.notifyNewNotificationListeners(notification);
    });

    // Cập nhật số lượng chưa đọc
    this.socket.on("unread-count", (data: UnreadCountData) => {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📊 UNREAD COUNT UPDATE FROM BACKEND");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🔢 Count:", data.count);
      console.log("⏰ Received at:", new Date().toLocaleString());
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      this.notifyUnreadCountListeners(data);
    });

    // Notifications đã được đọc
    this.socket.on("notifications-read", (data: NotificationsReadData) => {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("✅ NOTIFICATIONS MARKED AS READ FROM BACKEND");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📋 Notification IDs:", data.notificationIds);
      console.log("🔢 Total marked as read:", data.notificationIds.length);
      console.log("⏰ Received at:", new Date().toLocaleString());
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      this.notifyNotificationsReadListeners(data);
    });

    // Reconnecting
    this.socket.on("reconnecting", (attemptNumber) => {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`🔄 RECONNECTING TO WEBSOCKET (Attempt ${attemptNumber}/5)`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    });

    // Reconnect thành công
    this.socket.on("reconnect", (attemptNumber) => {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`✅ WEBSOCKET RECONNECTED SUCCESSFULLY!`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`🔢 Attempts taken: ${attemptNumber}`);
      console.log("⏰ Reconnected at:", new Date().toLocaleString());
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      this.notifyConnectionListeners(true);
    });
  }

  /**
   * Ngắt kết nối
   */
  disconnect(): void {
    if (this.socket) {
      console.log("🔌 Disconnecting from WebSocket...");
      this.socket.disconnect();
      this.socket = null;
      this.notifyConnectionListeners(false);
    }
  }

  /**
   * Kiểm tra trạng thái kết nối
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Lấy số lượng notification chưa đọc
   */
  getUnreadCount(): void {
    if (!this.socket?.connected) {
      console.log("⚠️ Socket not connected");
      return;
    }

    this.socket.emit("get-unread-count", {}, (response: UnreadCountData) => {
      console.log("📊 Received unread count:", response.count);
      this.notifyUnreadCountListeners(response);
    });
  }

  /**
   * Đánh dấu notifications là đã đọc
   */
  markAsRead(notificationIds: string[]): void {
    if (!this.socket?.connected) {
      console.log("⚠️ Socket not connected");
      return;
    }

    console.log("✅ Marking notifications as read:", notificationIds);
    this.socket.emit("mark-as-read", { notificationIds });
  }

  // ==================== Listener Management ====================

  /**
   * Đăng ký listener cho notification mới
   */
  onNewNotification(listener: NotificationListener): () => void {
    this.listeners.newNotification.push(listener);
    return () => this.removeNewNotificationListener(listener);
  }

  /**
   * Xóa listener notification mới
   */
  private removeNewNotificationListener(listener: NotificationListener): void {
    this.listeners.newNotification = this.listeners.newNotification.filter(
      (l) => l !== listener
    );
  }

  /**
   * Đăng ký listener cho unread count
   */
  onUnreadCount(listener: UnreadCountListener): () => void {
    this.listeners.unreadCount.push(listener);
    return () => this.removeUnreadCountListener(listener);
  }

  /**
   * Xóa listener unread count
   */
  private removeUnreadCountListener(listener: UnreadCountListener): void {
    this.listeners.unreadCount = this.listeners.unreadCount.filter(
      (l) => l !== listener
    );
  }

  /**
   * Đăng ký listener cho notifications read
   */
  onNotificationsRead(listener: NotificationsReadListener): () => void {
    this.listeners.notificationsRead.push(listener);
    return () => this.removeNotificationsReadListener(listener);
  }

  /**
   * Xóa listener notifications read
   */
  private removeNotificationsReadListener(
    listener: NotificationsReadListener
  ): void {
    this.listeners.notificationsRead = this.listeners.notificationsRead.filter(
      (l) => l !== listener
    );
  }

  /**
   * Đăng ký listener cho connection status
   */
  onConnectionChange(listener: ConnectionListener): () => void {
    this.listeners.connection.push(listener);
    // Gửi trạng thái hiện tại ngay lập tức
    listener(this.isConnected());
    return () => this.removeConnectionListener(listener);
  }

  /**
   * Xóa listener connection
   */
  private removeConnectionListener(listener: ConnectionListener): void {
    this.listeners.connection = this.listeners.connection.filter(
      (l) => l !== listener
    );
  }

  // ==================== Notify Listeners ====================

  private notifyNewNotificationListeners(notification: Notification): void {
    this.listeners.newNotification.forEach((listener) => {
      try {
        listener(notification);
      } catch (error) {
        console.error("Error in notification listener:", error);
      }
    });
  }

  private notifyUnreadCountListeners(data: UnreadCountData): void {
    this.listeners.unreadCount.forEach((listener) => {
      try {
        listener(data);
      } catch (error) {
        console.error("Error in unread count listener:", error);
      }
    });
  }

  private notifyNotificationsReadListeners(data: NotificationsReadData): void {
    this.listeners.notificationsRead.forEach((listener) => {
      try {
        listener(data);
      } catch (error) {
        console.error("Error in notifications read listener:", error);
      }
    });
  }

  private notifyConnectionListeners(isConnected: boolean): void {
    this.listeners.connection.forEach((listener) => {
      try {
        listener(isConnected);
      } catch (error) {
        console.error("Error in connection listener:", error);
      }
    });
  }
}

// Export singleton instance
export const notificationWebSocketService = new NotificationWebSocketService();
