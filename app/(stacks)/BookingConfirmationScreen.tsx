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
import React, {
  useState,
  useMemo,
  useContext,
  useCallback,
  useRef,
} from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

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
import treatmentRoutineService from "@/services/treatmentRoutineService";

import { AuthContext } from "@/contexts/AuthContext";
import userService from "@/services/userService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useThemeColor, hexToRgba } from "@/hooks/useThemeColor";

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
  const { primaryColor } = useThemeColor();
  const [walletBalance, setWalletBalance] = useState<number>(0);
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
  const previousAnalysisIdsRef = useRef<string[]>([]);

  const optionTint = useMemo(
    () => hexToRgba(primaryColor, 0.12),
    [primaryColor]
  );
  const optionDescActive = useMemo(
    () => hexToRgba(primaryColor, 0.8),
    [primaryColor]
  );
  const iconInactiveColor = useMemo(
    () => hexToRgba(primaryColor, 0.6),
    [primaryColor]
  );
  const confirmDisabledColor = useMemo(
    () => hexToRgba(primaryColor, 0.4),
    [primaryColor]
  );

  const updateSelectedRoutine = useCallback(
    (routinesData: TreatmentRoutine[]) => {
      const newIds = routinesData.map((routine) => routine.routineId);
      setSelectedRoutineId((current) => {
        if (current && newIds.includes(current)) {
          return current;
        }
        return routinesData.length > 0 ? routinesData[0].routineId : null;
      });
    },
    []
  );

  const updateSelectedAnalysis = useCallback((analysesData: SkinAnalysis[]) => {
    const newIds = analysesData.map((analysis) => analysis.analysisId);
    const previousIds = previousAnalysisIdsRef.current;
    const addedIds = newIds.filter((id) => !previousIds.includes(id));

    setSelectedAnalysisId((current) => {
      if (previousIds.length === 0) {
        if (current && newIds.includes(current)) {
          return current;
        }
        return analysesData.length > 0 ? analysesData[0].analysisId : null;
      }

      if (addedIds.length > 0) {
        return addedIds[0];
      }

      if (current && newIds.includes(current)) {
        return current;
      }

      return analysesData.length > 0 ? analysesData[0].analysisId : null;
    });

    previousAnalysisIdsRef.current = newIds;
  }, []);

  const fetchData = useCallback(async () => {
    if (!params.dermatologistId) {
      return;
    }

    if (!user?.userId) {
      if (!isAuthLoading) {
        Alert.alert("Authentication Error", "Please log in again.");
      }
      setIsLoadingData(false);
      return;
    }

    try {
      setIsLoadingData(true);

      const [doctorData, subsData, walletData] = await Promise.all([
        dermatologistService.getDermatologistById(params.dermatologistId),
        customerSubscriptionService.getMyActiveSubscriptions(
          params.dermatologistId
        ),
        userService.getBalance(),
      ]);

      setDoctor(doctorData);
      setSubscriptions(subsData);
      setWalletBalance(walletData.balance);

      const customerData = await customerService.getCustomerProfile(
        user.userId
      );
      setCustomer(customerData);

      if (customerData?.customerId) {
        const [analysesData, routinesData] = await Promise.all([
          skinAnalysisService.getUserAnalyses(customerData.customerId),
          treatmentRoutineService.getCustomerRoutines(customerData.customerId),
        ]);

        setAnalyses(analysesData);
        updateSelectedAnalysis(analysesData);

        setRoutines(routinesData);
        updateSelectedRoutine(routinesData);
      }

      setSelectedOptionId((prev) => {
        const priceNumber = Number(params.price || 0);

        const isExistingSubscription = prev
          ? subsData.some((subscription) => subscription.id === prev)
          : false;

        if (prev === "PAY_NOW") {
          if (priceNumber > 0) {
            return prev;
          }
        } else if (prev === "WALLET") {
          return prev;
        } else if (prev && isExistingSubscription) {
          return prev;
        }

        if (priceNumber > 0) {
          return "PAY_NOW";
        }

        if (subsData.length > 0) {
          return subsData[0].id;
        }

        return priceNumber > 0 ? prev : null;
      });
    } catch (error: any) {
      Alert.alert("Error", "Failed to load booking details.");
    } finally {
      setIsLoadingData(false);
    }
  }, [
    params.dermatologistId,
    params.price,
    user?.userId,
    isAuthLoading,
    updateSelectedAnalysis,
    updateSelectedRoutine,
  ]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const slotDetails = useMemo(() => {
    const price = Number(params.price || 0);
    return {
      date: formatDate(params.startTime),
      time: `${formatTime(params.startTime)} - ${formatTime(params.endTime)}`,
      price: price,
      priceDisplay: price > 0 ? `${price.toLocaleString()} VND` : "Free",
    };
  }, [params]);

  const handleConfirm = async () => {
    if (!selectedOptionId || !params.dermatologistId) return;
    if (!selectedAnalysisId) {
      Alert.alert(
        "Missing Information",
        "Please select a skin analysis result to review."
      );
      return;
    }

    // For Follow-up, routine is required
    if (appointmentType === AppointmentType.FOLLOW_UP && !selectedRoutineId) {
      Alert.alert(
        "Missing Information",
        "Please select a treatment routine to follow-up."
      );
      return;
    }

    setIsConfirming(true);

    const baseDto: CreateAppointmentDto = {
      dermatologistId: params.dermatologistId,
      startTime: params.startTime,
      endTime: params.endTime,
      appointmentType: appointmentType,

      // Analysis required for all appointment types
      analysisId: selectedAnalysisId || undefined,

      trackingRoutineId:
        appointmentType === AppointmentType.FOLLOW_UP
          ? selectedRoutineId || undefined
          : undefined, // (Only send when Follow-up)

      note: note || undefined,
    };

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
      } else if (selectedOptionId === "WALLET") {
        if (walletBalance < slotDetails.price) {
          Alert.alert("Insufficient Balance", "Please top up your wallet.");
          setIsConfirming(false);
          return;
        }

        const appointment = await appointmentService.createWalletAppointment(
          baseDto
        );
        router.replace({
          pathname: "/(stacks)/PaymentSuccessScreen",
          params: { appointmentId: appointment.appointmentId },
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

  const renderOption = (
    id: string,
    title: string,
    description: string,
    disabled: boolean = false,
    icon?: React.ReactElement<{ color?: string }>
  ) => {
    const isSelected = selectedOptionId === id;
    const backgroundColor = isSelected ? optionTint : "#f5f5f5";
    const borderColor = isSelected ? primaryColor : "#ccc";
    const titleColor = isSelected ? primaryColor : "#333";
    const descriptionColor = isSelected ? optionDescActive : "#666";
    const renderedIcon =
      icon && React.isValidElement(icon)
        ? React.cloneElement(icon, {
            color: disabled
              ? "#999"
              : isSelected
              ? primaryColor
              : iconInactiveColor,
          })
        : null;

    return (
      <Pressable
        style={[
          styles.option,
          { backgroundColor, borderColor },
          disabled && styles.optionDisabled,
        ]}
        onPress={() => !disabled && setSelectedOptionId(id)}
        disabled={disabled}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text
              style={[
                styles.optionText,
                { color: titleColor },
                disabled && styles.textDisabled,
              ]}
            >
              {title}
            </Text>
            <Text
              style={[
                styles.optionDesc,
                { color: descriptionColor },
                disabled && styles.textDisabled,
              ]}
            >
              {description}
            </Text>
          </View>
          {renderedIcon}
        </View>
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

          {/* 1. Option: Banking */}
          {slotDetails.price > 0 &&
            renderOption(
              "PAY_NOW",
              "Bank Transfer (VietQR)",
              slotDetails.priceDisplay,
              false,
              <MaterialCommunityIcons name="bank-transfer" size={24} />
            )}

          {/* 2. Option: Wallet */}
          {slotDetails.price >= 0 &&
            renderOption(
              "WALLET",
              "Skinalyze Wallet",
              `Balance: ${walletBalance.toLocaleString("vi-VN")} VND`,
              walletBalance < slotDetails.price, // (Disabled nếu không đủ tiền)
              <MaterialCommunityIcons name="wallet" size={24} />
            )}

          {/* 3. Option: Subscription */}

          {slotDetails.price > 0 &&
            subscriptions.map((sub) =>
              renderOption(
                sub.id,
                (sub.subscriptionPlan as any)?.planName || "My Subscription",
                `${sub.sessionsRemaining} sessions remaining`
              )
            )}

          {/* Notify insufficient wallet balance */}
          {selectedOptionId === "WALLET" &&
            walletBalance < slotDetails.price && (
              <Text style={styles.errorText}>Insufficient wallet balance.</Text>
            )}

          {subscriptions.length === 0 && slotDetails.price === 0 && (
            <Text style={styles.infoText}>This is a free consultation.</Text>
          )}
        </View>
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.footer}>
        {/** highlight primary color for confirmation */}
        <Pressable
          style={[
            styles.confirmButton,
            {
              backgroundColor:
                isConfirming || !selectedOptionId
                  ? confirmDisabledColor
                  : primaryColor,
            },
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
  optionText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  optionDesc: {
    fontSize: 14,
    color: "#666",
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
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    opacity: 0.8,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  optionDisabled: {
    opacity: 0.5,
    backgroundColor: "#eee",
    borderColor: "#ddd",
  },
  textDisabled: {
    color: "#999",
  },
  errorText: {
    fontSize: 14,
    color: "#d9534f",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
});
