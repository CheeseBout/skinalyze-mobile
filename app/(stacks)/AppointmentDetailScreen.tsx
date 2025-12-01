import {
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Image,
  Modal,
  TouchableOpacity,
  TextInput,
  AppState,
  AppStateStatus,
} from "react-native";
import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useFocusEffect } from "@react-navigation/native";

import appointmentService from "@/services/appointmentService";
import {
  AppointmentDetailDto,
  InterruptAppointmentDto,
  ReportNoShowDto,
  TerminationReason,
} from "@/types/appointment.type";
import { AppointmentStatus } from "@/types/appointment.type";
import CustomAlert from "@/components/CustomAlert";
import { Picker } from "@react-native-picker/picker";
import { useThemeColor } from "@/contexts/ThemeColorContext";

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
  status: AppointmentStatus | string
): { text: string; color: string; icon: any } => {
  switch (status) {
    case AppointmentStatus.SCHEDULED:
      return { text: "Scheduled", color: "#007bff", icon: "calendar-check" };
    case AppointmentStatus.IN_PROGRESS:
      return { text: "In Progress", color: "#E91E63", icon: "video" };
    case AppointmentStatus.INTERRUPTED:
      return { text: "Interrupted", color: "#ff9800", icon: "alert-octagon" };
    case AppointmentStatus.COMPLETED:
    case AppointmentStatus.SETTLED:
      return { text: "Completed", color: "#4CAF50", icon: "check-decagram" };
    case AppointmentStatus.CANCELLED:
      return { text: "Cancelled", color: "#9E9E9E", icon: "close-circle" };
    case AppointmentStatus.NO_SHOW:
      return { text: "No Show", color: "#f44336", icon: "account-off" };
    case AppointmentStatus.DISPUTED:
      return { text: "Disputed", color: "#ff7043", icon: "gavel" };
    default:
      return { text: status, color: "#FF9800", icon: "alert-circle" };
  }
};

type FeedbackAlertState = {
  visible: boolean;
  title: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  confirmText?: string;
};

