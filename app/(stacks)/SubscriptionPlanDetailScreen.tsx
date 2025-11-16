import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import subscriptionPlanService from "@/services/subscriptionPlanService";
import SubscriptionPaymentModal from "@/components/SubscriptionPaymentModal";

import { SubscriptionPlan } from "@/types/subscription-plan.type";
import customerSubscriptionService, {
  SubscriptionPaymentResponse,
} from "@/services/customerSubscriptionService";

export default function SubscriptionPlanDetailScreen() {
  const router = useRouter();
  const { planId } = useLocalSearchParams<{ planId: string }>();

  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [paymentData, setPaymentData] =
    useState<SubscriptionPaymentResponse | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

  useEffect(() => {
    if (!planId) {
      setError("No Plan ID provided.");
      setIsLoading(false);
      return;
    }
    const fetchPlan = async () => {
      try {
        setIsLoading(true);

        const data = await subscriptionPlanService.getPlanById(planId);
        setPlan(data);
      } catch (err) {
        setError("Failed to load plan details.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlan();
  }, [planId]);

  const handleBuyPlan = async () => {
    if (!planId) return;

    setIsCreatingPayment(true);
    try {
      const response =
        await customerSubscriptionService.createSubscriptionPayment(planId);

      setPaymentData(response);
      setIsModalVisible(true);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Could not start payment.");
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handleModalClose = (didPay: boolean) => {
    setIsModalVisible(false);
    setPaymentData(null);
    if (didPay) {
      router.back();
    }
  };

  if (isLoading) {
    return <ActivityIndicator size="large" style={styles.center} />;
  }
  if (error || !plan) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "Plan not found."}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Ionicons name="shield-checkmark-outline" size={50} color="#007bff" />
          <Text style={styles.planName}>{plan.planName}</Text>
          <Text style={styles.planPrice}>
            {Number(plan.basePrice).toLocaleString("vi-VN")} VND
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Plan Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total Sessions:</Text>
            <Text style={styles.value}>{plan.totalSessions}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Duration:</Text>
            <Text style={styles.value}>{plan.durationInDays} days</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.label}>Description:</Text>
          <Text style={styles.description}>{plan.planDescription}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[
            styles.buyButton,
            isCreatingPayment && styles.buyButtonDisabled,
          ]}
          onPress={handleBuyPlan}
          disabled={isCreatingPayment}
        >
          {isCreatingPayment ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buyButtonText}>Buy This Plan</Text>
          )}
        </Pressable>
      </View>

      <SubscriptionPaymentModal
        visible={isModalVisible}
        onClose={handleModalClose}
        paymentData={paymentData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5ff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: "red", fontSize: 16 },
  header: {
    backgroundColor: "#fff",
    padding: 24,
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  planName: { fontSize: 24, fontWeight: "bold", marginTop: 10 },
  planPrice: {
    fontSize: 22,
    fontWeight: "600",
    color: "#007bff",
    marginTop: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    margin: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  label: { fontSize: 16, color: "#666" },
  value: { fontSize: 16, fontWeight: "bold" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 8 },
  description: { fontSize: 15, color: "#333", lineHeight: 22, marginTop: 4 },
  footer: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e0e0e0",
  },
  buyButton: {
    backgroundColor: "#28a745",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buyButtonDisabled: {
    backgroundColor: "#aaa",
  },
  buyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
