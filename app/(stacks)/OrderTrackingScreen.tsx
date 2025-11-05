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
  const [isInfoExpanded, setIsInfoExpanded] = useState(true);
  const [isShipperExpanded, setIsShipperExpanded] = useState(false);

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
        <View style={styles.headerOverlay}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
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
        <View style={styles.headerOverlay}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
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
        <View style={styles.headerOverlay}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
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
    hasPolyline: !!eta?.polyline,
  });

  return (
    <View style={styles.container}>
      {/* Full Screen Map */}
      <View style={styles.fullScreenMap}>
        <GoongMap
          shipperLocation={currentLocation}
          customerLocation={customer?.location || null}
          polyline={eta?.polyline || null}
          style={styles.map}
        />
      </View>

      {/* Header Overlay */}
      <View style={styles.headerOverlay}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Theo dõi đơn hàng</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={refresh}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Floating Status & Info Card */}
      <View style={styles.floatingCard}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setIsInfoExpanded(!isInfoExpanded)}
          style={styles.cardHeader}
        >
          <View style={styles.cardHeaderLeft}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusColor },
              ]}
            />
            <View>
              <Text style={styles.cardTitle}>{statusLabel}</Text>
              {lastUpdate && (
                <Text style={styles.cardSubtitle}>
                  {formatTimeAgo(lastUpdate)}
                </Text>
              )}
            </View>
          </View>
          <Ionicons
            name={isInfoExpanded ? 'chevron-down' : 'chevron-up'}
            size={24}
            color="#666"
          />
        </TouchableOpacity>

        {isInfoExpanded && (
          <View style={styles.cardContent}>
            {isLocationStale && (
              <View style={styles.staleBanner}>
                <Ionicons name="warning" size={16} color="#E65100" />
                <Text style={styles.staleText}>
                  Vị trí chưa cập nhật trong 5 phút
                </Text>
              </View>
            )}

            {/* ETA Info */}
            {eta && (
              <View style={styles.etaContainer}>
                <Ionicons name="time-outline" size={20} color="#4CAF50" />
                <Text style={styles.etaText}>
                  Dự kiến giao trong: <Text style={styles.etaBold}>{eta.text}</Text>
                </Text>
              </View>
            )}

            {/* Customer Address */}
            {customer && (
              <View style={styles.addressContainer}>
                <Ionicons name="location-outline" size={20} color="#666" />
                <Text style={styles.addressText}>{customer.address}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Floating Shipper Card */}
      {shipper && (
        <View style={styles.floatingShipperCard}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setIsShipperExpanded(!isShipperExpanded)}
            style={styles.cardHeader}
          >
            <View style={styles.cardHeaderLeft}>
              <View style={styles.shipperAvatarSmall}>
                <Ionicons name="person" size={20} color="#fff" />
              </View>
              <View>
                <Text style={styles.cardTitle}>{shipper.fullName}</Text>
                <Text style={styles.cardSubtitle}>Người giao hàng</Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.callButtonSmall}
                onPress={handleCallShipper}
              >
                <Ionicons name="call" size={20} color="#fff" />
              </TouchableOpacity>
              <Ionicons
                name={isShipperExpanded ? 'chevron-down' : 'chevron-up'}
                size={24}
                color="#666"
                style={{ marginLeft: 8 }}
              />
            </View>
          </TouchableOpacity>

          {isShipperExpanded && (
            <View style={styles.cardContent}>
              <View style={styles.shipperDetail}>
                <Ionicons name="call-outline" size={18} color="#666" />
                <Text style={styles.shipperDetailText}>{shipper.phone}</Text>
              </View>
              {currentLocation && (
                <View style={styles.shipperDetail}>
                  <Ionicons name="location-outline" size={18} color="#666" />
                  <Text style={styles.shipperDetailText}>
                    {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Connection Status Indicator */}
      {!isConnected && (
        <View style={styles.connectionBanner}>
          <Ionicons name="alert-circle" size={16} color="#FF9800" />
          <Text style={styles.connectionText}>Đang kết nối lại...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreenMap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingCard: {
    position: 'absolute',
    top: 110,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingShipperCard: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  staleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  staleText: {
    color: '#E65100',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  etaText: {
    fontSize: 14,
    color: '#2E7D32',
    marginLeft: 8,
    flex: 1,
  },
  etaBold: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  shipperAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callButtonSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shipperDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  shipperDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  connectionBanner: {
    position: 'absolute',
    top: 90,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  connectionText: {
    color: '#FF9800',
    fontSize: 13,
    marginLeft: 8,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  retryButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
});
