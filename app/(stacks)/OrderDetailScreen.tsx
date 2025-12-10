import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import orderService, { Order, OrderItem } from "@/services/orderService";
import tokenService from "@/services/tokenService";
import { useThemeColor } from "@/contexts/ThemeColorContext";
import reviewService from "@/services/reviewService";
import { useTranslation } from "react-i18next";

export default function OrderDetailScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { isAuthenticated, user } = useAuth();
  const { primaryColor } = useThemeColor();
  const { t } = useTranslation();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState(false); // To handle button loading state
  const [reviewEligibility, setReviewEligibility] = useState<
    Record<
      string,
      { canReview: boolean; hasReviewed: boolean; hasPurchased: boolean }
    >
  >({});

  useEffect(() => {
    if (orderId && isAuthenticated) {
      fetchOrderDetail();
    }
  }, [orderId, isAuthenticated]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (orderId && isAuthenticated && order) {
        if (order.status === "DELIVERED" || order.status === "COMPLETED") {
          checkReviewEligibility(order.orderItems);
        }
      }
    }, [orderId, isAuthenticated, order])
  );

  const fetchOrderDetail = async () => {
    if (!isAuthenticated || !orderId) {
      Alert.alert(t("orderDetail.error"), t("orderDetail.invalidInfo"));
      return;
    }

    try {
      setLoading(true);
      const token = await tokenService.getToken();
      if (!token) {
        Alert.alert(t("orderDetail.error"), t("orderDetail.loginToView"));
        return;
      }
      const data = await orderService.getOrderById(orderId, token);
      setOrder(data);

      if (data.status === "DELIVERED" || data.status === "COMPLETED") {
        await checkReviewEligibility(data.orderItems);
      }
    } catch (error: any) {
      console.error("Error fetching order detail:", error);
      Alert.alert(
        t("orderDetail.error"),
        error.message || t("orderDetail.unableLoad")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOrder = () => {
    Alert.alert(
      t("orderDetail.confirmReceipt"),
      t("orderDetail.confirmMessage"),
      [
        { text: t("orderDetail.cancel"), style: "cancel" },
        {
          text: t("orderDetail.yesReceived"),
          onPress: async () => {
            try {
              setProcessingAction(true);
              const token = await tokenService.getToken();

              if (!token || !order) return;

              // Call the service method (ensure this method exists in your orderService)
              const updatedOrder = await orderService.confirmCompleteOrder(
                order.orderId,
                token
              );

              setOrder(updatedOrder);
              Alert.alert(
                t("orderDetail.success"),
                t("orderDetail.orderCompleted")
              );

              // Refresh review eligibility based on new status
              checkReviewEligibility(updatedOrder.orderItems);
            } catch (error: any) {
              Alert.alert(
                t("orderDetail.error"),
                error.message || t("orderDetail.failedComplete")
              );
            } finally {
              setProcessingAction(false);
            }
          },
        },
      ]
    );
  };

  const checkReviewEligibility = async (orderItems: OrderItem[]) => {
    const eligibilityMap: Record<
      string,
      { canReview: boolean; hasReviewed: boolean; hasPurchased: boolean }
    > = {};

    try {
      if (!user) return;

      const eligibilityPromises = orderItems.map(async (item) => {
        try {
          const reviews = await reviewService.getProductReviews(
            item.product.productId
          );
          const userReview = reviews.find(
            (review) => review.userId === user.userId
          );
          const hasReviewed = !!userReview;
          const hasPurchased = true;
          const canReview = !hasReviewed;

          return {
            productId: item.product.productId,
            eligibility: { canReview, hasReviewed, hasPurchased },
          };
        } catch (error) {
          console.error(
            `Error checking eligibility for product ${item.product.productId}:`,
            error
          );
          return {
            productId: item.product.productId,
            eligibility: {
              canReview: true,
              hasReviewed: false,
              hasPurchased: true,
            },
          };
        }
      });

      const results = await Promise.all(eligibilityPromises);
      results.forEach(({ productId, eligibility }) => {
        eligibilityMap[productId] = eligibility;
      });

      setReviewEligibility(eligibilityMap);
    } catch (error) {
      console.error("Error checking review eligibility:", error);
    }
  };

  const renderOrderItem = (item: OrderItem) => {
    const itemTotal = parseFloat(item.priceAtTime) * item.quantity;
    const isCompleted =
      order?.status === "COMPLETED" || order?.status === "DELIVERED";
    const eligibility = reviewEligibility[item.product.productId];

    // Only allow review if order is effectively delivered/completed and user hasn't reviewed yet
    const canShowReviewButton =
      isCompleted &&
      eligibility?.canReview &&
      eligibility?.hasPurchased &&
      !eligibility?.hasReviewed;

    const handleProductPress = () => {
      router.push({
        pathname: "/(stacks)/ProductDetailScreen",
        params: { productId: item.product.productId },
      });
    };

    const handleReviewPress = (e: any) => {
      e.stopPropagation();
      router.push({
        pathname: "/(stacks)/CreateReviewScreen",
        params: {
          productId: item.product.productId,
          orderId: order?.orderId,
        },
      });
    };

    return (
      <TouchableOpacity
        key={item.orderItemId}
        style={styles.orderItemCard}
        onPress={handleProductPress}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.product.productImages[0] }}
          style={styles.orderItemImage}
        />
        <View style={styles.orderItemInfo}>
          <Text style={styles.orderItemName} numberOfLines={2}>
            {item.product.productName}
          </Text>
          <Text style={styles.orderItemBrand}>{item.product.brand}</Text>
          <View style={styles.orderItemPriceRow}>
            <Text style={[styles.orderItemPrice, { color: primaryColor }]}>
              {orderService.formatCurrency(parseFloat(item.priceAtTime))}
            </Text>
            <Text style={styles.orderItemQuantity}>x{item.quantity}</Text>
          </View>

          {/* Review Button */}
          {canShowReviewButton && (
            <TouchableOpacity
              style={[styles.reviewButton, { borderColor: primaryColor }]}
              onPress={handleReviewPress}
            >
              <Ionicons name="star-outline" size={16} color={primaryColor} />
              <Text style={[styles.reviewButtonText, { color: primaryColor }]}>
                {t("orderDetail.writeReview")}
              </Text>
            </TouchableOpacity>
          )}

          {/* Reviewed Indicator */}
          {isCompleted && eligibility?.hasReviewed && (
            <View style={styles.reviewedIndicator}>
              <Ionicons name="checkmark-circle" size={16} color="#34C759" />
              <Text style={styles.reviewedText}>
                {t("orderDetail.reviewed")}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.orderItemTotal}>
          <Text style={styles.orderItemTotalText}>
            {orderService.formatCurrency(itemTotal)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={styles.loadingText}>
          {t("orderDetail.loadingDetails")}
        </Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={80} color="#ccc" />
        <Text style={styles.errorText}>{t("orderDetail.orderNotFound")}</Text>
        <TouchableOpacity
          style={[styles.backToListButton, { backgroundColor: primaryColor }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backToListButtonText}>
            {t("orderDetail.goBack")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalAmount = orderService.calculateOrderTotal(order.orderItems); // Subtotal
  const shippingFee =
    order.shippingLogs?.find((log) => log.shippingFee)?.shippingFee || "0"; // Extract shipping fee
  const totalWithShipping = totalAmount + parseFloat(shippingFee); // Total including shipping

  // Determine icon based on status
  let statusIconName: keyof typeof Ionicons.glyphMap = "time";
  if (order.status === "DELIVERED") statusIconName = "cube";
  else if (order.status === "COMPLETED")
    statusIconName = "checkmark-done-circle";
  else if (order.status === "CANCELLED" || order.status === "REJECTED")
    statusIconName = "close-circle";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("orderDetail.orderDetails")}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.trackingButton}
            onPress={() =>
              router.push({
                pathname: "/(stacks)/ShippingTrackingScreen",
                params: { orderId: order.orderId },
              } as any)
            }
          >
            <Ionicons name="cube-outline" size={24} color={primaryColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.trackingButton}
            onPress={() =>
              router.push({
                pathname: "/(stacks)/OrderTrackingScreen",
                params: { orderId: order.orderId },
              } as any)
            }
          >
            <Ionicons name="map-outline" size={24} color={primaryColor} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Status Section */}
        <View style={styles.section}>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusIconContainer,
                {
                  backgroundColor:
                    orderService.getStatusColor(order.status) + "20",
                },
              ]}
            >
              <Ionicons
                name={statusIconName}
                size={40}
                color={orderService.getStatusColor(order.status)}
              />
            </View>
            <Text style={styles.statusTitle}>
              {t("orders." + order.status.toLowerCase())}
            </Text>
            {order.rejectionReason && (
              <View style={styles.rejectionBox}>
                <Ionicons name="warning" size={20} color="#F44336" />
                <Text style={styles.rejectionText}>
                  {order.rejectionReason}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Order Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#333"
            />
            <Text style={styles.sectionTitle}>
              {t("orderDetail.orderInformation")}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("orderDetail.orderId")}</Text>
            <Text style={styles.infoValue}>
              #{order.orderId.slice(0, 8).toUpperCase()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("orderDetail.orderDate")}</Text>
            <Text style={styles.infoValue}>
              {orderService.formatDate(order.createdAt)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("orderDetail.lastUpdated")}</Text>
            <Text style={styles.infoValue}>
              {orderService.formatDate(order.updatedAt)}
            </Text>
          </View>
        </View>

        {/* Shipping Address Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={20} color="#333" />
            <Text style={styles.sectionTitle}>
              {t("orderDetail.shippingAddress")}
            </Text>
          </View>
          <Text style={styles.addressText}>{order.shippingAddress}</Text>
          {order.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>{t("orderDetail.notes")}</Text>
              <Text style={styles.notesText}>{order.notes}</Text>
            </View>
          )}
        </View>

        {/* Customer Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color="#333" />
            <Text style={styles.sectionTitle}>
              {t("orderDetail.customerInformation")}
            </Text>
          </View>
          <View style={styles.customerInfo}>
            {order.customer.user.photoUrl ? (
              <Image
                source={{ uri: order.customer.user.photoUrl }}
                style={styles.customerAvatar}
              />
            ) : (
              <View
                style={[
                  styles.customerAvatar,
                  { justifyContent: "center", alignItems: "center" },
                ]}
              >
                <Ionicons name="person" size={30} color="#999" />
              </View>
            )}
            <View style={styles.customerDetails}>
              <Text style={styles.customerName}>
                {order.customer.user.fullName}
              </Text>
              <Text style={styles.customerContact}>
                {order.customer.user.email}
              </Text>
              <Text style={styles.customerContact}>
                {order.customer.user.phone}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Items Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cart-outline" size={20} color="#333" />
            <Text style={styles.sectionTitle}>
              {t("orderDetail.products", { count: order.orderItems.length })}
            </Text>
          </View>
          {order.orderItems.map(renderOrderItem)}
        </View>

        {/* Order Summary Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="receipt-outline" size={20} color="#333" />
            <Text style={styles.sectionTitle}>
              {t("orderDetail.orderSummary")}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("orderDetail.subtotal")}</Text>
            <Text style={styles.summaryValue}>
              {orderService.formatCurrency(totalAmount)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>{t("orderDetail.total")}</Text>
            <Text style={[styles.totalValue, { color: primaryColor }]}>
              {orderService.formatCurrency(order.payment.amount)}
            </Text>
          </View>
        </View>

        {/* Payment Info Section */}
        {order.payment && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="card-outline" size={20} color="#333" />
              <Text style={styles.sectionTitle}>
                {t("orderDetail.paymentInformation")}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t("orderDetail.method")}</Text>
              <Text style={styles.infoValue}>
                {orderService.getPaymentMethodLabel(
                  order.payment.paymentMethod
                )}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t("orderDetail.total")}</Text>
              <Text style={styles.infoValue}>
                {orderService.formatCurrency(parseFloat(order.payment.amount))}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t("orderDetail.status")}</Text>
              <Text
                style={[
                  styles.infoValue,
                  {
                    color:
                      order.payment.status === "PAID" ? "#4CAF50" : "#FFA500",
                  },
                ]}
              >
                {order.payment.status === "PAID"
                  ? t("orderDetail.paid")
                  : t("orderDetail.unpaid")}
              </Text>
            </View>
          </View>
        )}

        {/* COMPLETE ORDER BUTTON SECTION */}
        {/* Only rendered when status is DELIVERED */}
        {order.status === "DELIVERED" && (
          <View style={styles.actionContainer}>
            <View style={styles.completeInfoBox}>
              <Ionicons name="gift-outline" size={24} color={primaryColor} />
              <Text style={styles.completeInfoText}>
                {t("orderDetail.packageDelivered")}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.completeButton,
                {
                  backgroundColor: primaryColor,
                  opacity: processingAction ? 0.7 : 1,
                },
              ]}
              onPress={handleCompleteOrder}
              disabled={processingAction}
              activeOpacity={0.8}
            >
              {processingAction ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.completeButtonText}>
                  {t("orderDetail.receivedCompleteOrder")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  trackingButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: "#fff",
    marginBottom: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 8,
  },
  statusContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  statusIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  rejectionBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    width: "100%",
  },
  rejectionText: {
    flex: 1,
    fontSize: 14,
    color: "#F44336",
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  addressText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 22,
  },
  notesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#FFF9E6",
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: "#333",
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  customerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f0f0f0",
    marginRight: 12,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  customerContact: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  orderItemCard: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  orderItemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  orderItemInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  orderItemBrand: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  orderItemPriceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: "600",
  },
  orderItemQuantity: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  orderItemTotal: {
    justifyContent: "center",
    alignItems: "flex-end",
    marginLeft: 8,
  },
  orderItemTotalText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  reviewButtonText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  reviewedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  reviewedText: {
    fontSize: 12,
    color: "#34C759",
    fontWeight: "600",
    marginLeft: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
  },
  summaryValue: {
    fontSize: 14,
    color: "#333",
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#999",
    marginBottom: 24,
  },
  backToListButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backToListButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  // NEW STYLES FOR ACTION SECTION
  actionContainer: {
    padding: 16,
    backgroundColor: "#fff",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  completeInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  completeInfoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  completeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
