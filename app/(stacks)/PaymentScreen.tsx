import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiService from '@/services/apiService';
import tokenService from '@/services/tokenService';
import { useThemeColor } from '@/contexts/ThemeColorContext';

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { primaryColor } = useThemeColor();

  // Get values directly from params (no JSON parsing needed)
  const [paymentCode] = useState(params.paymentCode as string || '');
  const [expiredAt] = useState(() => {
    try {
      return new Date(params.expiredAt as string);
    } catch {
      return new Date(Date.now() + 5 * 60 * 1000); // Default to 5 minutes from now
    }
  });
  const [qrCodeUrl] = useState(params.qrCodeUrl as string || '');
  const [amount] = useState(parseInt(params.amount as string) || 0);
  const [instructions] = useState(() => {
    try {
      return params.instructions ? JSON.parse(params.instructions as string) : [];
    } catch {
      return [];
    }
  });
  const [bankName] = useState(params.bankName as string || 'MB Bank');
  const [accountNumber] = useState(params.accountNumber as string || '0347178790');
  const [accountName] = useState(params.accountName as string || 'CHU PHAN NHAT LONG');
  const [status, setStatus] = useState<'pending' | 'paid' | 'expired' | 'failed'>('pending');
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [qrLoadError, setQrLoadError] = useState(false); // Track QR image load errors

  useEffect(() => {
    console.log('PaymentScreen: qrCodeUrl =', qrCodeUrl); // Debug log for QR URL
    console.log('PaymentScreen: params =', params); // Debug log for all params

    // Calculate initial time left
    const now = new Date();
    const diff = expiredAt.getTime() - now.getTime();
    setTimeLeft(Math.max(0, Math.floor(diff / 1000)));

    // Start polling for payment status
    const pollInterval = setInterval(checkPaymentStatus, 5000); // Poll every 5 seconds

    // Countdown timer
    const timerInterval = setInterval(() => {
      const now = new Date();
      const diff = expiredAt.getTime() - now.getTime();
      const secondsLeft = Math.max(0, Math.floor(diff / 1000));
      setTimeLeft(secondsLeft);

      if (secondsLeft <= 0 && status === 'pending') {
        setStatus('expired');
        clearInterval(pollInterval);
        clearInterval(timerInterval);
        Alert.alert('Payment Expired', 'The payment time has expired. Please try again.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(timerInterval);
    };
  }, [expiredAt, status, qrCodeUrl]); // Updated deps

  const checkPaymentStatus = async () => {
    if (status !== 'pending' || !paymentCode) return;

    try {
      setLoading(true);
      const token = await tokenService.getToken();
      if (!token) return;

      const response = await apiService.get(`/payments/check/${paymentCode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const paymentData = response.data;
      if (paymentData.status === 'paid') {
        setStatus('paid');
        Alert.alert('Payment Successful!', 'Your payment has been confirmed.', [
          {
            text: 'View Order',
            onPress: () => {
              // Assuming order details screen exists; adjust path if needed
              router.replace({
                pathname: '/(stacks)/OrderDetailScreen',
                params: { orderId: paymentData.order?.orderId || 'unknown' }
              });
            }
          },
          {
            text: 'Go to Home',
            onPress: () => router.replace('/(tabs)/HomeScreen')
          }
        ]);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setStatus('failed');
      Alert.alert('Error', 'Failed to check payment status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatAmount = (amount: number) => {
    return `${amount.toLocaleString()} VND`;
  };

  const handleQrError = () => {
    console.error('QR Code failed to load:', qrCodeUrl); // Debug log for image error
    setQrLoadError(true);
  };

  if (status === 'paid') {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#34C759" />
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successSubtitle}>Your order is being processed.</Text>
        </View>
      </View>
    );
  }

  if (status === 'expired') {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="close-circle" size={80} color="#FF3B30" />
          <Text style={styles.errorTitle}>Payment Expired</Text>
          <Text style={styles.errorSubtitle}>Please try again.</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: primaryColor }]}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Back to Checkout</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bank Transfer Payment</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* QR Code Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scan QR Code to Pay</Text>
          <View style={styles.qrContainer}>
            {qrCodeUrl && !qrLoadError ? (
              <Image
                source={{ uri: qrCodeUrl }}
                style={styles.qrCode}
                resizeMode="contain"
                onError={handleQrError}
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Ionicons name="qr-code-outline" size={100} color="#CCC" />
                <Text style={styles.qrPlaceholderText}>
                  {qrLoadError ? 'QR Code failed to load' : 'QR Code not available'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.qrSubtitle}>Use your banking app to scan this QR code</Text>
        </View>

        {/* Payment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={styles.detailValue}>{formatAmount(amount)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Code</Text>
              <Text style={styles.detailValue}>{paymentCode || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Time Left</Text>
              <Text style={[styles.detailValue, timeLeft < 60 && styles.detailValueUrgent]}>
                {formatTime(timeLeft)}
              </Text>
            </View>
          </View>
        </View>

        {/* Banking Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <View style={styles.instructionsCard}>
            {instructions.length > 0 ? (
              instructions.map((instruction: string, index: number) => (
                <View key={index} style={styles.instructionRow}>
                  <Text style={styles.instructionText}>{instruction}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.instructionText}>No instructions available</Text>
            )}
          </View>
        </View>

        {/* Banking Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bank Account Details</Text>
          <View style={styles.bankingCard}>
            <View style={styles.bankingRow}>
              <Text style={styles.bankingLabel}>Bank</Text>
              <Text style={styles.bankingValue}>{bankName}</Text>
            </View>
            <View style={styles.bankingRow}>
              <Text style={styles.bankingLabel}>Account Number</Text>
              <Text style={styles.bankingValue}>{accountNumber}</Text>
            </View>
            <View style={styles.bankingRow}>
              <Text style={styles.bankingLabel}>Account Name</Text>
              <Text style={styles.bankingValue}>{accountName}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={styles.loadingText}>Checking payment status...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  qrContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  qrCode: {
    width: 200,
    height: 200,
  },
  qrSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
  detailsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 15,
    color: '#666',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  detailValueUrgent: {
    color: '#FF3B30',
  },
  instructionsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  bankingCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  bankingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  bankingLabel: {
    fontSize: 15,
    color: '#666',
  },
  bankingValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#34C759',
    marginTop: 16,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF3B30',
    marginTop: 16,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#FFF',
  },
  qrPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
  },
  qrPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});