import {
  Text,
  View,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Pressable,
} from "react-native";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import paymentService, {
  PaymentStatusResponse,
} from "@/services/paymentService";
import appointmentService from "@/services/appointmentService";
import CustomAlert from "@/components/CustomAlert";

const POLLING_INTERVAL_MS = 5000;

interface BankingInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  qrCodeUrl: string;
}

type ScreenStatus =
  | "WAITING"
  | "SUCCESS"
  | "EXPIRED"
  | "FAILED"
  | "PARTIAL_REFUND";

export default function PaymentScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  const params = useLocalSearchParams<{
    appointmentId: string;
    paymentCode: string;
    expiredAt: string;
    bankingInfo: string;
  }>();

  const bankingInfo: BankingInfo = useMemo(() => {
    try {
      return JSON.parse(params.bankingInfo || "{}");
    } catch (e) {
      return {} as BankingInfo;
    }
  }, [params.bankingInfo]);

  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const [screenStatus, setScreenStatus] = useState<ScreenStatus>("WAITING");

  const [paidAmount, setPaidAmount] = useState<number>(0);

  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [leaveAction, setLeaveAction] = useState<any>(null);

  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // --- 1. Logic for Countdown Timer ---
  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!params.expiredAt) return null;
      const expiration = new Date(params.expiredAt);
      const now = new Date();
      const diff = expiration.getTime() - now.getTime();

      if (diff <= 0) {
        // Only transition to EXPIRED if currently WAITING
        if (screenStatus === "WAITING") {
          setScreenStatus("EXPIRED");
        }
        return null;
      }
      const minutes = Math.floor(diff / 1000 / 60);
      const seconds = Math.floor((diff / 1000) % 60);
      return `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    };

    const initialTime = calculateTimeLeft();
    if (initialTime) setTimeLeft(initialTime);

    const countdownTimer = setInterval(() => {
      const newTime = calculateTimeLeft();
      if (newTime === null) {
        clearInterval(countdownTimer);
      } else {
        setTimeLeft(newTime);
      }
    }, 1000);
    return () => clearInterval(countdownTimer);
  }, [params.expiredAt, screenStatus]);

  // --- 2. Logic Polling  ---
  useEffect(() => {
    const stopPolling = () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      setIsChecking(false);
    };

    const checkStatus = async () => {
      // If the screen has transitioned to a state other than WAITING, stop
      if (screenStatus !== "WAITING") {
        stopPolling();
        return;
      }

      const expiration = new Date(params.expiredAt);
      if (new Date() > expiration) {
        setScreenStatus("EXPIRED");
        stopPolling();
        return;
      }

      if (isChecking || !params.paymentCode) return;

      try {
        setIsChecking(true);
        const result: PaymentStatusResponse =
          await paymentService.checkPaymentStatus(params.paymentCode);

        const status = result.status.toUpperCase();

        // === CASE 1: SUCCESS ===
        if (status === "COMPLETED") {
          stopPolling();
          setScreenStatus("SUCCESS");
          router.replace({
            pathname: "/(stacks)/PaymentSuccessScreen",
            params: { appointmentId: params.appointmentId },
          });
        }
        // === CASE 2: FAILED OR EXPIRED ===
        else if (status === "FAILED" || status === "EXPIRED") {
          stopPolling();

          // Check partial refund condition
          const actualPaid = Number(result.paidAmount || 0);

          if (status === "FAILED" && actualPaid > 0) {
            // ==> HIỂN THỊ MÀN HÌNH CAM (PARTIAL REFUND)
            setPaidAmount(actualPaid);
            setScreenStatus("PARTIAL_REFUND");
          } else {
            setScreenStatus(status === "EXPIRED" ? "EXPIRED" : "FAILED");
            Alert.alert(
              "Payment Failed",
              `The payment was ${result.status.toLowerCase()}.`
            );
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkStatus();
    pollingInterval.current = setInterval(checkStatus, POLLING_INTERVAL_MS);
    return () => stopPolling();
  }, [params.paymentCode, params.expiredAt, router, screenStatus]);

  // --- 3. Logic to Block Back Button ---
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      // Allow exit if not waiting (done/error/expired)
      if (screenStatus !== "WAITING" || !pollingInterval.current) {
        return;
      }

      e.preventDefault();
      setLeaveAction(e.data.action);
      setIsAlertVisible(true);
    });
    return unsubscribe;
  }, [navigation, screenStatus]);

  const handleAlertCancel = () => {
    setIsAlertVisible(false);
    setLeaveAction(null);
  };

  const handleAlertConfirm = async () => {
    if (isCancelling) return;
    setIsCancelling(true);

    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }

    try {
      await appointmentService.cancelMyAppointment(params.appointmentId);
    } catch (error) {
      console.error("Failed to cancel reservation:", error);
    }

    setIsCancelling(false);
    setIsAlertVisible(false);

    if (leaveAction) {
      navigation.dispatch(leaveAction);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert("Copied!", `${label} has been copied to your clipboard.`);
    } catch (error) {
      Alert.alert("Copy Error", "Clipboard is not available.");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {screenStatus === "PARTIAL_REFUND" && (
          <View style={styles.centerContainer}>
            <View style={styles.warningCard}>
              <View style={styles.warningIconContainer}>
                <MaterialCommunityIcons
                  name="alert"
                  size={48}
                  color="#F57C00"
                />
              </View>

              <Text style={styles.warningTitle}>Insufficient Payment</Text>

              <Text style={styles.warningText}>
                The order required{" "}
                <Text style={styles.boldText}>
                  {Number(bankingInfo.amount).toLocaleString("vi-VN")} VND
                </Text>{" "}
                but we received{" "}
                <Text style={styles.boldText}>
                  {paidAmount.toLocaleString("vi-VN")} VND
                </Text>
                .{"\n\n"}
                Don't worry!{" "}
                <Text style={styles.boldText}>
                  {paidAmount.toLocaleString("vi-VN")} VND
                </Text>{" "}
                has been refunded to your Wallet.
              </Text>

              <Pressable
                style={[styles.button, styles.primaryButton]}
                onPress={() => router.back()}
              >
                <Text style={styles.buttonTextPrimary}>Book Again</Text>
              </Pressable>

              {/* Nút outline */}
              <Pressable
                style={[styles.button, styles.secondaryButton]}
                onPress={() => router.push("/(stacks)/ProfileScreen")}
              >
                <Text style={styles.buttonTextSecondary}>
                  Check Wallet Balance
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* === UI: EXPIRED / FAILED  === */}
        {(screenStatus === "EXPIRED" || screenStatus === "FAILED") && (
          <View style={styles.centerContainer}>
            <MaterialCommunityIcons
              name="timer-off"
              size={80}
              color="#757575"
            />
            <Text style={styles.title}>Payment Expired</Text>
            <Text style={styles.instructions}>
              This payment session has expired. Please go back and try to book
              again.
            </Text>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </Pressable>
          </View>
        )}

        {/* === UI: WAITING ( QR Code) === */}
        {screenStatus === "WAITING" && (
          <>
            <Text style={styles.title}>Waiting for Payment</Text>
            <Text style={styles.instructions}>
              Scan the QR code to complete the payment
            </Text>

            <Image
              style={styles.qrCode}
              source={{ uri: bankingInfo.qrCodeUrl }}
              resizeMode="contain"
            />

            <View style={styles.timerBox}>
              <Text style={styles.timerText}>{timeLeft || "..."}</Text>
              <Text style={styles.timerLabel}>Time Left</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Bank Transfer Details</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Amount:</Text>
                <Text style={styles.valueAmount}>
                  {Number(bankingInfo.amount || 0).toLocaleString("vi-VN")} VND
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.label}>Bank:</Text>
                <Text style={styles.value}>{bankingInfo.bankName}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Account Name:</Text>
                <Text style={styles.value}>{bankingInfo.accountName}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Account Number:</Text>
                <View style={styles.copyableValueContainer}>
                  <Text style={styles.value} selectable>
                    {bankingInfo.accountNumber}
                  </Text>
                  <Pressable
                    onPress={() =>
                      copyToClipboard(
                        bankingInfo.accountNumber,
                        "Account Number"
                      )
                    }
                    style={styles.copyButton}
                  >
                    <MaterialCommunityIcons
                      name="content-copy"
                      size={20}
                      color="#666"
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.contentLabel}>
                REQUIRED Transfer Content:
              </Text>
              <View style={styles.contentBox}>
                <Text style={styles.valueCode} selectable>
                  {params.paymentCode}
                </Text>
                <Pressable
                  onPress={() =>
                    copyToClipboard(params.paymentCode, "Transfer Content")
                  }
                >
                  <MaterialCommunityIcons
                    name="content-copy"
                    size={24}
                    color="#d9534f"
                  />
                </Pressable>
              </View>

              <Text style={styles.note}>
                Please use the exact code above as the transfer content.
              </Text>
            </View>

            <View style={styles.statusContainer}>
              {isChecking && <ActivityIndicator size="small" />}
              <Text style={styles.statusText}>
                {isChecking
                  ? "Checking payment status..."
                  : "Waiting for payment confirmation..."}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <CustomAlert
        visible={isAlertVisible}
        title="Leave Payment Page?"
        message="If you leave now, your reservation will be CANCELLED to free up the slot for others."
        confirmText={isCancelling ? "Cancelling..." : "Leave & Cancel"}
        cancelText="Stay"
        onConfirm={handleAlertConfirm}
        onCancel={handleAlertCancel}
      />

      {isCancelling && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Cancelling Reservation...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5ff",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    padding: 20,
    paddingTop: 40,
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
    textAlign: "center",
  },
  instructions: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  qrCode: {
    width: 240,
    height: 240,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 20,
  },
  timerBox: {
    alignItems: "center",
    marginBottom: 20,
  },
  timerText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#d9534f",
    fontVariant: ["tabular-nums"],
  },
  timerLabel: {
    fontSize: 13,
    color: "#888",
    marginTop: 4,
  },

  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    marginTop: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
    color: "#333",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  label: {
    fontSize: 15,
    color: "#666",
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    maxWidth: "60%",
    textAlign: "right",
  },
  valueAmount: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#007bff",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 12,
  },
  contentLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  contentBox: {
    backgroundColor: "#f8f9fa",
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
  valueCode: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    letterSpacing: 1,
  },
  note: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic",
  },

  statusContainer: {
    flexDirection: "row",
    marginTop: 24,
    marginBottom: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef2ff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#4f46e5",
    fontWeight: "500",
  },

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 20,
  },

  warningCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  warningIconContainer: {
    marginBottom: 16,
    backgroundColor: "#FFF8E1",
    padding: 16,
    borderRadius: 50,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#F57C00",
    marginBottom: 12,
    textAlign: "center",
  },
  warningText: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  boldText: {
    fontWeight: "bold",
    color: "#333",
  },

  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#007bff",
    elevation: 2,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#007bff",
  },
  buttonTextPrimary: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007bff",
  },

  copyableValueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  copyButton: {
    marginLeft: 8,
    padding: 4,
  },
  backButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 20,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loadingText: {
    color: "#333",
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
  },
});
