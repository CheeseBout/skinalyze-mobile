import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useOrderTrackingWebSocket } from '@/hooks/useOrderTrackingWebSocket';
import trackingService from '@/services/trackingService';
import GoongMap from '@/components/GoongMap';

// Simple time ago formatter
const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds} giây trước`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
};

export default function OrderTrackingScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const {
    trackingData,
    isLoading,
    error,
    lastUpdate,
    refresh,
    shouldTrack,
    isConnected,
    isLocationStale,
  } = useOrderTrackingWebSocket({
    orderId: orderId || '',
    enabled: !!orderId && isAuthenticated,
    onLocationUpdate: (location) => {
      console.log('📍 Shipper moved to:', location);
    },
    onETAUpdate: (eta) => {
      console.log('⏱️ ETA updated:', eta.text);
      
      // Show notification if shipper is very close (< 5 minutes)
      if (eta.duration < 300 && eta.duration > 0) {
        // Could trigger a local notification here
        console.log('🔔 Shipper sắp đến!');
      }
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleCallShipper = () => {
    if (!trackingData?.shipper) return;

    Alert.alert(
      'Gọi cho shipper',
      `Bạn có muốn gọi cho ${trackingData.shipper.fullName}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gọi',
          onPress: () => {
            const phoneNumber = trackingData.shipper!.phone;
            Linking.openURL(`tel:${phoneNumber}`);
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Theo dõi đơn hàng</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Đang tải thông tin tracking...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Theo dõi đơn hàng</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="time-outline" size={80} color="#FF9800" />
          <Text style={styles.errorTitle}>Đơn hàng đang được xử lý</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Kiểm tra lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!trackingData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Theo dõi đơn hàng</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="time-outline" size={80} color="#ccc" />
          <Text style={styles.errorTitle}>Đơn hàng đang được xử lý</Text>
          <Text style={styles.errorText}>Shipper sẽ bắt đầu giao hàng sớm. Vui lòng kiểm tra lại sau.</Text>
        </View>
      </View>
    );
  }

  const { shippingLog, shipper, customer, currentLocation, eta } = trackingData;
  const statusColor = trackingService.getStatusColor(shippingLog.status);
  const statusLabel = trackingService.getStatusLabel(shippingLog.status);

  // Debug log for map data
  console.log('🗺️ Map data:', {
    currentLocation,
    customerLocation: customer?.location,
    customerAddress: customer?.address,
  });

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
        <Text style={styles.headerTitle}>Theo dõi đơn hàng</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={refresh}>
          <Ionicons name="refresh" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View
            style={[
              styles.statusIconContainer,
              { backgroundColor: statusColor + '20' },
            ]}
          >
            <Ionicons
              name={
                shippingLog.status === 'DELIVERED'
                  ? 'checkmark-circle'
                  : shippingLog.status === 'OUT_FOR_DELIVERY'
                  ? 'bicycle'
                  : 'time'
              }
              size={40}
              color={statusColor}
            />
          </View>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
          {lastUpdate && (
            <Text style={styles.lastUpdateText}>
              Cập nhật {formatTimeAgo(lastUpdate)}
            </Text>
          )}
        </View>

        {/* Goong Map */}
        {isLocationStale && (
          <View style={styles.staleBanner}>
            <Text style={styles.staleText}>
              ⚠️ Vị trí shipper chưa cập nhật trong 5 phút. Vui lòng kiểm tra lại sau hoặc gọi shipper.
            </Text>
          </View>
        )}

        <View style={styles.mapContainer}>
          <GoongMap
            shipperLocation={currentLocation}
            customerLocation={customer?.location || null}
            style={styles.map}
          />
        </View>

        {/* Shipper Info */}
        {shipper && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={20} color="#333" />
              <Text style={styles.sectionTitle}>Thông tin shipper</Text>
            </View>
            <View style={styles.shipperCard}>
              <View style={styles.shipperInfo}>
                <View style={styles.shipperAvatar}>
                  <Ionicons name="person" size={30} color="#fff" />
                </View>
                <View style={styles.shipperDetails}>
                  <Text style={styles.shipperName}>{shipper.fullName}</Text>
                  <Text style={styles.shipperPhone}>{shipper.phone}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.callButton}
                onPress={handleCallShipper}
              >
                <Ionicons name="call" size={20} color="#fff" />
                <Text style={styles.callButtonText}>Gọi</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ETA Info */}
        {eta && currentLocation && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={20} color="#333" />
              <Text style={styles.sectionTitle}>Thời gian dự kiến</Text>
            </View>
            <View style={styles.etaCard}>
              <View style={styles.etaRow}>
                <View style={styles.etaItem}>
                  <Ionicons name="speedometer-outline" size={24} color="#4CAF50" />
                  <Text style={styles.etaLabel}>Thời gian</Text>
                  <Text style={styles.etaValue}>{eta.text}</Text>
                </View>
                <View style={styles.etaItem}>
                  <Ionicons name="navigate-outline" size={24} color="#2196F3" />
                  <Text style={styles.etaLabel}>Khoảng cách</Text>
                  <Text style={styles.etaValue}>
                    {trackingService.formatDistance(eta.distance)}
                  </Text>
                </View>
              </View>
              {currentLocation.timestamp && (
                <Text style={styles.locationTimestamp}>
                  Vị trí cập nhật {formatTimeAgo(new Date(currentLocation.timestamp))}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* No Location Warning */}
        {shipper && !currentLocation && (
          <View style={styles.warningCard}>
            <Ionicons name="information-circle-outline" size={24} color="#FF9800" />
            <Text style={styles.warningText}>
              Shipper đang chuẩn bị giao hàng. Thông tin vị trí sẽ được cập nhật sớm.
            </Text>
          </View>
        )}

        {/* Delivery Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={20} color="#333" />
            <Text style={styles.sectionTitle}>Địa chỉ giao hàng</Text>
          </View>
          <View style={styles.addressCard}>
            <Text style={styles.addressText}>{customer.address}</Text>
            <View style={styles.coordinatesRow}>
              <Text style={styles.coordinatesText}>
                📍 {customer.location.lat.toFixed(6)}, {customer.location.lng.toFixed(6)}
              </Text>
            </View>
          </View>
        </View>

        {/* Estimated Delivery */}
        {shippingLog.estimatedDeliveryDate && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar-outline" size={20} color="#333" />
              <Text style={styles.sectionTitle}>Dự kiến giao hàng</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                {new Date(shippingLog.estimatedDeliveryDate).toLocaleString('vi-VN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        )}

        {/* Auto-refresh indicator */}
        {/* {shouldTrack && (
          <View style={styles.autoRefreshBanner}>
            <View style={styles.connectionStatus}>
              <View style={[styles.connectionDot, isConnected ? styles.connected : styles.disconnected]} />
              <Text style={styles.autoRefreshText}>
                {isConnected ? '🔗 Kết nối real-time' : '⏸️ Đang kết nối lại...'}
              </Text>
            </View>
          </View>
        )} */}
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
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    padding: 20,
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  retryButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statusCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  statusIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#999',
  },
  mapContainer: {
    height: 300,
    backgroundColor: '#E8F5E9',
    marginBottom: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  staleBanner: {
    backgroundColor: '#FFF3E0',
    padding: 10,
    marginBottom: 8,
    borderRadius: 8,
  },
  staleText: {
    color: '#E65100',
    fontSize: 14,
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
  shipperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shipperInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shipperAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shipperDetails: {
    marginLeft: 12,
    flex: 1,
  },
  shipperName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  shipperPhone: {
    fontSize: 14,
    color: '#666',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  callButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  etaCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
  },
  etaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  etaItem: {
    alignItems: 'center',
  },
  etaLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  etaValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  locationTimestamp: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    padding: 16,
    marginBottom: 12,
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#FF9800',
  },
  addressCard: {
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginBottom: 8,
  },
  coordinatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coordinatesText: {
    fontSize: 12,
    color: '#999',
  },
  infoCard: {
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
  },
  autoRefreshBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#E8F5E9',
    marginTop: 8,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  connected: {
    backgroundColor: '#4CAF50',
  },
  disconnected: {
    backgroundColor: '#FF9800',
  },
  autoRefreshText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
});
