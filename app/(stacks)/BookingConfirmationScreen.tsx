import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Pressable,
  Image,
} from "react-native";
import React, { useState, useEffect, useMemo, useContext } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import AppointmentPurposeCard from "@/components/AppointmentPurposeCard";

import { Dermatologist } from "@/types/dermatologist.type";
import { Customer } from "@/types/customer.type";
import { CustomerSubscription } from "@/types/customerSubscription.type";
import {
  AppointmentType,
  CreateAppointmentDto,
} from "@/types/appointment.type";
import { SkinAnalysis } from "@/types/skin-analysis.type";
import { TreatmentRoutine } from "@/types/treatment-routine.type";

import dermatologistService from "@/services/dermatologistService";
import customerService from "@/services/customerService";
import customerSubscriptionService from "@/services/customerSubscriptionService";
import appointmentService from "@/services/appointmentService";
import skinAnalysisService from "@/services/skinAnalysisService";
import treatmentRoutineService from "@/services/treamentRoutineService";

import { AuthContext } from "@/contexts/AuthContext";

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
const formatGender = (isMale: boolean | undefined) => {
  if (isMale === undefined || isMale === null) return "N/A";
  return isMale ? "Male" : "Female";
};

export default function BookingConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    dermatologistId: string;
    startTime: string;
    endTime: string;
    price: string;
    slotId: string;
  }>();

  const { user, isLoading: isAuthLoading } = useContext(AuthContext);

  const [doctor, setDoctor] = useState<Dermatologist | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>(
    []
  );
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const [appointmentType, setAppointmentType] = useState<AppointmentType>(
    AppointmentType.NEW_PROBLEM
  );
  const [analyses, setAnalyses] = useState<SkinAnalysis[]>([]);
  const [routines, setRoutines] = useState<TreatmentRoutine[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(
    null
  );
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(
    null
  );
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      if (!params.dermatologistId || !user?.userId) {
        if (!isAuthLoading && !user) {
          Alert.alert("Authentication Error", "Please log in again.");
        }
        return;
      }
      try {
        setIsLoadingData(true);

        const [doctorData, subsData] = await Promise.all([
          dermatologistService.getDermatologistById(params.dermatologistId),
          customerSubscriptionService.getMyActiveSubscriptions(
            params.dermatologistId
          ),
        ]);
        console.log("❤️MY PLAN", subsData);

        setDoctor(doctorData);
        setSubscriptions(subsData);

        const customerData = await customerService.getCustomerProfile(
          user.userId
        );
        setCustomer(customerData);
        if (customerData?.customerId) {
          const [analysesData, routinesData] = await Promise.all([
            skinAnalysisService.getUserAnalyses(customerData.customerId),
            treatmentRoutineService.getCustomerRoutines(
              customerData.customerId
            ),
          ]);

          setAnalyses(analysesData);

          setRoutines(routinesData);
          if (routinesData.length > 0) {
            setSelectedRoutineId(routinesData[0].routineId); // (Set default)
          }
          if (analysesData.length > 0) {
            setSelectedAnalysisId(analysesData[0].analysisId); // (Set default)
          }
        }

        // Set default payment option
        if (Number(params.price || 0) > 0) {
          setSelectedOptionId("PAY_NOW");
        } else if (subsData.length > 0) {
          setSelectedOptionId(subsData[0].id);
        }
      } catch (error: any) {
        Alert.alert("Error", "Failed to load booking details.");
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, [params.dermatologistId, user?.userId, isAuthLoading]);

  const slotDetails = useMemo(() => {
    const price = Number(params.price || 0);
    return {
      date: formatDate(params.startTime),
      time: `${formatTime(params.startTime)} - ${formatTime(params.endTime)}`,
      price: price,
      priceDisplay: price > 0 ? `${price.toLocaleString()} VND` : "Free",
    };
  }, [params]);

  // === THAY ĐỔI: Cập nhật Validation và DTO ===
  const handleConfirm = async () => {
    if (!selectedOptionId || !params.dermatologistId) return;

    // --- Validation (Logic mới) ---
    // 1. Cả hai đều cần Analysis ID
    if (!selectedAnalysisId) {
      Alert.alert(
        "Missing Information",
        "Please select a skin analysis result to review."
      );
      return;
    }

    // 2. Chỉ FOLLOW_UP mới cần Routine ID
    if (appointmentType === AppointmentType.FOLLOW_UP && !selectedRoutineId) {
      Alert.alert(
        "Missing Information",
        "Please select a treatment routine to follow-up."
      );
      return;
    }
    // --- Hết Validation ---

    setIsConfirming(true);

    // --- DTO (Logic mới) ---
    const baseDto: CreateAppointmentDto = {
      dermatologistId: params.dermatologistId,
      startTime: params.startTime,
      endTime: params.endTime,
      appointmentType: appointmentType,

      // (Gửi analysisId cho cả 2 trường hợp)
      analysisId: selectedAnalysisId || undefined,

      trackingRoutineId:
        appointmentType === AppointmentType.FOLLOW_UP
          ? selectedRoutineId || undefined
          : undefined, // (Chỉ gửi khi là Follow-up)

      note: note || undefined,
    };

    // (Phần 'try/catch' (gọi API) giữ nguyên)
    try {
      if (selectedOptionId === "PAY_NOW") {
        const response = await appointmentService.createReservation(baseDto);
        router.replace({
          pathname: "/(stacks)/PaymentScreen",
          params: {
            appointmentId: response.appointmentId,
            paymentCode: response.paymentCode,
            expiredAt: response.expiredAt,
            paymentMethod: response.paymentMethod,
            paymentType: response.paymentType,
            bankingInfo: JSON.stringify(response.bankingInfo),
          },
        });
      } else {
        // Subscription payment
        const appointment =
          await appointmentService.createSubscriptionAppointment({
            ...baseDto,
            customerSubscriptionId: selectedOptionId,
          });
        router.replace({
          pathname: "/(stacks)/PaymentSuccessScreen",
          params: { appointmentId: appointment.appointmentId },
        });
      }
    } catch (error: any) {
      Alert.alert("Booking Failed", error.message || "An error occurred.");
      setIsConfirming(false);
    }
  };
  // ============================================

  const renderOption = (id: string, title: string, description: string) => {
    const isSelected = selectedOptionId === id;
    return (
      <Pressable
        style={[styles.option, isSelected && styles.optionSelected]}
        onPress={() => setSelectedOptionId(id)}
      >
        <Text
          style={isSelected ? styles.optionTextSelected : styles.optionText}
        >
          {title}
        </Text>
        <Text
          style={isSelected ? styles.optionDescSelected : styles.optionDesc}
        >
          {description}
        </Text>
      </Pressable>
    );
  };

  if (isLoadingData || isAuthLoading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Derma Card */}
        {doctor && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Consultant</Text>
            <View style={styles.doctorHeader}>
              <Image
                style={styles.doctorAvatar}
                source={
                  doctor.user?.photoUrl
                    ? { uri: doctor.user.photoUrl }
                    : require("@/assets/images/icon.png")
                }
              />
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{doctor.user?.fullName}</Text>
                <Text style={styles.doctorSpec}>
                  {doctor.specialization?.join(", ") || "Dermatologist"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Appointment Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Appointment Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{slotDetails.date}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Time:</Text>
            <Text style={styles.value}>{slotDetails.time}</Text>
          </View>
        </View>

        {/* Patient Information Card */}
        {user && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Patient Information</Text>

            {/* Personal information from Context 'user' */}
            <View style={styles.doctorHeader}>
              <Image
                style={styles.doctorAvatar}
                source={
                  user.photoUrl
                    ? { uri: user.photoUrl }
                    : require("@/assets/images/icon.png")
                }
              />
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{user.fullName}</Text>
                <Text style={styles.doctorSpec}>{user.email}</Text>
              </View>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{user.phone}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Date of Birth:</Text>
              <Text style={styles.value}>{formatDate(user.dob)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Gender:</Text>
              <Text style={styles.value}>{formatGender(user.gender)}</Text>
            </View>

            <View style={styles.divider} />

            {/* Customer Medical Information */}
            {customer ? (
              <>
                <View style={styles.row}>
                  <Text style={styles.label}>Allergies:</Text>
                  <Text style={styles.value}>
                    {customer.allergicTo?.join(", ") || "None provided"}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Medical History:</Text>
                  <Text style={styles.value}>
                    {customer.pastDermatologicalHistory?.join(", ") ||
                      "None provided"}
                  </Text>
                </View>
              </>
            ) : (
              <ActivityIndicator style={{ marginTop: 10 }} />
            )}
          </View>
        )}

        <AppointmentPurposeCard
          appointmentType={appointmentType}
          setAppointmentType={setAppointmentType}
          analyses={analyses}
          selectedAnalysisId={selectedAnalysisId}
          setSelectedAnalysisId={setSelectedAnalysisId}
          routines={routines}
          selectedRoutineId={selectedRoutineId}
          setSelectedRoutineId={setSelectedRoutineId}
          note={note}
          setNote={setNote}
        />

        {/* Payment Option Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Option</Text>
          {renderOption("PAY_NOW", "Pay per Session", slotDetails.priceDisplay)}
          {subscriptions.map((sub) =>
            renderOption(
              sub.id,
              (sub.subscriptionPlan as any)?.planName || "My Subscription",
              `${sub.sessionsRemaining} sessions remaining`
            )
          )}
          {subscriptions.length === 0 && slotDetails.price === 0 && (
            <Text style={styles.infoText}>This is a free consultation.</Text>
          )}
        </View>
      </ScrollView>

      {/* Nút Xác Nhận */}
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.confirmButton,
            (isConfirming || !selectedOptionId) && styles.confirmButtonDisabled,
          ]}
          disabled={isConfirming || !selectedOptionId}
          onPress={handleConfirm}
        >
          {isConfirming ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>
              {selectedOptionId === "PAY_NOW"
                ? "Proceed to Payment"
                : "Confirm Booking"}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
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
    marginBottom: 10,
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
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    color: "#666",
  },
  value: {
    fontSize: 15,
    fontWeight: "bold",
    maxWidth: "60%",
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 12,
  },
  option: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  optionSelected: {
    backgroundColor: "#007bff",
    borderColor: "#007bff",
  },
  optionText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  optionTextSelected: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  optionDesc: {
    fontSize: 14,
    color: "#666",
  },
  optionDescSelected: {
    fontSize: 14,
    color: "#e0e0e0",
  },
  infoText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
  },
  footer: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e0e0e0",
  },
  confirmButton: {
    backgroundColor: "#007bff",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: "#a0a0a0",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
