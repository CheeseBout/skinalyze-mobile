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
import CustomAlert from "@/components/CustomAlert";
import appointmentService from "@/services/appointmentService";

const POLLING_INTERVAL_MS = 5000;

interface BankingInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  qrCodeUrl: string;
}

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
      console.error("Failed to parse bankingInfo:", e);
      return {} as BankingInfo;
    }
  }, [params.bankingInfo]);

  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [leaveAction, setLeaveAction] = useState<any>(null);

  // --- Countdown Timer ---
  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!params.expiredAt) return null;
      const expiration = new Date(params.expiredAt);
      const now = new Date();
      const diff = expiration.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Expired");
        return null;
      }
      const minutes = Math.floor(diff / 1000 / 60);
      const seconds = Math.floor((diff / 1000) % 60);
      return `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    };
    setTimeLeft(calculateTimeLeft());
    const countdownTimer = setInterval(() => {
      const newTime = calculateTimeLeft();
      if (newTime === null) {
        clearInterval(countdownTimer);
      }
      setTimeLeft(newTime);
    }, 1000);
    return () => clearInterval(countdownTimer);
  }, [params.expiredAt]);

  // --- Polling ---
  useEffect(() => {
    const stopPolling = () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      setIsChecking(false);
    };

    const checkStatus = async () => {
      const expiration = new Date(params.expiredAt);
      if (new Date() > expiration) {
        if (timeLeft !== "Expired") {
          setTimeLeft("Expired");
          Alert.alert("Payment Expired", "The payment time has expired.");
        }
        stopPolling();
        return;
      }

      if (isChecking || !params.paymentCode) return;

      try {
        setIsChecking(true);
        const result: PaymentStatusResponse =
          await paymentService.checkPaymentStatus(params.paymentCode);

        const status = result.status.toUpperCase();

        if (status === "COMPLETED") {
          stopPolling();
          router.replace({
            pathname: "/(stacks)/PaymentSuccessScreen",
            params: { appointmentId: params.appointmentId },
          });
        } else if (status === "EXPIRED" || status === "FAILED") {
          stopPolling();
          setTimeLeft("Expired");
          Alert.alert(
            "Payment Failed",
            `The payment was ${result.status.toLowerCase()}.`
          );
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
  }, [params.paymentCode, params.expiredAt, router]);

  // --- Back Button Warning Logic ---
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (isChecking || timeLeft === "Expired" || !pollingInterval.current) {
        return;
      }

      // (Avoid default behavior of leaving the screen)
      e.preventDefault();

      setLeaveAction(e.data.action);
      setIsAlertVisible(true);
    });

    return unsubscribe;
  }, [navigation, isChecking, timeLeft]);

  const handleAlertCancel = () => {
    setIsAlertVisible(false);
    setLeaveAction(null);
  };

  const handleAlertConfirm = async () => {
    if (isCancelling) return; // (Avoid double clicks)

    setIsCancelling(true);

    // 1. Stop polling
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }

    try {
      // 2. Call Cancel API (release slot)
      await appointmentService.cancelPendingReservation(params.appointmentId);
    } catch (error) {
      console.error("Failed to cancel reservation:", error);
      // (No need to alert user, just let them leave)
    }

    // 3. Close popup and allow leaving
    setIsCancelling(false);
    setIsAlertVisible(false);
    if (leaveAction) {
      navigation.dispatch(leaveAction);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied!", `${label} has been copied to your clipboard.`);
  };
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {timeLeft === "Expired" ? (
          <View style={styles.expiredContainer}>
            <Text style={styles.title}>Payment Expired</Text>
            <Text style={styles.instructions}>
              This payment session has expired. Please go back and try to book
              again.
            </Text>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()} // (Go back to Confirmation)
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </Pressable>
          </View>
        ) : (
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

              {/* --- Update Copy Button UI (Disabled) --- */}
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

              {/* --- Update Copy Button UI (Disabled) --- */}
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
        message="If you leave now, this reservation will be cancelled to free up the slot for others."
        confirmText="Leave & Cancel"
        cancelText="Stay"
        onConfirm={handleAlertConfirm}
        onCancel={handleAlertCancel}
      />
      {isCancelling && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Cancelling...</Text>
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
  },
  instructions: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  qrCode: {
    width: 250,
    height: 250,
    backgroundColor: "#e0e0e0",
    borderRadius: 8,
  },
  timerBox: {
    marginTop: 20,
    alignItems: "center",
  },
  timerText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#d9534f",
  },
  timerLabel: {
    fontSize: 14,
    color: "#d9534f",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginTop: 20,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 6,
  },
  label: {
    fontSize: 15,
    color: "#666",
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
  },
  valueAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007bff",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 8,
  },
  contentLabel: {
    fontSize: 15,
    color: "#666",
    marginTop: 8,
  },
  contentBox: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  valueCode: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#d9534f",
  },
  note: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    marginTop: 8,
  },
  statusContainer: {
    flexDirection: "row",
    marginTop: 20,
    marginBottom: 40,
    alignItems: "center",
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#555",
  },
  expiredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
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
  copyableValueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  copyButton: {
    marginLeft: 8,
    padding: 4,
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 16,
  },
});
