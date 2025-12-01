import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { SubscriptionPaymentResponse } from "@/services/customerSubscriptionService";
import paymentService from "@/services/paymentService";

const POLLING_INTERVAL_MS = 5000;

type Props = {
  visible: boolean;
  onClose: (didPay: boolean) => void;
  paymentData: SubscriptionPaymentResponse | null;
};

export default function SubscriptionPaymentModal({
  visible,
  onClose,
  paymentData,
}: Props) {
  const [status, setStatus] = useState<
    "PENDING" | "CHECKING" | "COMPLETED" | "FAILED"
  >("PENDING");

  const pollingInterval = useRef<number | null>(null);

  const paymentInfo = paymentData?.paymentInfo;
  const bankingInfo = paymentInfo?.bankingInfo;

  // Logic Polling
  useEffect(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }

    if (visible && paymentInfo?.paymentCode) {
      setStatus("PENDING");

      const checkStatus = async () => {
        if (status === "CHECKING") return;

        try {
          const result = await paymentService.checkPaymentStatus(
            paymentInfo.paymentCode
          );
          const apiStatus = result.status.toUpperCase();

          if (apiStatus === "COMPLETED") {
            setStatus("COMPLETED");
            if (pollingInterval.current) clearInterval(pollingInterval.current);
            // (Đợi 2 giây để user thấy "Success!" rồi mới đóng)
            setTimeout(() => onClose(true), 2000);
          } else if (apiStatus === "EXPIRED" || apiStatus === "FAILED") {
            setStatus("FAILED");
            if (pollingInterval.current) clearInterval(pollingInterval.current);
          }
          // (Nếu 'PENDING', không làm gì, chờ vòng lặp sau)
        } catch (error) {
          console.error("Polling error:", error);
        }
      };

      // (Bắt đầu polling)
      pollingInterval.current = setInterval(checkStatus, POLLING_INTERVAL_MS);
    }

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [visible, paymentInfo?.paymentCode]);

  const renderStatusContent = () => {
    if (status === "COMPLETED") {
      return (
        <View style={styles.statusBox}>
          <MaterialCommunityIcons
            name="check-decagram"
            size={60}
            color="#28a745"
          />
          <Text style={styles.statusTitle}>Payment Successful!</Text>
          <Text style={styles.statusMessage}>
            Your subscription is now active.
          </Text>
        </View>
      );
    }
    if (status === "FAILED") {
      return (
        <View style={styles.statusBox}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={60}
            color="#d9534f"
          />
          <Text style={styles.statusTitle}>Payment Failed or Expired</Text>
          <Text style={styles.statusMessage}>
            Please close this and try again.
          </Text>
          <Pressable style={styles.closeButton} onPress={() => onClose(false)}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      );
    }
    // (Render 'CHECKING' or 'PENDING')
    return (
      <View style={styles.statusBox}>
        {status === "CHECKING" ? (
          <ActivityIndicator size="large" />
        ) : (
          <Ionicons name="time-outline" size={40} color="#666" />
        )}
        <Text style={styles.statusTitle}>
          {status === "CHECKING"
            ? "Verifying Payment..."
            : "Waiting for Payment"}
        </Text>
        <Text style={styles.statusMessage}>
          We are checking your transaction...
        </Text>
      </View>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => onClose(false)}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Pressable style={styles.closeIcon} onPress={() => onClose(false)}>
            <Ionicons name="close-circle" size={30} color="#ccc" />
          </Pressable>

          <ScrollView>
            <Text style={styles.modalTitle}>Complete Your Purchase</Text>

            {bankingInfo && (status === "PENDING" || status === "CHECKING") && (
              <>
                <Image
                  style={styles.qrCode}
                  source={{ uri: bankingInfo.qrCodeUrl }}
                  resizeMode="contain"
                />
                <View style={styles.infoCard}>
                  <View style={styles.row}>
                    <Text style={styles.label}>Amount:</Text>
                    <Text style={styles.valueAmount}>
                      {Number(bankingInfo.amount || 0).toLocaleString("vi-VN")}{" "}
                      VND
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Bank:</Text>
                    <Text style={styles.value}>{bankingInfo.bankName}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Account:</Text>
                    <Text style={styles.value}>
                      {bankingInfo.accountNumber}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <Text style={styles.contentLabel}>REQUIRED Content:</Text>
                  <View style={styles.contentBox}>
                    <Text style={styles.valueCode}>
                      {paymentInfo?.paymentCode}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {renderStatusContent()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    width: "100%",
    maxHeight: "90%",
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeIcon: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  qrCode: {
    width: 250,
    height: 250,
    backgroundColor: "#e0e0e0",
    borderRadius: 8,
    alignSelf: "center",
  },
  infoCard: {
    backgroundColor: "#f5f5ff",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginTop: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  label: { fontSize: 15, color: "#666" },
  value: { fontSize: 15, fontWeight: "600" },
  valueAmount: { fontSize: 16, fontWeight: "bold", color: "#007bff" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 8 },
  contentLabel: { fontSize: 15, color: "#666", marginTop: 8 },
  contentBox: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
    alignItems: "center",
  },
  valueCode: { fontSize: 18, fontWeight: "bold", color: "#d9534f" },

  statusBox: {
    alignItems: "center",
    paddingVertical: 30,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 4,
  },
  statusMessage: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
  },
  closeButton: {
    backgroundColor: "#007bff",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
    marginTop: 20,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
