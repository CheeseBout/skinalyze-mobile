import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Pressable,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import dermatologistService from "@/services/dermatologistService";
import { Dermatologist } from "@/types/dermatologist.type";

export default function DermatologistDetailScreen() {
  const [dermatologist, setDermatologist] = useState<Dermatologist | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { dermatologistId } = useLocalSearchParams<{
    dermatologistId: string;
  }>();
  const router = useRouter();

  useEffect(() => {
    if (!dermatologistId) {
      setError("No Dermatologist ID provided.");
      setIsLoading(false);
      return;
    }

    const fetchDermatologistDetail = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const data = await dermatologistService.getDermatologistById(
          dermatologistId
        );
        setDermatologist(data);
      } catch (err: any) {
        const errorMessage =
          err.message || "Error fetching dermatologist details";
        setError(errorMessage);
        Alert.alert("Error", errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDermatologistDetail();
  }, [dermatologistId]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading Details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!dermatologist) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>Dermatologist not found.</Text>
      </View>
    );
  }

  const fullName = dermatologist.user?.fullName || "Doctor";
  const specialties =
    dermatologist.specialization?.join(", ") || "Dermatology Specialist";
  const avatarUrl = dermatologist.user?.photoUrl;
  const price = dermatologist.defaultSlotPrice;

  return (
    <ScrollView style={styles.container}>
      {/* Header Info */}
      <View style={styles.header}>
        <Image
          style={styles.avatar}
          source={
            avatarUrl ? { uri: avatarUrl } : require("@/assets/images/icon.png")
          }
        />
        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.specialty}>{specialties}</Text>
        <Text style={styles.experience}>
          {dermatologist.yearsOfExperience} years of experience
        </Text>
      </View>

      {/* About Section */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.bio}>{dermatologist.bio}</Text>
      </View>

      {/* Clinic Section */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Clinic</Text>
        <Text style={styles.address}>{dermatologist.clinicAddress}</Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Subscription Plans</Text>
        <Text style={styles.bio}>
          View and purchase consultation packages offered by this doctor.
        </Text>
        <Pressable
          style={[styles.bookButton, styles.planButton]} 
          onPress={() => {
            router.push({
              pathname: "/(stacks)/SubscriptionPlanListScreen",
              params: {
                dermatologistId: dermatologistId, 
                doctorName: fullName, 
              },
            });
          }}
        >
          <Text style={styles.bookButtonText}>View Available Plans</Text>
        </Pressable>
      </View>

      {/* Booking Section  */}
      <View style={styles.bookingSection}>
        <Text style={styles.price}>
          {price
            ? `Price: ${price.toLocaleString()} VND / session`
            : "Contact for price"}
        </Text>
        <Pressable
          style={styles.bookButton}
          onPress={() => {
            router.push({
              pathname: "/(stacks)/BookingCalendarScreen",
              params: {
                dermatologistId: dermatologistId,
              },
            });
          }}
        >
          <Text style={styles.bookButtonText}>View Availability</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#555",
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
  },
  header: {
    backgroundColor: "#ffffff",
    padding: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#e0e0e0",
    marginBottom: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  specialty: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  experience: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  infoSection: {
    backgroundColor: "#ffffff",
    marginVertical: 8,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#444",
  },
  bio: {
    fontSize: 15,
    lineHeight: 22,
    color: "#555",
  },
  address: {
    fontSize: 15,
    color: "#555",
  },
  bookingSection: {
    backgroundColor: "#ffffff",
    marginVertical: 8,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  price: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007bff",
    marginBottom: 16,
  },
  bookButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    elevation: 2,
  },
  bookButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },

  planButton: {
    backgroundColor: "#6f42c1",
    marginTop: 16,
    alignSelf: "center",
  },
});
