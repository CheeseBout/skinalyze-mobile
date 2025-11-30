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
import React, { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Services & Types
import appointmentService from "@/services/appointmentService";
import orderService from "@/services/orderService";
import tokenService from "@/services/tokenService";
import paymentService from "@/services/paymentService"; // Added for payment status
import {
  AppointmentWithRelations,
} from "@/types/appointment.type";
import { Order } from "@/services/orderService";
import { PaymentStatusResponse } from "@/services/paymentService"; // Added

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
// --- End Helpers ---

export default function PaymentSuccessScreen() {
  const router = useRouter();

  // Updated params: Include paymentCode
  const { appointmentId, orderId, paymentCode } = useLocalSearchParams<{
    appointmentId?: string;
    orderId?: string;
    paymentCode?: string;
  }>();

  const [appointment, setAppointment] = useState<AppointmentWithRelations | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentStatusResponse | null>(null); // Added
  const [isLoading, setIsLoading] = useState(true);
  const [paymentType, setPaymentType] = useState<"booking" | "purchase" | "other">("booking"); // Updated to include 'other'

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        if (!paymentCode) {
          throw new Error("Payment code is missing.");
        }

        // Fetch payment status to get paymentType and other details
        const paymentStatus = await paymentService.checkPaymentStatus(paymentCode);
        setPaymentData(paymentStatus);

        // Determine payment type and fetch relevant data
        if (paymentStatus.paymentType === 'booking') {
          setPaymentType("booking");
          if (appointmentId) {
            const data = await appointmentService.getAppointmentById(appointmentId);
            setAppointment(data);
          }
        } else if (paymentStatus.paymentType === 'order') {
          setPaymentType("purchase");
          const orderIdToUse = paymentStatus.order?.orderId || orderId;
          if (orderIdToUse) {
            const token = await tokenService.getToken();
            if (!token) {
              throw new Error("Authentication token not found. Please log in again.");
            }
            const data = await orderService.getOrderById(orderIdToUse, token);
            setOrder(data);
          }
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

  // Navigation handler (kept similar, but could customize per type if needed)
  const goToNext = () => {
    if (paymentType === "booking") {
      router.replace({ pathname: "/(tabs)/ScheduleScreen" });
    } else {
      router.replace({ pathname: "/(tabs)/HomeScreen" }); // Or a purchase history screen
    }
  };

  // Updated renderContent to handle 'other' type
  const renderContent = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" style={{ marginTop: 20 }} />;
    }

    if (paymentType === "booking" && !appointment) {
      return (
        <Text style={styles.errorText}>
          Your booking payment was successful, but we couldn't load the details. Please check "My Schedule".
        </Text>
      );
    }

    if (paymentType === "purchase" && !order) {
      return (
        <Text style={styles.errorText}>
          Your purchase payment was successful, but we couldn't load the details. Please check your orders.
        </Text>
      );
    }

    if (paymentType === "other") {
      // Generic success for topup/subscription
      return (
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Payment Successful</Text>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Amount Paid:</Text>
            <Text style={styles.valueAmount}>
              {paymentData?.amount.toLocaleString("vi-VN")} VND
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Method:</Text>
            <Text style={styles.value}>
              {paymentData?.paymentMethod?.toUpperCase() || "N/A"}
            </Text>
          </View>
        </View>
      );
    }

    if (paymentType === "booking" && appointment) {
      // Existing booking content
      const doctorPhotoUri = appointment.dermatologist?.user?.photoUrl?.startsWith("data:")
        ? appointment.dermatologist.user.photoUrl
        : null;

      return (
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Appointment Details</Text>

          {/* Doctor Section */}
          <Text style={styles.sectionTitle}>Consultant</Text>
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
              <Text style={styles.doctorName}>
                {appointment.dermatologist?.user?.fullName || "Dermatologist"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Patient Section */}
          <Text style={styles.sectionTitle}>Patient</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>
              {appointment.customer?.user?.fullName || "Patient"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.emailValue}>
              {appointment.customer?.user?.email}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Appointment Details */}
          <Text style={styles.sectionTitle}>When</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{formatDate(appointment.startTime)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Time:</Text>
            <Text style={styles.value}>
              {`${formatTime(appointment.startTime)} - ${formatTime(appointment.endTime)}`}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Type:</Text>
            <Text style={styles.value}>
              {formatAppointmentType(appointment.appointmentType)}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Payment Details */}
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Amount Paid:</Text>
            <Text style={styles.valueAmount}>
              {Number(appointment.payment?.amount || appointment.price).toLocaleString("vi-VN")} VND
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Method:</Text>
            <Text style={styles.value}>
              {appointment.payment?.paymentMethod?.toUpperCase() || "Subscription"}
            </Text>
          </View>
        </View>
      );
    }

    if (paymentType === "purchase" && order) {
      // New purchase content
      return (
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Purchase Details</Text>

          {/* Order ID */}
          <Text style={styles.sectionTitle}>Order Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Order ID:</Text>
            <Text style={styles.value}>{order.orderId}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{order.status}</Text>
          </View>

          <View style={styles.divider} />

          {/* Items Summary */}
          <Text style={styles.sectionTitle}>Items Purchased</Text>
          {order.orderItems?.map((item, index) => (
            <View key={index} style={styles.row}>
              <Text style={styles.label}>{item.product.productName} (x{item.quantity}):</Text>  {/* Updated to use item.product.productName */}
              <Text style={styles.value}>
                {(parseFloat(item.priceAtTime) * item.quantity).toLocaleString("vi-VN")} VND
              </Text>
            </View>
          ))}

          <View style={styles.divider} />

          {/* Payment Details */}
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total Paid:</Text>
            <Text style={styles.valueAmount}>
              {orderService.calculateOrderTotal(order.orderItems).toLocaleString("vi-VN")} VND  {/* Use service method for total */}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Method:</Text>
            <Text style={styles.value}>
              {order.payment?.paymentMethod?.toUpperCase() || "Bank Transfer"}
            </Text>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
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
        <Text style={styles.title}>
          {paymentType === "booking" ? "Booking Confirmed!" : paymentType === "purchase" ? "Purchase Successful!" : "Payment Successful!"}
        </Text>
        <Text style={styles.instructions}>
          {paymentType === "booking"
            ? "Your appointment has been successfully booked."
            : paymentType === "purchase"
            ? "Your purchase has been completed successfully."
            : "Your payment has been processed successfully."}
        </Text>

        {/* Dynamic Content */}
        {renderContent()}
      </ScrollView>

      {/* Footer Button */}
      <View style={styles.footer}>
        <Pressable style={styles.scheduleButton} onPress={goToNext}>
          <Text style={styles.scheduleButtonText}>
            {paymentType === "booking" ? "Go to My Schedule" : "Continue Shopping"}
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
    paddingBottom: 100,
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
  },
  infoCard: {
    backgroundColor: "#f5f5ff",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginTop: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
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
