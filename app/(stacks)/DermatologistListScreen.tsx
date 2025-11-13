import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import dermatologistService from "@/services/dermatologistService";
import { Dermatologist } from "@/types/dermatologist.type";

export default function DermatologistListScreen() {
  const [dermatologists, setDermatologists] = useState<Dermatologist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    const fetchDermatologists = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await dermatologistService.getDermatologistList();
        setDermatologists(data);
      } catch (err: any) {
        const errorMessage = err.message || "Error fetching dermatologist list";
        setError(errorMessage);
        Alert.alert("Error", errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDermatologists();
  }, []);

  const handlePressDermatologist = (id: string) => {
    router.push({
      pathname: "/(stacks)/DermatologistDetailScreen",
      params: { dermatologistId: id },
    });
  };

  const renderItem = ({ item }: { item: Dermatologist }) => {
    const fullName = item.user?.fullName || "Dermatologist";
    const specialties =
      item.specialization?.join(", ") || "Specialist in Dermatology";
    const avatarUrl = (item.user as any).photoUrl;

    return (
      <Pressable
        style={styles.itemContainer}
        onPress={() => handlePressDermatologist(item.dermatologistId)}
      >
        <Image
          style={styles.avatar}
          source={
            avatarUrl ? { uri: avatarUrl } : require("@/assets/images/icon.png")
          }
        />
        <View style={styles.textContainer}>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.specialty}>{specialties}</Text>
          <Text style={styles.experience}>
            {item.yearsOfExperience} years of experience
          </Text>
        </View>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
        <Text>Loading list...</Text>
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

  return (
    <View style={styles.container}>
      <FlatList
        data={dermatologists}
        renderItem={renderItem}
        keyExtractor={(item) => item.dermatologistId}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text>No Dermatologist founded</Text>
          </View>
        }
      />
    </View>
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
  itemContainer: {
    backgroundColor: "#ffffff",
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#e0e0e0",
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
  },
  specialty: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  experience: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
  },
});
