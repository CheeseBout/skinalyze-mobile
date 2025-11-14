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
// (Import các types mà bạn đã định nghĩa ở lượt trước)
import {
  AppointmentWithRelations, // (Giả sử đây là type bao gồm relations)
} from "@/types/appointment.type";
import { AppointmentType } from "@/types/appointment.type"; // (Import enum)

// --- Helpers ---
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
// (Helper mới để format AppointmentType)
const formatAppointmentType = (type: AppointmentType) => {
  if (type === AppointmentType.NEW_PROBLEM) return "New Problem";
  if (type === AppointmentType.FOLLOW_UP) return "Follow-up";
  return "Appointment";
};
// --- End Helpers ---

export default function PaymentSuccessScreen() {
  const router = useRouter();

  // 1. Lấy appointmentId từ params
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();

  const [appointment, setAppointment] =
    useState<AppointmentWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 2. Gọi API để lấy thông tin chi tiết
  useEffect(() => {
    if (!appointmentId) {
      setIsLoading(false);
      return;
    }

    const fetchAppointment = async () => {
      try {
        setIsLoading(true);
        // (Giả sử service trả về 'data' từ wrapper { statusCode, message, data })
        const data = await appointmentService.getAppointmentById(appointmentId);
        setAppointment(data);
      } catch (error) {
        console.error("Failed to load appointment details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointment();
  }, [appointmentId]);

  // 3. Nút điều hướng
  const goToSchedule = () => {
    router.replace({ pathname: "/(tabs)/ScheduleScreen" });
  };

  const renderContent = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" style={{ marginTop: 20 }} />;
    }

    if (!appointment) {
      return (
        <Text style={styles.errorText}>
          Your payment was successful, but we couldn't load the details. Please
          check "My Schedule".
        </Text>
      );
    }

    // === THAY ĐỔI 1: Xử lý ảnh base64 ===
    // (Nếu photoUrl là base64 (bắt đầu bằng 'data:'), dùng nó.
    //  Nếu không, dùng ảnh icon.png)
    const doctorPhotoUri =
      appointment.dermatologist?.user?.photoUrl?.startsWith("data:")
        ? appointment.dermatologist.user.photoUrl
        : null;
    // ===================================

    return (
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Appointment Details</Text>

        {/* --- Bác Sĩ --- */}
        <Text style={styles.sectionTitle}>Consultant</Text>
        <View style={styles.doctorHeader}>
          <Image
            style={styles.doctorAvatar}
            source={
              doctorPhotoUri
                ? { uri: doctorPhotoUri } // (Dùng ảnh base64)
                : require("@/assets/images/icon.png")
            }
          />
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>
              {appointment.dermatologist?.user?.fullName || "Dermatologist"}
            </Text>
            {/* === THAY ĐỔI 2: Ẩn 'specialization' vì API không có === */}
            {/* <Text style={styles.doctorSpec}>
              (API không có trường 'specialization')
            </Text> */}
          </View>
        </View>

        <View style={styles.divider} />

        {/* --- Bệnh Nhân --- */}
        <Text style={styles.sectionTitle}>Patient</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>
            {appointment.customer?.user?.fullName || "Patient"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>
            {" "}
            {/* (Style riêng cho email) */}
            {appointment.customer?.user?.email}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* --- Lịch Hẹn --- */}
        <Text style={styles.sectionTitle}>When</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{formatDate(appointment.startTime)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Time:</Text>
          <Text style={styles.value}>
            {`${formatTime(appointment.startTime)} - ${formatTime(
              appointment.endTime
            )}`}
          </Text>
        </View>
        {/* === THAY ĐỔI 3: Dùng helper để format 'appointmentType' === */}
        <View style={styles.row}>
          <Text style={styles.label}>Type:</Text>
          <Text style={styles.value}>
            {formatAppointmentType(appointment.appointmentType)}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* --- Chi Tiết Thanh Toán --- */}
        <Text style={styles.sectionTitle}>Payment</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Amount Paid:</Text>
          <Text style={styles.valueAmount}>
            {Number(
              appointment.payment?.amount || appointment.price
            ).toLocaleString("vi-VN")}{" "}
            VND
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Method:</Text>
          <Text style={styles.value}>
            {appointment.payment?.paymentMethod?.toUpperCase() ||
              "Subscription"}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Biểu tượng thành công */}
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="check-decagram"
            size={100}
            color="#28a745"
          />
        </View>

        <Text style={styles.title}>Booking Confirmed!</Text>
        <Text style={styles.instructions}>
          Your appointment has been successfully booked.
        </Text>

        {/* Card chi tiết */}
        {renderContent()}
      </ScrollView>

      {/* Nút "Go to My Schedule" */}
      <View style={styles.footer}>
        <Pressable style={styles.scheduleButton} onPress={goToSchedule}>
          <Text style={styles.scheduleButtonText}>Go to My Schedule</Text>
        </Pressable>
      </View>
    </View>
  );
}

// --- STYLES ---
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
    paddingBottom: 100, // (Thêm padding dưới)
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
  doctorSpec: {
    fontSize: 14,
    color: "#666",
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
    paddingHorizontal: 8, // (Thêm padding)
  },
  label: {
    fontSize: 15,
    color: "#666",
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    textTransform: "capitalize",
    flex: 1, // (Cho phép email xuống dòng nếu cần)
    textAlign: "right", // (Căn phải)
  },
  emailValue: {
    fontSize: 15,
    fontWeight: "600",
    textTransform: "none", // (Không 'capitalize' email)
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
