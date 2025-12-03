// File: app/(stacks)/PaymentSuccessScreen.tsx

import {
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Image,
} from "react-native";
import React, { useState, useEffect, useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Services & Types
import appointmentService from "@/services/appointmentService";
import orderService from "@/services/orderService";
import tokenService from "@/services/tokenService";
import paymentService from "@/services/paymentService"; // Added for payment status
import { AppointmentWithRelations } from "@/types/appointment.type";
import { Order } from "@/services/orderService";
import { PaymentStatusResponse } from "@/services/paymentService"; // Added
import { useThemeColor, hexToRgba } from "@/hooks/useThemeColor";
import { PaymentType } from "@/types/payment.type";

type DisplayPaymentType = PaymentType | "other";

// --- Helpers ---
// (Helpers remain unchanged)
const formatTime = (isoDate: string) => {
  if (!isoDate) return "N/A";
  return new Date(isoDate).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};
const formatDate = (isoDate: string) => {
  if (!isoDate) return "N/A";
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};
// (Helper for appointment type - kept for bookings)
const formatAppointmentType = (type: string) => {
  if (type === "NEW_PROBLEM") return "New Problem";
  if (type === "FOLLOW_UP") return "Follow-up";
  return "Appointment";
};

const formatCurrency = (amount?: number | null) => {
  if (amount === undefined || amount === null || Number.isNaN(amount)) {
    return "--";
  }
  return `${amount.toLocaleString("vi-VN")} VND`;
};

const normalizeNumberParam = (value?: string) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
// --- End Helpers ---

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { primaryColor, isDarkMode } = useThemeColor();
  const tintedPrimary = useMemo(
    () => hexToRgba(primaryColor, 0.1),
    [primaryColor]
  );
  const subtleBorder = useMemo(
    () => hexToRgba(primaryColor, 0.15),
    [primaryColor]
  );
  const secondaryTextColor = isDarkMode ? "#d0d0d0" : "#666666";

  // Updated params: Include paymentCode and subscription metadata
  const {
    appointmentId,
    orderId,
    paymentCode,
    paymentType: paymentTypeParam,
    planId: planIdParam,
    planName: planNameParam,
    amount: amountParam,
    durationInDays: durationInDaysParam,
    totalSessions: totalSessionsParam,
  } = useLocalSearchParams<{
    appointmentId?: string;
    orderId?: string;
    paymentCode?: string;
    paymentType?: string;
    planId?: string;
    planName?: string;
    amount?: string;
    durationInDays?: string;
    totalSessions?: string;
  }>();

  const [appointment, setAppointment] =
    useState<AppointmentWithRelations | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentStatusResponse | null>(
    null
  ); // Added
  const [isLoading, setIsLoading] = useState(true);
  const inferredPaymentType = useMemo<DisplayPaymentType>(() => {
    if (
      paymentTypeParam &&
      Object.values(PaymentType).includes(paymentTypeParam as PaymentType)
    ) {
      return paymentTypeParam as PaymentType;
    }
    if (appointmentId) return PaymentType.BOOKING;
    if (orderId) return PaymentType.ORDER;
    return "other";
  }, [paymentTypeParam, appointmentId, orderId]);
  const [paymentType, setPaymentType] =
    useState<DisplayPaymentType>(inferredPaymentType);
  const [subscriptionInfo, setSubscriptionInfo] = useState({
    planId: planIdParam ?? null,
    planName: planNameParam ?? "",
    amount: normalizeNumberParam(amountParam),
    durationInDays: normalizeNumberParam(durationInDaysParam),
    totalSessions: normalizeNumberParam(totalSessionsParam),
  });

  useEffect(() => {
    setPaymentType(inferredPaymentType);
  }, [inferredPaymentType]);

  useEffect(() => {
    setSubscriptionInfo({
      planId: planIdParam ?? null,
      planName: planNameParam ?? "",
      amount: normalizeNumberParam(amountParam),
      durationInDays: normalizeNumberParam(durationInDaysParam),
      totalSessions: normalizeNumberParam(totalSessionsParam),
    });
  }, [
    planIdParam,
    planNameParam,
    amountParam,
    durationInDaysParam,
    totalSessionsParam,
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        if (!paymentCode) {
          throw new Error("Payment code is missing.");
        }

        // Fetch payment status to get paymentType and other details
        const paymentStatus = await paymentService.checkPaymentStatus(
          paymentCode
        );
        setPaymentData(paymentStatus);

        // Determine payment type and fetch relevant data
        if (paymentStatus.paymentType === "booking") {
          setPaymentType(PaymentType.BOOKING);
          if (appointmentId) {
            const data = await appointmentService.getAppointmentById(
              appointmentId
            );
            setAppointment(data);
          }
        } else if (paymentStatus.paymentType === "order") {
          setPaymentType(PaymentType.ORDER);
          const orderIdToUse = paymentStatus.order?.orderId || orderId;
          if (orderIdToUse) {
            const token = await tokenService.getToken();
            if (!token) {
              throw new Error(
                "Authentication token not found. Please log in again."
              );
            }
            const data = await orderService.getOrderById(orderIdToUse, token);
            setOrder(data);
          }
        } else if (paymentStatus.paymentType === "subscription") {
          setPaymentType(PaymentType.SUBSCRIPTION);
          setSubscriptionInfo((prev) => ({
            ...prev,
            amount: prev.amount ?? paymentStatus.amount,
          }));
        } else {
          setPaymentType("other"); // For 'topup', 'subscription', etc.
        }
      } catch (error) {
        console.error("Failed to load details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (paymentCode) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [appointmentId, orderId, paymentCode]);

  // Navigation handler (customized per payment type)
  const goToNext = () => {
    if (paymentType === PaymentType.BOOKING) {
      router.replace({ pathname: "/(tabs)/ScheduleScreen" });
      return;
    }

    if (paymentType === PaymentType.ORDER) {
      router.replace({ pathname: "/(tabs)/HomeScreen" });
      return;
    }

    router.replace({ pathname: "/(tabs)/HomeScreen" });
  };

  // Updated renderContent with themed styling and subscription support
  const renderContent = () => {
    if (isLoading) {
      return (
        <ActivityIndicator
          size="large"
          color={primaryColor}
          style={{ marginTop: 20 }}
        />
      );
    }

    const labelStyle = [styles.label, { color: secondaryTextColor }];
    const sectionTitleStyle = [
      styles.sectionTitle,
      { color: secondaryTextColor },
    ];
    const infoCardBaseStyle = [
      styles.infoCard,
      {
        backgroundColor: isDarkMode ? "#1b1b24" : "#ffffff",
        borderColor: subtleBorder,
      },
    ];
    const infoCardAccentStyle = [
      styles.infoCard,
      {
        backgroundColor: tintedPrimary,
        borderColor: subtleBorder,
      },
    ];
    const dividerStyle = [styles.divider, { backgroundColor: subtleBorder }];
    const valueStyle = [
      styles.value,
      { color: isDarkMode ? "#f5f5f5" : "#1a1a1a" },
    ];
    const emailValueStyle = [
      styles.emailValue,
      { color: isDarkMode ? "#f5f5f5" : "#1a1a1a" },
    ];
    const valueAmountStyle = [styles.valueAmount, { color: primaryColor }];
    const cardTitleStyle = [styles.cardTitle, { color: primaryColor }];
    const errorTextStyle = [
      styles.errorText,
      { color: isDarkMode ? "#ff8080" : "#d9534f" },
    ];

    if (paymentType === PaymentType.BOOKING && !appointment) {
      return (
        <Text style={errorTextStyle}>
          Your booking payment was successful, but we couldn't load the details.
          Please check "My Schedule".
        </Text>
      );
    }

    if (paymentType === PaymentType.ORDER && !order) {
      return (
        <Text style={errorTextStyle}>
          Your purchase payment was successful, but we couldn't load the
          details. Please check your orders.
        </Text>
      );
    }

    if (paymentType === PaymentType.SUBSCRIPTION) {
      const amountDisplay = formatCurrency(
        subscriptionInfo.amount ?? paymentData?.amount
      );
      const methodLabel = paymentCode
        ? paymentData?.paymentMethod?.toUpperCase() || "N/A"
        : "Wallet Balance";

      return (
        <View style={infoCardAccentStyle}>
          <Text style={cardTitleStyle}>Subscription Details</Text>

          <Text style={sectionTitleStyle}>Summary</Text>

          <View style={styles.row}>
            <Text style={labelStyle}>Plan Name:</Text>
            <Text style={[valueStyle, styles.valuePlain]}>
              {subscriptionInfo.planName || "Subscription Plan"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={labelStyle}>Duration:</Text>
            <Text style={[valueStyle, styles.valuePlain]}>
              {subscriptionInfo.durationInDays !== undefined
                ? `${subscriptionInfo.durationInDays} days`
                : "--"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={labelStyle}>Total Sessions:</Text>
            <Text style={[valueStyle, styles.valuePlain]}>
              {subscriptionInfo.totalSessions !== undefined
                ? subscriptionInfo.totalSessions
                : "--"}
            </Text>
          </View>

          <View style={dividerStyle} />

          <Text style={sectionTitleStyle}>Payment</Text>
          <View style={styles.row}>
            <Text style={labelStyle}>Amount Paid:</Text>
            <Text style={valueAmountStyle}>{amountDisplay}</Text>
          </View>
          <View style={styles.row}>
            <Text style={labelStyle}>Method:</Text>
            <Text style={[valueStyle, styles.valuePlain]}>{methodLabel}</Text>
          </View>
          {paymentCode ? (
            <View style={styles.row}>
              <Text style={labelStyle}>Reference:</Text>
              <Text style={[valueStyle, styles.valuePlain]}>{paymentCode}</Text>
            </View>
          ) : null}
        </View>
      );
    }

    if (paymentType === "other") {
      return (
        <View style={infoCardAccentStyle}>
          <Text style={cardTitleStyle}>Payment Successful</Text>
          <Text style={sectionTitleStyle}>Details</Text>
          <View style={styles.row}>
            <Text style={labelStyle}>Amount Paid:</Text>
            <Text style={valueAmountStyle}>
              {formatCurrency(paymentData?.amount)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={labelStyle}>Method:</Text>
            <Text style={[valueStyle, styles.valuePlain]}>
              {paymentData?.paymentMethod?.toUpperCase() || "N/A"}
            </Text>
          </View>
          {paymentCode ? (
            <View style={styles.row}>
              <Text style={labelStyle}>Reference:</Text>
              <Text style={[valueStyle, styles.valuePlain]}>{paymentCode}</Text>
            </View>
          ) : null}
        </View>
      );
    }

    if (paymentType === PaymentType.BOOKING && appointment) {
      const doctorPhotoUri =
        appointment.dermatologist?.user?.photoUrl?.startsWith("data:")
          ? appointment.dermatologist.user.photoUrl
          : null;

      return (
        <View style={infoCardBaseStyle}>
          <Text style={cardTitleStyle}>Appointment Details</Text>

          <Text style={sectionTitleStyle}>Consultant</Text>
          <View style={styles.doctorHeader}>
            <Image
              style={styles.doctorAvatar}
              source={
                doctorPhotoUri
                  ? { uri: doctorPhotoUri }
                  : require("@/assets/images/icon.png")
              }
            />
            <View style={styles.doctorInfo}>
              <Text
                style={[
                  styles.doctorName,
                  { color: isDarkMode ? "#f5f5f5" : "#1a1a1a" },
                ]}
              >
                {appointment.dermatologist?.user?.fullName || "Dermatologist"}
              </Text>
            </View>
          </View>

          <View style={dividerStyle} />

          <Text style={sectionTitleStyle}>Patient</Text>
          <View style={styles.row}>
            <Text style={labelStyle}>Name:</Text>
            <Text style={valueStyle}>
              {appointment.customer?.user?.fullName || "Patient"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={labelStyle}>Email:</Text>
            <Text style={emailValueStyle}>
              {appointment.customer?.user?.email}
            </Text>
          </View>

          <View style={dividerStyle} />

          <Text style={sectionTitleStyle}>When</Text>
          <View style={styles.row}>
            <Text style={labelStyle}>Date:</Text>
            <Text style={valueStyle}>{formatDate(appointment.startTime)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={labelStyle}>Time:</Text>
            <Text style={valueStyle}>
              {`${formatTime(appointment.startTime)} - ${formatTime(
                appointment.endTime
              )}`}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={labelStyle}>Type:</Text>
            <Text style={valueStyle}>
              {formatAppointmentType(appointment.appointmentType)}
            </Text>
          </View>

          <View style={dividerStyle} />

          <Text style={sectionTitleStyle}>Payment</Text>
          <View style={styles.row}>
            <Text style={labelStyle}>Amount Paid:</Text>
            <Text style={valueAmountStyle}>
              {formatCurrency(
                Number(appointment.payment?.amount || appointment.price)
              )}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={labelStyle}>Method:</Text>
            <Text style={[valueStyle, styles.valuePlain]}>
              {appointment.payment?.paymentMethod?.toUpperCase() ||
                "Subscription"}
            </Text>
          </View>
        </View>
      );
    }

    if (paymentType === PaymentType.ORDER && order) {
      return (
        <View style={infoCardBaseStyle}>
          <Text style={cardTitleStyle}>Purchase Details</Text>

          <Text style={sectionTitleStyle}>Order Information</Text>
          <View style={styles.row}>
            <Text style={labelStyle}>Order ID:</Text>
            <Text style={[valueStyle, styles.valuePlain]}>{order.orderId}</Text>
          </View>
          <View style={styles.row}>
            <Text style={labelStyle}>Status:</Text>
            <Text style={[valueStyle, styles.valuePlain]}>{order.status}</Text>
          </View>

          <View style={dividerStyle} />

          <Text style={sectionTitleStyle}>Items Purchased</Text>
          {order.orderItems?.map((item, index) => (
            <View key={index} style={styles.row}>
              <Text style={labelStyle}>
                {item.product.productName} (x{item.quantity}):
              </Text>
              <Text style={[valueStyle, styles.valuePlain]}>
                {formatCurrency(parseFloat(item.priceAtTime) * item.quantity)}
              </Text>
            </View>
          ))}

          <View style={dividerStyle} />

          <Text style={sectionTitleStyle}>Payment</Text>
          <View style={styles.row}>
            <Text style={labelStyle}>Total Paid:</Text>
            <Text style={valueAmountStyle}>
              {formatCurrency(
                orderService.calculateOrderTotal(order.orderItems)
              )}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={labelStyle}>Method:</Text>
            <Text style={[valueStyle, styles.valuePlain]}>
              {order.payment?.paymentMethod?.toUpperCase() || "Bank Transfer"}
            </Text>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? "#0b0d14" : "#f6f7ff" },
      ]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="check-decagram"
            size={100}
            color="#28a745"
          />
        </View>

        {/* Dynamic Title and Instructions */}
        <Text style={[styles.title, { color: "#28a745" }]}>
          {paymentType === PaymentType.BOOKING
            ? "Booking Confirmed!"
            : paymentType === PaymentType.ORDER
            ? "Purchase Successful!"
            : paymentType === PaymentType.SUBSCRIPTION
            ? "Subscription Activated!"
            : "Payment Successful!"}
        </Text>
        <Text style={[styles.instructions, { color: secondaryTextColor }]}>
          {paymentType === PaymentType.BOOKING
            ? "Your appointment has been successfully booked."
            : paymentType === PaymentType.ORDER
            ? "Your purchase has been completed successfully."
            : paymentType === PaymentType.SUBSCRIPTION
            ? "Your subscription plan is active. Enjoy your benefits!"
            : "Your payment has been processed successfully."}
        </Text>

        {/* Dynamic Content */}
        {renderContent()}
      </ScrollView>

      {/* Footer Button */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: isDarkMode ? "#0f1019" : "#ffffff",
            borderColor: subtleBorder,
          },
        ]}
      >
        <Pressable
          style={[styles.scheduleButton, { backgroundColor: primaryColor }]}
          onPress={goToNext}
        >
          <Text style={styles.scheduleButtonText}>
            {paymentType === PaymentType.BOOKING
              ? "Go to My Schedule"
              : paymentType === PaymentType.ORDER
              ? "Continue Shopping"
              : "Back to Home"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// --- STYLES --- (Unchanged, but ensure they fit both contexts)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    paddingBottom: 140,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#28a745",
  },
  instructions: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 24,
  },
  infoCard: {
    backgroundColor: "#f5f5ff",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  subscriptionPlanName: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8,
  },
  doctorHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  doctorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#e0e0e0",
  },
  doctorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
    paddingHorizontal: 8,
    alignItems: "flex-start",
  },
  label: {
    fontSize: 15,
    color: "#666",
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    textTransform: "capitalize",
    flex: 1,
    textAlign: "right",
  },
  valuePlain: {
    textTransform: "none",
  },
  emailValue: {
    fontSize: 15,
    fontWeight: "600",
    textTransform: "none",
    flex: 1,
    textAlign: "right",
  },
  valueAmount: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#007bff",
  },
  errorText: {
    fontSize: 15,
    color: "#d9534f",
    textAlign: "center",
    padding: 10,
  },
  footer: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e0e0e0",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  scheduleButton: {
    backgroundColor: "#007bff",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  scheduleButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
