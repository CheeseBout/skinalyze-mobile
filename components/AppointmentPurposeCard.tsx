import React from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { Picker } from "@react-native-picker/picker";

import { AppointmentType } from "@/types/appointment.type";
import { SkinAnalysis } from "@/types/skin-analysis.type";
import { TreatmentRoutine } from "@/types/treatment-routine.type";

const formatDate = (isoDate: string) => {
  if (!isoDate) return "N/A";
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

type Props = {
  appointmentType: AppointmentType;
  setAppointmentType: (type: AppointmentType) => void;

  analyses: SkinAnalysis[];
  selectedAnalysisId: string | null;
  setSelectedAnalysisId: (id: string | null) => void;

  routines: TreatmentRoutine[];
  selectedRoutineId: string | null;
  setSelectedRoutineId: (id: string | null) => void;

  note: string;
  setNote: (note: string) => void;
};

export default function AppointmentPurposeCard({
  appointmentType,
  setAppointmentType,
  analyses,
  selectedAnalysisId,
  setSelectedAnalysisId,
  routines,
  selectedRoutineId,
  setSelectedRoutineId,
  note,
  setNote,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Appointment Purpose</Text>

      {/* Select Type (NEW_PROBLEM / FOLLOW_UP) */}
      <View style={styles.segmentedControl}>
        <Pressable
          style={[
            styles.segmentButton,
            appointmentType === AppointmentType.NEW_PROBLEM &&
              styles.segmentButtonActive,
          ]}
          onPress={() => setAppointmentType(AppointmentType.NEW_PROBLEM)}
        >
          <Text
            style={
              appointmentType === AppointmentType.NEW_PROBLEM
                ? styles.segmentTextActive
                : styles.segmentText
            }
          >
            New Problem
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.segmentButton,
            appointmentType === AppointmentType.FOLLOW_UP &&
              styles.segmentButtonActive,
          ]}
          onPress={() => setAppointmentType(AppointmentType.FOLLOW_UP)}
        >
          <Text
            style={
              appointmentType === AppointmentType.FOLLOW_UP
                ? styles.segmentTextActive
                : styles.segmentText
            }
          >
            Follow-up
          </Text>
        </Pressable>
      </View>

      {/* Dropdown */}
      {appointmentType === AppointmentType.NEW_PROBLEM && (
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Analysis to review:</Text>
          <Picker
            selectedValue={selectedAnalysisId}
            onValueChange={(itemValue) => setSelectedAnalysisId(itemValue)}
            style={styles.picker}
          >
            {analyses.length === 0 && (
              <Picker.Item
                label="No previous analysis found"
                value={null}
                enabled={false}
              />
            )}
            {analyses.map((analysis) => (
              <Picker.Item
                key={analysis.analysisId}
                label={`${formatDate(analysis.createdAt)} - ${
                  analysis.chiefComplaint ||
                  analysis.aiDetectedDisease ||
                  "AI Scan"
                }`}
                value={analysis.analysisId}
              />
            ))}
          </Picker>
        </View>
      )}

      {appointmentType === AppointmentType.FOLLOW_UP && (
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Routine to follow-up:</Text>
          <Picker
            selectedValue={selectedRoutineId}
            onValueChange={(itemValue) => setSelectedRoutineId(itemValue)}
            style={styles.picker}
          >
            {routines.length === 0 && (
              <Picker.Item
                label="No previous routine found"
                value={null}
                enabled={false}
              />
            )}
            {routines.map((routine) => (
              <Picker.Item
                key={routine.routineId}
                label={`${formatDate(routine.createdAt)} - ${
                  routine.routineName
                }`}
                value={routine.routineId}
              />
            ))}
          </Picker>
        </View>
      )}

      {/* Add Note */}
      <View style={styles.noteContainer}>
        <Text style={styles.label}>Note (Optional):</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter a brief note for the doctor..."
          value={note}
          onChangeText={setNote}
          multiline
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  label: {
    fontSize: 15,
    color: "#666",
  },
  segmentedControl: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: "#e0e0e0",
    borderRadius: 8,
    overflow: "hidden",
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonActive: {
    backgroundColor: "#fff",
    borderRadius: 8,
    margin: 2,
    elevation: 1,
    shadowOpacity: 0.1,
  },
  segmentText: {
    fontSize: 14,
    color: "#555",
  },
  segmentTextActive: {
    fontSize: 14,
    color: "#007bff",
    fontWeight: "bold",
  },
  pickerContainer: {
    marginTop: 16,
  },
  picker: {
    width: "100%",
    height: 120,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginTop: 8,
  },
  noteContainer: {
    marginTop: 16,
  },
  textInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    textAlignVertical: "top",
    marginTop: 8,
    fontSize: 14,
  },
});
