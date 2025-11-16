import {
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import treatmentRoutineService from "@/services/treatmentRoutineService";
import { TreatmentRoutine } from "@/types/treatment-routine.type";
import { RoutineDetail } from "@/types/routineDetail.type";

const formatDate = (isoDate: string) => {
  if (!isoDate) return "N/A";
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function TreatmentRoutineDetailScreen() {
  const router = useRouter();
  const { routineId } = useLocalSearchParams<{ routineId: string }>();

  const [routine, setRoutine] = useState<TreatmentRoutine | null>(null);
  const [details, setDetails] = useState<RoutineDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!routineId) {
      setError("No Routine ID provided.");
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [routineData, detailsData] = await Promise.all([
          treatmentRoutineService.getRoutineById(routineId),
          treatmentRoutineService.getDetailsForRoutine(routineId),
        ]);
        setRoutine(routineData);
        setDetails(detailsData);
      } catch (err) {
        console.error("Failed to load routine details:", err);
        setError("Failed to load routine details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [routineId]);

  //  Render
  if (isLoading) {
    return <ActivityIndicator size="large" style={styles.center} />;
  }
  if (error || !routine) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "Routine not found."}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back Button */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#007bff" />
          <Text style={styles.backButtonText}>Back to Appointment</Text>
        </Pressable>

        {/* Header  */}
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="clipboard-text-clock"
            size={40}
            color="#007bff"
          />
          <Text style={styles.title}>{routine.routineName}</Text>
          <Text style={styles.subTitle}>
            Created: {formatDate(routine.createdAt)} | Status: {routine.status}
          </Text>
        </View>

        {/*Routine Details */}
        {details.map((item) => (
          <View style={styles.card} key={item.routineDetailId}>
            <View style={styles.stepHeader}>
              {item.description && (
                <Text style={styles.stepTitle}>{item.description}</Text>
              )}
            </View>

            <Text style={styles.content}>{item.content}</Text>
          </View>
        ))}

        {details.length === 0 && (
          <Text style={styles.errorText}>
            No details found for this routine.
          </Text>
        )}
      </ScrollView>
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
  scrollContent: {
    padding: 16,
    paddingTop: 10,
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
  header: {
    alignItems: "center",
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 8,
  },
  subTitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
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
  stepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 8,
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#007bff",
  },

  content: {
    fontSize: 14,
    color: "#777",
    fontStyle: "italic",
    marginTop: 10,
    backgroundColor: "#f9f9f9",
    padding: 8,
    borderRadius: 4,
  },
});
