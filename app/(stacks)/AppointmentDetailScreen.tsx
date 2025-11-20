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
import React, { useState, useEffect, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";

import appointmentService from "@/services/appointmentService";
import { AppointmentWithRelations } from "@/types/appointment.type";
import { AppointmentStatus } from "@/types/appointment.type";
import CustomAlert from "@/components/CustomAlert";

const CHECK_IN_WINDOW_MINUTES = 10;
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
  const [isJoining, setIsJoining] = useState(false);
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelWarning, setCancelWarning] = useState("");

  const fetchAppointment = useCallback(async () => {
    if (!appointmentId) {
      setError("No appointment ID provided.");
      setIsLoading(false);
      return;
    }
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
  }, [appointmentId]);

  useEffect(() => {
    fetchAppointment();
  }, [fetchAppointment]);

  const handleJoinMeeting = async () => {
    if (!appointment || !appointment.meetingUrl || !appointmentId) return;
    if (isJoining) return; // (Avoid multiple taps)

    setIsJoining(true);

    try {
      await appointmentService.checkInCustomer(appointmentId);
      await Linking.openURL(appointment.meetingUrl);
    } catch (err: any) {
      if (err.message?.includes("check-in")) {
        Alert.alert(
          "Check-in Failed",
          err.message || "Could not record check-in."
        );
      } else {
        Alert.alert("Error", "Could not open the meeting link.");
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleViewRoutine = (routineId: string) => {
    router.push({
      pathname: "/(stacks)/TreatmentRoutineDetailScreen",
      params: { routineId: routineId },
    });
  };

  const handleOpenCancelModal = () => {
    if (!appointment) return;

    const startTime = new Date(appointment.startTime);
    const now = new Date();
    const hoursDiff = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      setCancelWarning(
        "You are cancelling more than 24 hours in advance. You will be refunded."
      );
    } else {
      setCancelWarning(
        "You are cancelling less than 24 hours before. This booking is non-refundable."
      );
    }

    setIsCancelModalVisible(true);
  };

  const handleConfirmCancel = async () => {
    if (isCancelling || !appointmentId) return;

    setIsCancelling(true);
    try {
      await appointmentService.cancelMyAppointment(appointmentId);

      Alert.alert("Success", "Your appointment has been cancelled.");

      await fetchAppointment();
    } catch (error: any) {
      Alert.alert("Cancellation Failed", error.message || "An error occurred.");
    } finally {
      setIsCancelling(false);
      setIsCancelModalVisible(false);
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

    const isJoinableStatus =
      appointment.appointmentStatus === AppointmentStatus.SCHEDULED ||
      appointment.appointmentStatus === AppointmentStatus.IN_PROGRESS;

    // Check in time
    const startTime = new Date(appointment.startTime);
    const checkInTime = new Date(
      startTime.getTime() - CHECK_IN_WINDOW_MINUTES * 60000
    );
    const now = new Date();

    // Enable join if current time is within the check-in window
    const isJoinableTime = now >= checkInTime;
    const isCancellable =
      appointment.appointmentStatus === AppointmentStatus.SCHEDULED;
    const hasMeetingUrl = !!appointment.meetingUrl;
    const routineId =
      appointment.createdRoutine?.routineId ||
      appointment.trackingRoutine?.routineId;

    return (
      <>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Back Button */}
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#007bff" />
            <Text style={styles.backButtonText}>Back to Schedule</Text>
          </Pressable>

          {/* Status Card */}
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

            {appointment.medicalNote && (
              <View style={styles.noteContainer}>
                <Text
                  style={[
                    styles.label,
                    { color: "#28a745", fontWeight: "bold" },
                  ]}
                >
                  Doctor's Medical Note:
                </Text>
                <Text
                  style={[
                    styles.noteText,
                    {
                      backgroundColor: "#e8f5e9",
                      borderColor: "#c3e6cb",
                      borderWidth: 1,
                    },
                  ]}
                >
                  {appointment.medicalNote}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
        {/* Footer */}
        <View style={styles.footer}>
          {/* {isJoinableStatus && hasMeetingUrl && ( */}
          <Pressable
            style={[
              styles.joinButton,
              (!isJoinableTime ||
                isJoining ||
                !isJoinableStatus ||
                !hasMeetingUrl) &&
                styles.buttonDisabled,
            ]}
            onPress={handleJoinMeeting}
            // Disable button if not joinable
            disabled={
              !isJoinableTime ||
              isJoining ||
              !isJoinableStatus ||
              !hasMeetingUrl
            }
          >
            {isJoining ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="video-plus"
                  size={24}
                  color="#fff"
                />
                <Text style={styles.joinButtonText}>
                  {isJoinableTime
                    ? "Join Meeting"
                    : `Joinable ${CHECK_IN_WINDOW_MINUTES} mins before`}
                </Text>
              </>
            )}
          </Pressable>

          {routineId && (
            <Pressable
              style={styles.routineButton}
              onPress={() => handleViewRoutine(routineId)}
            >
              <MaterialCommunityIcons
                name="clipboard-text"
                size={24}
                color="#fff"
              />
              <Text style={styles.routineButtonText}>
                View Treatment Routine
              </Text>
            </Pressable>
          )}

          {isCancellable && (
            <Pressable
              style={styles.cancelButton}
              onPress={handleOpenCancelModal}
            >
              <MaterialCommunityIcons name="cancel" size={24} color="#fff" />
              <Text style={styles.cancelButtonText}>Cancel Appointment</Text>
            </Pressable>
          )}
        </View>
        <CustomAlert
          visible={isCancelModalVisible}
          title="Confirm Cancellation?"
          message={cancelWarning}
          confirmText={isCancelling ? "Cancelling..." : "Confirm Cancel"}
          cancelText="Stay"
          onConfirm={handleConfirmCancel}
          onCancel={() => setIsCancelModalVisible(false)}
        />
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

  routineButton: {
    flexDirection: "row",
    backgroundColor: "#6f42c1",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  routineButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  buttonDisabled: {
    backgroundColor: "#9E9E9E",
  },
  cancelButton: {
    flexDirection: "row",
    backgroundColor: "#d9534f",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
});
