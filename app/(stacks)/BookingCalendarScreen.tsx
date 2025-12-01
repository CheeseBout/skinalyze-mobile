// File: app/(stacks)/BookingCalendarScreen.tsx

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

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router"; // === THÊM MỚI: useFocusEffect ===
import { Calendar, DateData } from "react-native-calendars";
import dermatologistService from "@/services/dermatologistService";
import { AvailabilitySlot } from "@/types/availability-slot.type";
import { Dermatologist } from "@/types/dermatologist.type";

const MAX_BOOKING_WINDOW_DAYS = 30;

const getDaysOut = () => {
  const date = new Date();
  date.setDate(date.getDate() + MAX_BOOKING_WINDOW_DAYS);
  return date.toISOString().split("T")[0]; // Format: YYYY-MM-DD
};

type MarkedDates = {
  [date: string]: {
    marked?: boolean;
    dotColor?: string;
    selected?: boolean;
    selectedColor?: string;
    disabled?: boolean;
  };
};

export default function BookingCalendarScreen() {
  const router = useRouter();
  const { dermatologistId } = useLocalSearchParams<{
    dermatologistId: string;
  }>();

  const [doctor, setDoctor] = useState<Dermatologist | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(
    null
  );
  const maxDate = useMemo(() => getDaysOut(), []);

  // Categorize slots into morning and afternoon
  const { morningSlots, afternoonSlots } = useMemo(() => {
    const morning: AvailabilitySlot[] = [];
    const afternoon: AvailabilitySlot[] = [];

    slots.forEach((slot) => {
      const slotHour = new Date(slot.startTime).getHours();

      if (slotHour < 12) {
        morning.push(slot);
      } else {
        afternoon.push(slot);
      }
    });
    return { morningSlots: morning, afternoonSlots: afternoon };
  }, [slots]);
  useEffect(() => {
    const fetchDoctorInfo = async () => {
      if (!dermatologistId) {
        Alert.alert("Error", "Doctor ID is missing.");
        return;
      }
      try {
        const doctorData = await dermatologistService.getDermatologistById(
          dermatologistId
        );
        setDoctor(doctorData);
      } catch (err) {
        Alert.alert("Error", "Could not load doctor information.");
      }
    };
    fetchDoctorInfo();
  }, [dermatologistId]);

  const loadAvailabilitySummary = async (date: Date) => {
    if (!dermatologistId) return;
    // Không set Loading true ở đây để tránh nháy màn hình khi focus lại,
    // hoặc xử lý khéo léo hơn nếu muốn
    // setIsLoadingSummary(true);
    try {
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const availableDays = await dermatologistService.getAvailabilitySummary(
        dermatologistId,
        month,
        year
      );
      const newMarkedDates: MarkedDates = {};
      availableDays.forEach((dayTimestamp) => {
        const dateObj = new Date(dayTimestamp);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const day = String(dateObj.getDate()).padStart(2, "0");
        const localDateString = `${year}-${month}-${day}`;
        newMarkedDates[localDateString] = { marked: true, dotColor: "orange" };
      });

      setMarkedDates((prev) => {
        const updated = { ...newMarkedDates };
        if (selectedDate && prev[selectedDate]?.selected) {
          updated[selectedDate] = {
            ...updated[selectedDate],
            selected: true,
            selectedColor: "#007bff",
          };
        }
        return updated;
      });
    } catch (error: any) {
      console.error("Failed to load summary", error);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const fetchSlotsForDate = async (dateStr: string) => {
    if (!dermatologistId) return;
    setIsLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null); // Reset slot đã chọn để tránh book nhầm slot cũ

    try {
      const daySlots = await dermatologistService.getAvailabilityForDay(
        dermatologistId,
        dateStr
      );
      setSlots(daySlots);
    } catch (error: any) {
      Alert.alert("Error", "Failed to load slots for this day.");
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // Use focus effect to reload availability and slots when screen is focused
  useFocusEffect(
    useCallback(() => {
      // 1. Reload the dots on the calendar (in case the day runs out of slots and loses the dot)
      loadAvailabilitySummary(currentMonth);

      // 2. If a day is selected, reload the slots for that day (in case a slot was just booked and removed)
      if (selectedDate) {
        fetchSlotsForDate(selectedDate);
      }
    }, [currentMonth, dermatologistId, selectedDate])
  );

  // Handle day press event
  const handleDayPress = async (day: DateData) => {
    const dateStr = day.dateString;

    // If the selected day is pressed again -> Deselect
    if (dateStr === selectedDate) {
      setSelectedDate(null);
      setSelectedSlot(null);
      setSlots([]);
      setMarkedDates((prev) => {
        const newMarks = { ...prev };
        if (prev[dateStr]) {
          // Keep the mark if the day has availability, just remove the select
          newMarks[dateStr] = { ...prev[dateStr], selected: false };
        }
        return newMarks;
      });
      return;
    }

    // If the day has no availability (no dot) -> Ignore
    if (!markedDates[dateStr]?.marked) {
      return;
    }

    setSelectedDate(dateStr);

    setMarkedDates((prev) => {
      const newMarks = { ...prev };
      // Remove highlight from the old selected day
      if (selectedDate && newMarks[selectedDate]) {
        newMarks[selectedDate] = { ...newMarks[selectedDate], selected: false };
      }
      // Highlight the new day
      if (newMarks[dateStr]) {
        newMarks[dateStr] = {
          ...newMarks[dateStr],
          selected: true,
          selectedColor: "#007bff",
        };
      }
      return newMarks;
    });

    fetchSlotsForDate(dateStr);
  };

  // Handle confirm booking
  const handleConfirmBooking = () => {
    if (!selectedSlot || !dermatologistId) return;
    router.push({
      pathname: "/(stacks)/BookingConfirmationScreen",
      params: {
        dermatologistId,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        price: selectedSlot.price,
        slotId: selectedSlot.slotId,
      },
    });
  };

  // Format time helper
  const formatTime = (isoDate: string) => {
    return new Date(isoDate).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // Render slot chip
  const renderSlotChip = (slot: AvailabilitySlot) => (
    <Pressable
      key={slot.slotId}
      style={[
        styles.slotChip,
        selectedSlot?.slotId === slot.slotId && styles.slotChipSelected,
      ]}
      onPress={() => setSelectedSlot(slot)}
    >
      <Text
        style={
          selectedSlot?.slotId === slot.slotId
            ? styles.slotTextSelected
            : styles.slotText
        }
      >
        {`${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Doctor Header */}
        {doctor ? (
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
        ) : (
          <ActivityIndicator style={{ marginVertical: 20 }} size="large" />
        )}

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            current={new Date().toISOString().split("T")[0]}
            minDate={new Date().toISOString().split("T")[0]}
            maxDate={maxDate}
            onDayPress={handleDayPress}
            markedDates={markedDates}
            onMonthChange={(month) => {
              setCurrentMonth(new Date(month.timestamp));
            }}
            displayLoadingIndicator={isLoadingSummary}
          />
        </View>

        {/* 2. TIME SLOTS */}
        <View style={styles.slotsContainer}>
          <Text style={styles.sectionTitle}>Available Slots</Text>
          {isLoadingSlots && (
            <ActivityIndicator style={{ marginTop: 16 }} size="large" />
          )}

          {!isLoadingSlots && slots.length === 0 && selectedDate && (
            <Text style={styles.infoText}>No slots found for this day.</Text>
          )}

          {!isLoadingSlots && slots.length === 0 && !selectedDate && (
            <Text style={styles.infoText}>Please select an available day.</Text>
          )}

          {/* Render morning and afternoon slots separately */}
          {!isLoadingSlots && slots.length > 0 && (
            <>
              {/* Morning */}
              {morningSlots.length > 0 && (
                <View key="morning-section" style={styles.timeOfDayContainer}>
                  <Text style={styles.timeOfDayTitle}>Morning</Text>
                  <View style={styles.slotsGrid}>
                    {morningSlots.map(renderSlotChip)}
                  </View>
                </View>
              )}

              {/* Afternoon */}
              {afternoonSlots.length > 0 && (
                <View key="afternoon-section" style={styles.timeOfDayContainer}>
                  <Text style={styles.timeOfDayTitle}>Afternoon</Text>
                  <View style={styles.slotsGrid}>
                    {afternoonSlots.map(renderSlotChip)}
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.confirmButton,
            !selectedSlot && styles.confirmButtonDisabled,
          ]}
          disabled={!selectedSlot}
          onPress={handleConfirmBooking}
        >
          <Text style={styles.confirmButtonText}>Booking this slot</Text>
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
  doctorHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  doctorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#e0e0e0",
  },
  doctorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  doctorSpec: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  calendarContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  slotsContainer: {
    padding: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  infoText: {
    textAlign: "center",
    color: "#666",
    marginTop: 16,
    fontSize: 15,
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  slotChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    margin: 6,
  },
  slotChipSelected: {
    backgroundColor: "#007bff",
    borderColor: "#007bff",
  },
  slotText: {
    color: "#333",
    fontWeight: "bold",
  },
  slotTextSelected: {
    color: "#fff",
    fontWeight: "bold",
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

  // Style for time of day sections (morning/afternoon)
  timeOfDayContainer: {
    marginBottom: 20,
  },
  timeOfDayTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 6,
  },
});
