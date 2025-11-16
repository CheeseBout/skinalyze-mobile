import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TextInput,
  Pressable,
  Alert,
  Image,
} from "react-native";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import dermatologistService from "@/services/dermatologistService";
import { Dermatologist } from "@/types/dermatologist.type";
import subscriptionPlanService from "@/services/subscriptionPlanService";
import {
  SubscriptionPlan,
  FindSubscriptionPlansDto,
  SubscriptionPlanSortBy,
} from "@/types/subscription-plan.type";

const PlanCard = React.memo(
  ({ plan, onPress }: { plan: SubscriptionPlan; onPress: () => void }) => (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.planName}>{plan.planName}</Text>
        <Text style={styles.planPrice}>
          {Number(plan.basePrice).toLocaleString("vi-VN")} VND
        </Text>
      </View>
      <Text style={styles.planDescription} numberOfLines={2}>
        {plan.planDescription || "No description provided."}
      </Text>
      <View style={styles.cardDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={16} color="#007bff" />
          <Text style={styles.detailText}>{plan.totalSessions} Sessions</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={16} color="#007bff" />
          <Text style={styles.detailText}>{plan.durationInDays} Days</Text>
        </View>
      </View>
    </Pressable>
  )
);

export default function SubscriptionPlanListScreen() {
  const router = useRouter();
  const { dermatologistId } = useLocalSearchParams<{
    dermatologistId: string;
    doctorName?: string;
  }>();

  const [doctor, setDoctor] = useState<Dermatologist | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHeader, setIsLoadingHeader] = useState(true);

  const defaultFilters: FindSubscriptionPlansDto = {
    dermatologistId: dermatologistId,
    isActive: "true",
    sortBy: SubscriptionPlanSortBy.BASE_PRICE,
    sortOrder: "ASC",
    search: "",
  };

  const [inputFilters, setInputFilters] =
    useState<FindSubscriptionPlansDto>(defaultFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<FindSubscriptionPlansDto>(defaultFilters);

  const debounceTimer = useRef<number | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        setIsLoadingHeader(true);

        const [doctorData, plansData] = await Promise.all([
          dermatologistService.getDermatologistById(dermatologistId),
          subscriptionPlanService.findPlans(defaultFilters),
        ]);

        setDoctor(doctorData);
        setPlans(plansData);
      } catch (error) {
        Alert.alert("Error", "Failed to load page data.");
      } finally {
        setIsLoading(false);
        setIsLoadingHeader(false);
        isInitialMount.current = false;
      }
    };

    loadInitialData();
  }, [dermatologistId]);

  useEffect(() => {
    if (isInitialMount.current) {
      return;
    }

    const fetchFilteredPlans = async () => {
      try {
        setIsLoading(true);

        const cleanFilters: FindSubscriptionPlansDto = {
          dermatologistId: appliedFilters.dermatologistId,
          isActive: appliedFilters.isActive,
          sortBy: appliedFilters.sortBy,
          sortOrder: appliedFilters.sortOrder,
        };
        if (appliedFilters.search) cleanFilters.search = appliedFilters.search;
        if (appliedFilters.minPrice)
          cleanFilters.minPrice = appliedFilters.minPrice;
        if (appliedFilters.maxPrice)
          cleanFilters.maxPrice = appliedFilters.maxPrice;

        const data = await subscriptionPlanService.findPlans(cleanFilters);
        setPlans(data);
      } catch (error) {
        Alert.alert("Error", "Failed to load subscription plans.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilteredPlans();
  }, [appliedFilters]);

  //  Debounce for Search Input
  useEffect(() => {
    if (isInitialMount.current) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setAppliedFilters((prev) => ({
        ...prev,
        search: inputFilters.search,
      }));
    }, 500); // (500ms)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [inputFilters.search]); //Listen search input

  const handleFilterChange = (
    key: keyof FindSubscriptionPlansDto,
    value: string | "ASC" | "DESC" | SubscriptionPlanSortBy
  ) => {
    setInputFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    setAppliedFilters(inputFilters);
  };

  const toggleSortOrder = () => {
    const newOrder = inputFilters.sortOrder === "ASC" ? "DESC" : "ASC";
    handleFilterChange("sortOrder", newOrder);
  };

  return (
    <View style={styles.container}>
      {/* Dermatologist Information  */}
      {isLoadingHeader ? (
        <View style={styles.doctorHeaderPlaceholder}>
          <ActivityIndicator />
        </View>
      ) : (
        doctor && (
          <View style={styles.doctorHeader}>
            <Image
              style={styles.doctorAvatar}
              source={
                doctor.user?.photoUrl &&
                doctor.user.photoUrl.startsWith("data:")
                  ? { uri: doctor.user.photoUrl }
                  : require("@/assets/images/icon.png")
              }
            />
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>{doctor.user?.fullName}</Text>
              <Text style={styles.doctorSpec}>Dermatology Specialist</Text>
            </View>
          </View>
        )
      )}

      <FlatList
        data={plans}
        keyExtractor={(item) => item.planId}
        renderItem={({ item }) => (
          <PlanCard
            plan={item}
            onPress={() =>
              router.push({
                pathname: "/(stacks)/SubscriptionPlanDetailScreen",
                params: { planId: item.planId },
              })
            }
          />
        )}
        // FILTERS
        ListHeaderComponent={
          <View style={styles.filterContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by plan name (auto-applies)..."
              value={inputFilters.search}
              onChangeText={(text) => handleFilterChange("search", text)}
            />
            <View style={styles.priceRow}>
              <TextInput
                style={styles.priceInput}
                placeholder="Min Price"
                value={String(inputFilters.minPrice || "")}
                onChangeText={(text) => handleFilterChange("minPrice", text)}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.priceInput}
                placeholder="Max Price"
                value={String(inputFilters.maxPrice || "")}
                onChangeText={(text) => handleFilterChange("maxPrice", text)}
                keyboardType="numeric"
              />
            </View>

            {/* SortBy */}
            <View style={styles.sortRow}>
              <Picker
                selectedValue={inputFilters.sortBy}
                onValueChange={(itemValue) =>
                  handleFilterChange("sortBy", itemValue)
                }
                style={styles.picker}
              >
                <Picker.Item
                  label="Sort by Price"
                  value={SubscriptionPlanSortBy.BASE_PRICE}
                />
                <Picker.Item
                  label="Sort by Name"
                  value={SubscriptionPlanSortBy.PLAN_NAME}
                />
                <Picker.Item
                  label="Sort by Sessions"
                  value={SubscriptionPlanSortBy.TOTAL_SESSIONS}
                />
              </Picker>

              {/*ASC/DESC */}
              <Pressable
                style={styles.sortOrderButton}
                onPress={toggleSortOrder}
              >
                <MaterialCommunityIcons
                  name={
                    inputFilters.sortOrder === "ASC"
                      ? "arrow-up-thin"
                      : "arrow-down-thin"
                  }
                  size={24}
                  color="#007bff"
                />
              </Pressable>
            </View>

            <Pressable style={styles.applyButton} onPress={handleApplyFilters}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </Pressable>
          </View>
        }
        ListFooterComponent={
          isLoading ? (
            <ActivityIndicator size="large" style={{ marginVertical: 20 }} />
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.emptyText}>
              No plans found matching your criteria.
            </Text>
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5ff" },
  doctorHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  doctorHeaderPlaceholder: {
    height: 82,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
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
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  doctorSpec: {
    fontSize: 14,
    color: "#666",
  },
  filterContainer: {
    padding: 16,
    backgroundColor: "#fff",
    marginVertical: 16,
    borderRadius: 12,
  },
  searchInput: {
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  priceInput: {
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  picker: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    flex: 1,
  },
  sortOrderButton: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    marginLeft: 10,
  },
  applyButton: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  applyButtonText: { color: "#fff", fontWeight: "bold" },
  listContent: { paddingHorizontal: 16 },
  emptyText: { textAlign: "center", marginTop: 20, color: "#666" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planName: { fontSize: 18, fontWeight: "bold", flex: 1, color: "#333" },
  planPrice: { fontSize: 16, fontWeight: "bold", color: "#007bff" },
  planDescription: { fontSize: 14, color: "#666", marginVertical: 8 },
  cardDetails: {
    flexDirection: "row",
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
  },
  detailItem: { flexDirection: "row", alignItems: "center", marginRight: 16 },
  detailText: { marginLeft: 4, color: "#333" },
});
