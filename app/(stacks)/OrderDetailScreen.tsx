import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import orderService, { Order, OrderItem } from '@/services/orderService';
import tokenService from '@/services/tokenService';

export default function OrderDetailScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { isAuthenticated } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId && isAuthenticated) {
      fetchOrderDetail();
    }
  }, [orderId, isAuthenticated]);

  const fetchOrderDetail = async () => {
    if (!isAuthenticated || !orderId) {
      Alert.alert('Lỗi', 'Thông tin không hợp lệ');
      return;
    }

    try {
      setLoading(true);
      const token = await tokenService.getToken();
      if (!token) {
        Alert.alert('Lỗi', 'Vui lòng đăng nhập để xem chi tiết đơn hàng');
        return;
      }
      const data = await orderService.getOrderById(orderId, token);
      setOrder(data);
    } catch (error: any) {
      console.error('Error fetching order detail:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải chi tiết đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const renderOrderItem = (item: OrderItem) => {
    const itemTotal = parseFloat(item.priceAtTime) * item.quantity;

    return (
      <View key={item.orderItemId} style={styles.orderItemCard}>
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
            <Text style={styles.orderItemPrice}>
              {orderService.formatCurrency(parseFloat(item.priceAtTime))}
            </Text>
            <Text style={styles.orderItemQuantity}>x{item.quantity}</Text>
          </View>
        </View>
        <View style={styles.orderItemTotal}>
          <Text style={styles.orderItemTotalText}>
            {orderService.formatCurrency(itemTotal)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Đang tải chi tiết đơn hàng...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={80} color="#ccc" />
        <Text style={styles.errorText}>Không tìm thấy đơn hàng</Text>
        <TouchableOpacity
          style={styles.backToListButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backToListButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalAmount = orderService.calculateOrderTotal(order.orderItems);
  const totalItems = orderService.calculateTotalItems(order.orderItems);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
        <TouchableOpacity
          style={styles.trackingButton}
          onPress={() => router.push({
            pathname: '/(stacks)/OrderTrackingScreen',
            params: { orderId: order.orderId }
          } as any)}
        >
          <Ionicons name="location" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Status Section */}
        <View style={styles.section}>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusIconContainer,
                { backgroundColor: orderService.getStatusColor(order.status) + '20' },
              ]}
            >
              <Ionicons
                name={
                  order.status === 'DELIVERED'
                    ? 'checkmark-circle'
                    : order.status === 'CANCELLED' || order.status === 'REJECTED'
                    ? 'close-circle'
                    : 'time'
                }
                size={40}
                color={orderService.getStatusColor(order.status)}
              />
            </View>
            <Text style={styles.statusTitle}>
              {orderService.getStatusLabel(order.status)}
            </Text>
            {order.rejectionReason && (
              <View style={styles.rejectionBox}>
                <Ionicons name="warning" size={20} color="#F44336" />
                <Text style={styles.rejectionText}>{order.rejectionReason}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Order Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={20} color="#333" />
            <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mã đơn hàng:</Text>
            <Text style={styles.infoValue}>#{order.orderId.slice(0, 8)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ngày đặt:</Text>
            <Text style={styles.infoValue}>
              {orderService.formatDate(order.createdAt)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cập nhật:</Text>
            <Text style={styles.infoValue}>
              {orderService.formatDate(order.updatedAt)}
            </Text>
          </View>
        </View>

        {/* Shipping Address Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={20} color="#333" />
            <Text style={styles.sectionTitle}>Địa chỉ giao hàng</Text>
          </View>
          <Text style={styles.addressText}>{order.shippingAddress}</Text>
          {order.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Ghi chú:</Text>
              <Text style={styles.notesText}>{order.notes}</Text>
            </View>
          )}
        </View>

        {/* Customer Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color="#333" />
            <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>
          </View>
          <View style={styles.customerInfo}>
            {order.customer.user.photoUrl && (
              <Image
                source={{ uri: order.customer.user.photoUrl }}
                style={styles.customerAvatar}
              />
            )}
            <View style={styles.customerDetails}>
              <Text style={styles.customerName}>{order.customer.user.fullName}</Text>
              <Text style={styles.customerContact}>{order.customer.user.email}</Text>
              <Text style={styles.customerContact}>{order.customer.user.phone}</Text>
            </View>
          </View>
        </View>

        {/* Order Items Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cart-outline" size={20} color="#333" />
            <Text style={styles.sectionTitle}>Sản phẩm ({totalItems})</Text>
          </View>
          {order.orderItems.map(renderOrderItem)}
        </View>

        {/* Order Summary Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="receipt-outline" size={20} color="#333" />
            <Text style={styles.sectionTitle}>Tổng cộng</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tạm tính:</Text>
            <Text style={styles.summaryValue}>
              {orderService.formatCurrency(totalAmount)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Phí vận chuyển:</Text>
            <Text style={styles.summaryValue}>Miễn phí</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Tổng cộng:</Text>
            <Text style={styles.totalValue}>
              {orderService.formatCurrency(totalAmount)}
            </Text>
          </View>
        </View>

        {/* Payment Info Section */}
        {order.payment && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="card-outline" size={20} color="#333" />
              <Text style={styles.sectionTitle}>Thông tin thanh toán</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phương thức:</Text>
              <Text style={styles.infoValue}>
                {order.payment.method || 'Chưa xác định'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trạng thái:</Text>
              <Text style={styles.infoValue}>
                {order.payment.status || 'Chưa thanh toán'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  trackingButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  statusIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  rejectionText: {
    flex: 1,
    fontSize: 14,
    color: '#F44336',
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  notesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    marginRight: 12,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  customerContact: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  orderItemCard: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderItemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  orderItemInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  orderItemBrand: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  orderItemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  orderItemQuantity: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  orderItemTotal: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  orderItemTotalText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    marginBottom: 24,
  },
  backToListButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  backToListButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
