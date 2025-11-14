import {
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";

import appointmentService from "@/services/appointmentService";
import { AppointmentWithRelations } from "@/types/appointment.type";
import { AppointmentStatus } from "@/types/appointment.type";

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
const getStatusInfo = (
  status: AppointmentStatus
): { text: string; color: string; icon: any } => {
  switch (status) {
    case AppointmentStatus.SCHEDULED:
      return { text: "Scheduled", color: "#007bff", icon: "calendar-check" };
    case AppointmentStatus.IN_PROGRESS:
      return { text: "In Progress", color: "#E91E63", icon: "video" };
    case AppointmentStatus.COMPLETED:
      return { text: "Completed", color: "#4CAF50", icon: "check-decagram" };
    case AppointmentStatus.CANCELLED:
      return { text: "Cancelled", color: "#9E9E9E", icon: "close-circle" };
    case AppointmentStatus.NO_SHOW:
      return { text: "No Show", color: "#f44336", icon: "account-off" };
    default:
      return { text: status, color: "#FF9800", icon: "alert-circle" };
  }
};

export default function AppointmentDetailScreen() {
  const router = useRouter();
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();

  const [appointment, setAppointment] =
    useState<AppointmentWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appointmentId) {
      setError("No appointment ID provided.");
      setIsLoading(false);
      return;
    }

    const fetchAppointment = async () => {
      try {
        setIsLoading(true);
        const data = await appointmentService.getAppointmentById(appointmentId);
        setAppointment(data);
      } catch (err) {
        console.error("Failed to load appointment details:", err);
        setError("Failed to load appointment details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointment();
  }, [appointmentId]);

  const handleJoinMeeting = async () => {
    if (!appointment?.meetingUrl) {
      Alert.alert(
        "No Link Available",
        "The meeting link is not ready yet. Please check back later."
      );
      return;
    }

    try {
      await Linking.openURL(appointment.meetingUrl);
    } catch (err) {
      Alert.alert("Error", "Could not open the meeting link.");
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" style={styles.center} />;
    }

    if (error || !appointment) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {error || "Appointment not found."}
          </Text>
        </View>
      );
    }

    const statusInfo = getStatusInfo(appointment.appointmentStatus);
    const isJoinable =
      appointment.appointmentStatus === AppointmentStatus.SCHEDULED ||
      appointment.appointmentStatus === AppointmentStatus.IN_PROGRESS;

    return (
      <>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Back Button */}
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#007bff" />
            <Text style={styles.backButtonText}>Back to Schedule</Text>
          </Pressable>

          {/* Thẻ Trạng Thái */}
          <View
            style={[styles.statusCard, { backgroundColor: statusInfo.color }]}
          >
            <MaterialCommunityIcons
              name={statusInfo.icon}
              size={24}
              color="#fff"
            />
            <Text style={styles.statusText}>{statusInfo.text}</Text>
          </View>

          {/* Dermatologist */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dermatologist</Text>
            <View style={styles.doctorHeader}>
              <Image
                style={styles.doctorAvatar}
                source={
                  appointment.dermatologist?.user?.photoUrl
                    ? { uri: appointment.dermatologist.user.photoUrl }
                    : require("@/assets/images/icon.png")
                }
              />
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>
                  {appointment.dermatologist?.user?.fullName || "Dermatologist"}
                </Text>
                {/* (Giả sử API KHÔNG có 'specialization',
                     nếu có, bạn có thể bỏ comment dòng dưới) */}
                {/* <Text style={styles.doctorSpec}>
                  {appointment.dermatologist?.specialization?.join(", ") || "Specialist"}
                </Text> */}
              </View>
            </View>
          </View>

          {/* Appointment Details */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Appointment Details</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Date:</Text>
              <Text style={styles.value}>
                {formatDate(appointment.startTime)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Time:</Text>
              <Text style={styles.value}>
                {`${formatTime(appointment.startTime)} - ${formatTime(
                  appointment.endTime
                )}`}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Type:</Text>
              <Text style={styles.value}>
                {appointment.appointmentType.replace("_", " ")}
              </Text>
            </View>
            {appointment.note && (
              <View style={styles.noteContainer}>
                <Text style={styles.label}>Your Note:</Text>
                <Text style={styles.noteText}>{appointment.note}</Text>
              </View>
            )}
          </View>

          {/* Customer Information */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Patient</Text>
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
          </View>
        </ScrollView>

        {/* Join Meeting Button (Sticky Footer) */}
        {isJoinable && ( // (Only show button when joinable)
          <View style={styles.footer}>
            <Pressable style={styles.joinButton} onPress={handleJoinMeeting}>
              <MaterialCommunityIcons
                name="video-plus"
                size={24}
                color="#fff"
              />
              <Text style={styles.joinButtonText}>Join Meeting</Text>
            </Pressable>
          </View>
        )}
      </>
    );
  };

  return <View style={styles.container}>{renderContent()}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5ff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  errorText: {
    fontSize: 16,
    color: "#d9534f",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButtonText: {
    color: "#007bff",
    fontSize: 16,
    marginLeft: 4,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
    textTransform: "capitalize",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
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
  noteContainer: {
    marginTop: 12,
  },
  noteText: {
    fontSize: 15,
    color: "#333",
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
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
  joinButton: {
    flexDirection: "row",
    backgroundColor: "#28a745",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
});