export default function AppointmentDetailScreen() {
  const router = useRouter();
  const { primaryColor } = useThemeColor();

  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [appointment, setAppointment] = useState<AppointmentDetailDto | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelWarning, setCancelWarning] = useState("");

  // Modal No-Show
  const [isNoShowModalVisible, setIsNoShowModalVisible] = useState(false);
  const [noShowNote, setNoShowNote] = useState("");
  const [isReportingNoShow, setIsReportingNoShow] = useState(false);

  // Modal Interrupt
  const [isInterruptModalVisible, setIsInterruptModalVisible] = useState(false);
  const [interruptReason, setInterruptReason] = useState<TerminationReason>(
    TerminationReason.DOCTOR_ISSUE
  );
  const [interruptNote, setInterruptNote] = useState("");
  const [isReportingInterrupt, setIsReportingInterrupt] = useState(false);

  const [feedbackAlert, setFeedbackAlert] = useState<FeedbackAlertState>({
    visible: false,
    title: "",
    message: "",
    type: "info",
    confirmText: "Close",
  });
  const appState = useRef<AppStateStatus>(AppState.currentState);

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

  useFocusEffect(
    useCallback(() => {
      fetchAppointment();
    }, [fetchAppointment])
  );

  // Refetch when returning from background so the join label stays current.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasInBackground =
        appState.current === "inactive" || appState.current === "background";
      if (wasInBackground && nextState === "active") {
        fetchAppointment();
      }
      appState.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [fetchAppointment]);

  // Check condition to show report menu
  const canReport = useMemo(() => {
    if (!appointment) return false;
    const { appointmentStatus, endTime } = appointment;

    if (appointmentStatus === AppointmentStatus.IN_PROGRESS) return true;

    const isPostSessionStatus =
      appointmentStatus === AppointmentStatus.COMPLETED ||
      appointmentStatus === AppointmentStatus.INTERRUPTED ||
      appointmentStatus === AppointmentStatus.SETTLED ||
      appointmentStatus === AppointmentStatus.DISPUTED;

    if (isPostSessionStatus) {
      // Kiểm tra trong vòng 24h sau khi kết thúc
      const endTimeDate = new Date(endTime);
      const now = new Date();
      const diffHours =
        (now.getTime() - endTimeDate.getTime()) / (1000 * 60 * 60);
      return diffHours <= 24;
    }

    return false;
  }, [appointment]);
  const canReportNoShow = useMemo(() => {
    if (!appointment) return false;
    const { appointmentStatus } = appointment;
    if (
      appointmentStatus === AppointmentStatus.INTERRUPTED ||
      appointmentStatus === AppointmentStatus.DISPUTED
    ) {
      return false;
    }
    return canReport;
  }, [appointment, canReport]);

  useEffect(() => {
    if (!canReportNoShow && isNoShowModalVisible) {
      setIsNoShowModalVisible(false);
    }
  }, [canReportNoShow, isNoShowModalVisible]);

  // 2. Xử lý Báo cáo No-Show
  const submitReportNoShow = async () => {
    if (!appointmentId || !canReportNoShow) return;
    setIsReportingNoShow(true);
    try {
      const dto: ReportNoShowDto = { note: noShowNote };
      const result = await appointmentService.reportDoctorNoShow(
        appointmentId,
        dto
      );
      setFeedbackAlert({
        visible: true,
        title: "Report Sent",
        message:
          result.message ||
          "We have received your report regarding doctor no-show.",
        type: "success",
        confirmText: "Close",
      });

      setIsNoShowModalVisible(false);
      setIsMenuVisible(false);
      fetchAppointment(); // Reload data
    } catch (error: any) {
      setFeedbackAlert({
        visible: true,
        title: "Error",
        message: error.message || "Failed to send report.",
        type: "error",
        confirmText: "OK",
      });
    } finally {
      setIsReportingNoShow(false);
    }
  };

  // 3. Xử lý Báo cáo Interrupt
  const submitReportInterrupt = async () => {
    if (!appointmentId) return;
    setIsReportingInterrupt(true);
    try {
      const dto: InterruptAppointmentDto = {
        reason: interruptReason,
        terminationNote: interruptNote,
      };
      await appointmentService.reportInterrupt(appointmentId, dto);
      setFeedbackAlert({
        visible: true,
        title: "Report Sent",
        message: "We have received your report regarding the interruption.",
        type: "success",
        confirmText: "Close",
      });

      setIsInterruptModalVisible(false);
      setIsMenuVisible(false);
      fetchAppointment(); // Reload data
    } catch (error: any) {
      setFeedbackAlert({
        visible: true,
        title: "Error",
        message: error.message || "Failed to send report.",
        type: "error",
        confirmText: "OK",
      });
    } finally {
      setIsReportingInterrupt(false);
    }
  };
  // ==========================

  const handleJoinMeeting = async () => {
    if (!appointment || !appointment.meetingUrl || !appointmentId) return;
    if (isJoining) return; // (Avoid multiple taps)

    setIsJoining(true);

    try {
      if (!appointment.customerJoinedAt) {
        await appointmentService.checkInCustomer(appointmentId);
      }
      await Linking.openURL(appointment.meetingUrl);
    } catch (err: any) {
      if (err.message?.includes("check-in")) {
        setFeedbackAlert({
          visible: true,
          title: "Check-in Failed",
          message: err.message || "Could not record check-in.",
          type: "error",
          confirmText: "Close",
        });
      } else {
        setFeedbackAlert({
          visible: true,
          title: "Error",
          message: "Could not open the meeting link.",
          type: "error",
          confirmText: "Close",
        });
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
      await fetchAppointment();

      setFeedbackAlert({
        visible: true,
        title: "Success",
        message: "Your appointment has been cancelled.",
        type: "success",
        confirmText: "Close",
      });
    } catch (error: any) {
      setFeedbackAlert({
        visible: true,
        title: "Cancellation Failed",
        message: error.message || "An error occurred.",
        type: "error",
        confirmText: "Close",
      });
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
    const hasCheckedIn = Boolean(appointment.customerJoinedAt);

    return (
      <>
        {/* === TOP BAR  === */}
        <View style={styles.topBar}>
          <Pressable style={styles.topBarButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#007bff" />
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>

          {/* Validate show report menu */}
          {canReport && (
            <Pressable
              style={styles.topBarButton}
              onPress={() => setIsMenuVisible(true)}
            >
              <MaterialCommunityIcons
                name="dots-vertical"
                size={28}
                color="#333"
              />
            </Pressable>
          )}
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
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

          {appointment.statusMessage && (
            <View style={styles.statusMessageCard}>
              <MaterialCommunityIcons
                name="information"
                size={20}
                color="#333"
              />
              <Text style={styles.statusMessageText}>
                {appointment.statusMessage}
              </Text>
            </View>
          )}

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
                {/* (Assuming API does NOT have 'specialization',
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

            {appointment.adminNote && (
              <View style={styles.noteContainer}>
                <View style={styles.noteHeader}>
                  <MaterialCommunityIcons
                    name="shield-alert"
                    size={18}
                    color="#1b5e20"
                    style={styles.adminNoteIcon}
                  />
                  <Text style={[styles.label, styles.adminNoteLabel]}>
                    Admin Update:
                  </Text>
                </View>
                <Text style={[styles.noteText, styles.adminNoteText]}>
                  {appointment.adminNote}
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
                  {!isJoinableTime
                    ? `Joinable ${CHECK_IN_WINDOW_MINUTES} mins before`
                    : hasCheckedIn
                    ? "Re-Join Meeting"
                    : "Check-in & Join"}
                </Text>
              </>
            )}
          </Pressable>

          {routineId && (
            <Pressable
              style={[styles.routineButton, { backgroundColor: primaryColor }]}
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
          type="warning"
          confirmText={isCancelling ? "Cancelling..." : "Confirm Cancel"}
          cancelText="Stay"
          onConfirm={handleConfirmCancel}
          onCancel={() => setIsCancelModalVisible(false)}
        />

        <CustomAlert
          visible={feedbackAlert.visible}
          title={feedbackAlert.title}
          message={feedbackAlert.message}
          type={feedbackAlert.type}
          confirmText={feedbackAlert.confirmText}
          onConfirm={() =>
            setFeedbackAlert((prev) => ({ ...prev, visible: false }))
          }
        />
        {/*  REPORT MENU */}
        <Modal
          transparent={true}
          visible={isMenuVisible}
          animationType="fade"
          onRequestClose={() => setIsMenuVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setIsMenuVisible(false)}
          >
            <View style={styles.menuContainer}>
              <Text style={styles.menuTitle}>Report Issue</Text>

              {canReportNoShow && (
                <>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setIsMenuVisible(false);
                      setIsNoShowModalVisible(true);
                    }}
                  >
                    <MaterialCommunityIcons
                      name="account-cancel"
                      size={24}
                      color="#f44336"
                    />
                    <Text style={styles.menuText}>Doctor No-Show</Text>
                  </TouchableOpacity>

                  <View style={styles.divider} />
                </>
              )}

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setIsMenuVisible(false);
                  setIsInterruptModalVisible(true);
                }}
              >
                <MaterialCommunityIcons
                  name="alert-octagon"
                  size={24}
                  color="#FF9800"
                />
                <Text style={styles.menuText}>Report Interruption</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* REPORT NO-SHOW FORM  */}
        <Modal
          transparent={true}
          visible={isNoShowModalVisible}
          animationType="slide"
          onRequestClose={() => setIsNoShowModalVisible(false)}
        >
          <View style={styles.formModalOverlay}>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Report Doctor No-Show</Text>
              <Text style={styles.formSubtitle}>
                Did the doctor fail to join the meeting?
              </Text>

              <TextInput
                style={styles.textArea}
                placeholder="Add details (e.g. Doctor didn't turn on camera...)"
                multiline
                numberOfLines={4}
                value={noShowNote}
                onChangeText={setNoShowNote}
              />

              <View style={styles.formActions}>
                <Pressable
                  style={styles.formButtonCancel}
                  onPress={() => setIsNoShowModalVisible(false)}
                >
                  <Text style={styles.formButtonTextCancel}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.formButtonSubmit}
                  onPress={submitReportNoShow}
                  disabled={isReportingNoShow}
                >
                  {isReportingNoShow ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.formButtonTextSubmit}>
                      Submit Report
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* REPORT INTERRUPT FORM  */}
        <Modal
          transparent={true}
          visible={isInterruptModalVisible}
          animationType="slide"
          onRequestClose={() => setIsInterruptModalVisible(false)}
        >
          <View style={styles.formModalOverlay}>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Report Interruption</Text>
              <Text style={styles.formSubtitle}>
                Why was the appointment interrupted?
              </Text>

              <Text style={styles.label}>Reason:</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={interruptReason}
                  onValueChange={(itemValue) => setInterruptReason(itemValue)}
                >
                  <Picker.Item
                    label="Doctor Issue "
                    value={TerminationReason.DOCTOR_ISSUE}
                  />
                  <Picker.Item
                    label="Platform Issue (Meeting/Technical Issue/Internet)"
                    value={TerminationReason.PLATFORM_ISSUE}
                  />
                  <Picker.Item
                    label="My Issue "
                    value={TerminationReason.CUSTOMER_ISSUE}
                  />
                </Picker>
              </View>

              <Text style={styles.label}>Details:</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Describe what happened..."
                multiline
                numberOfLines={4}
                value={interruptNote}
                onChangeText={setInterruptNote}
              />

              <View style={styles.formActions}>
                <Pressable
                  style={styles.formButtonCancel}
                  onPress={() => setIsInterruptModalVisible(false)}
                >
                  <Text style={styles.formButtonTextCancel}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.formButtonSubmit}
                  onPress={submitReportInterrupt}
                  disabled={isReportingInterrupt}
                >
                  {isReportingInterrupt ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.formButtonTextSubmit}>
                      Submit Report
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
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
  statusMessageCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff9c4",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ffe082",
  },
  statusMessageText: {
    flex: 1,
    marginLeft: 8,
    color: "#5f5f00",
    fontSize: 14,
    fontWeight: "500",
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
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  adminNoteIcon: {
    marginTop: -1,
  },
  noteText: {
    fontSize: 15,
    color: "#333",
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  adminNoteLabel: {
    color: "#1b5e20",
  },
  adminNoteText: {
    backgroundColor: "#e8f5e9",
    borderColor: "#c8e6c9",
    borderWidth: 1,
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
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16, // Adjust for status bar if needed
    paddingBottom: 8,
    backgroundColor: "#f5f5ff",
  },
  topBarButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  backButtonText: {
    color: "#007bff",
    fontSize: 16,
    marginLeft: 4,
    fontWeight: "500",
  },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  // Menu 3 chấm
  menuContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    width: "70%",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#555",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  menuText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#333",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 4,
  },

  // Form Modal (No-show / Interrupt)
  formModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  formSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#444",
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 16,
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    textAlignVertical: "top",
    marginBottom: 20,
    minHeight: 80,
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  formButtonCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
  },
  formButtonSubmit: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#d9534f",
  },
  formButtonTextCancel: {
    color: "#666",
    fontWeight: "600",
  },
  formButtonTextSubmit: {
    color: "#fff",
    fontWeight: "600",
  },
});
