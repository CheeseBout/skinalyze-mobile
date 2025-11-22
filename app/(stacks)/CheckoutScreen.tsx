import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import orderService, { PaymentMethod } from '@/services/orderService';
import cartService, { Cart, CartItem } from '@/services/cartService';
import tokenService from '@/services/tokenService';
import productService from '@/services/productService';
import userService from '@/services/userService';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColor } from '@/contexts/ThemeColorContext';

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { primaryColor } = useThemeColor();

  const [cart, setCart] = useState<Cart | null>(null);
  const [selectedItems, setSelectedItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [useWallet, setUseWallet] = useState(false);
  const [addressEditable, setAddressEditable] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('VND');
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    loadCart();
    loadUserAddress();
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    setBalanceLoading(true);
    try {
      const token = await tokenService.getToken();
      if (!token) return;

      const balanceData = await userService.getBalance(token);
      setBalance(balanceData.balance);
      setCurrency(balanceData.currency);
    } catch (error: any) {
      console.error('Error fetching balance:', error);
    } finally {
      setBalanceLoading(false);
    }
  };

  const loadUserAddress = () => {
    if (user?.addresses && user.addresses.length > 0) {
      const primaryAddress = user.addresses[0];

      const formattedAddress = [
        primaryAddress.streetLine1,
        primaryAddress.streetLine2,
        primaryAddress.street,
        primaryAddress.wardOrSubDistrict,
        primaryAddress.district,
        primaryAddress.city
      ]
        .filter(Boolean)
        .join(', ');

      setShippingAddress(formattedAddress);
    }
  };

  const loadCart = async () => {
    try {
      setLoading(true);
      const token = await tokenService.getToken();
      if (!token) {
        Alert.alert('Error', 'Please log in to continue');
        router.back();
        return;
      }

      const cartData = await cartService.getUserCart();

      if (!cartData || cartData.items.length === 0) {
        Alert.alert('Empty Cart', 'Your cart is empty', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }

      setCart(cartData);

      // Parse selected product IDs from params
      const selectedProductIds = params.selectedProductIds
        ? JSON.parse(params.selectedProductIds as string)
        : [];

      // Filter cart items to only include selected ones
      const selectedCartItems = cartData.items.filter(item =>
        selectedProductIds.includes(item.productId)
      );

      if (selectedCartItems.length === 0) {
        Alert.alert('No Items Selected', 'Please select items to checkout', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }

      setSelectedItems(selectedCartItems);
    } catch (error) {
      console.error('Error loading cart:', error);
      Alert.alert('Error', 'Failed to load cart data');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return selectedItems.reduce((total, item) =>
      total + (item.price * item.quantity), 0
    );
  };

  const calculateTotalItems = () => {
    return selectedItems.reduce((total, item) => total + item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (!shippingAddress.trim()) {
      Alert.alert('Required', 'Please enter shipping address');
      return;
    }

    if (selectedItems.length === 0) {
      Alert.alert('Error', 'No items selected for checkout');
      return;
    }

    const totalPrice = calculateTotal();
    
    // Check if using wallet and balance is insufficient
    if (paymentMethod === 'wallet' && balance < totalPrice) {
      Alert.alert(
        'Insufficient Balance',
        `Your balance: ${balance.toLocaleString()} ${currency}\nOrder total: ${totalPrice.toLocaleString()} ${currency}\n\nPlease top up your wallet or choose another payment method.`,
        [
          { text: 'OK', style: 'default' },
          {
            text: 'Top Up Wallet',
            onPress: () => router.push('/(stacks)/WithdrawalScreen')
          }
        ]
      );
      return;
    }

    const paymentLabel = paymentMethod === 'wallet' 
      ? 'Wallet Balance' 
      : orderService.getPaymentMethodLabel(paymentMethod);

    Alert.alert(
      'Confirm Order',
      `Total: ${productService.formatPrice(totalPrice)}\nPayment: ${paymentLabel}${paymentMethod === 'wallet' ? `\n\nNew Balance: ${(balance - totalPrice).toLocaleString()} ${currency}` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setSubmitting(true);
              const token = await tokenService.getToken();
              if (!token) {
                Alert.alert('Error', 'Please log in again');
                return;
              }

              // Extract selected product IDs
              const selectedProductIds = selectedItems.map(item => item.productId);

              const order = await orderService.checkout(token, {
                shippingAddress: shippingAddress.trim(),
                selectedProductIds,
                paymentMethod,
                useWallet: paymentMethod === 'wallet', // Set useWallet based on payment method
                notes: notes.trim() || undefined,
              });

              // Refresh balance if paid with wallet
              let newBalance = balance;
              if (paymentMethod === 'wallet') {
                await fetchBalance();
                const balanceData = await userService.getBalance(token);
                newBalance = balanceData.balance;
              }

              // For banking payment, navigate to PaymentScreen with QR details
              if (paymentMethod === 'banking' && order.payment) {
                router.replace({
                  pathname: '/(stacks)/PaymentScreen',
                  params: {
                    paymentCode: order.payment.paymentCode || '',
                    expiredAt: order.payment.expiredAt || '',
                    qrCodeUrl: order.payment.qrCodeUrl || '',
                    amount: order.payment.amount || 0,
                    instructions: JSON.stringify(order.payment.instructions || []), 
                    bankName: order.payment.bankingInfo?.bankName,
                    accountNumber: order.payment.bankingInfo?.accountNumber,
                    accountName: order.payment.bankingInfo?.accountName,
                  }
                });
                return;
              }

              // For other payment methods, show success alert
              Alert.alert(
                'Order Placed!',
                `Order ID: ${order.orderId}\nYour order has been placed successfully.${paymentMethod === 'wallet' ? `\n\nNew Balance: ${newBalance.toLocaleString()} ${currency}` : ''}`,
                [
                  {
                    text: 'View Order',
                    onPress: () => {
                      router.replace({
                        pathname: '/(stacks)/OrderDetailScreen',
                        params: { orderId: order.orderId }
                      });
                    }
                  },
                  {
                    text: 'Go to Home',
                    onPress: () => router.replace('/(tabs)/HomeScreen')
                  }
                ]
              );
            } catch (error: any) {
              console.error('Checkout error:', error);
              
              // Handle insufficient balance error
              const errorMessage = error.message || 'Failed to place order. Please try again.';
              if (errorMessage.includes('Số dư không đủ') || errorMessage.includes('insufficient')) {
                Alert.alert('Insufficient Balance', errorMessage);
              } else {
                Alert.alert('Checkout Failed', errorMessage);
              }
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const handleAddressSelect = () => {
    if (user?.addresses && user.addresses.length > 0) {
      Alert.alert(
        'Select Address',
        'Choose a saved address',
        [
          ...user.addresses.map((address, index) => ({
            text: `${address.streetLine1}, ${address.city}`,
            onPress: () => {
              const formattedAddress = [
                address.streetLine1,
                address.streetLine2,
                address.street,
                address.wardOrSubDistrict,
                address.district,
                address.city
              ]
                .filter(Boolean)
                .join(', ');
              setShippingAddress(formattedAddress);
              setAddressEditable(false);
            }
          })),
          {
            text: 'Enter Manually',
            onPress: () => {
              setShippingAddress('');
              setAddressEditable(true);
            }
          },
          {
            text: 'Cancel',
            style: 'cancel' as const
          }
        ]
      );
    } else {
      setAddressEditable(true);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading checkout...</Text>
      </View>
    );
  }

  if (!cart || selectedItems.length === 0) {
    return null;
  }

  const totalPrice = calculateTotal();
  const totalItems = calculateTotalItems();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Selected Items Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Selected Items ({selectedItems.length})
          </Text>
          <View style={styles.itemsPreview}>
            {selectedItems.slice(0, 3).map((item, index) => (
              <View key={item.productId} style={styles.itemPreviewCard}>
                <Text style={styles.itemPreviewName} numberOfLines={1}>
                  {item.productName}
                </Text>
                <Text style={styles.itemPreviewQuantity}>x{item.quantity}</Text>
              </View>
            ))}
            {selectedItems.length > 3 && (
              <Text style={styles.moreItems}>
                +{selectedItems.length - 3} more item{selectedItems.length - 3 > 1 ? 's' : ''}
              </Text>
            )}
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items</Text>
              <Text style={styles.summaryValue}>{totalItems}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                {productService.formatPrice(totalPrice)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>Free</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {productService.formatPrice(totalPrice)}
              </Text>
            </View>
          </View>
        </View>

        {/* Shipping Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Shipping Address <Text style={styles.required}>*</Text>
            </Text>
            {user?.addresses && user.addresses.length > 0 && (
              <TouchableOpacity onPress={handleAddressSelect}>
                <Text style={[styles.changeAddressText, { color: primaryColor }]}>Change</Text>
              </TouchableOpacity>
            )}
          </View>

          {shippingAddress && !addressEditable ? (
            <TouchableOpacity
              style={styles.addressCard}
              onPress={() => setAddressEditable(true)}
            >
              <View style={styles.addressCardContent}>
                <Ionicons name="location-outline" size={20} color="#666" />
                <Text style={styles.addressText}>{shippingAddress}</Text>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </View>
            </TouchableOpacity>
          ) : (
            <TextInput
              style={styles.addressInput}
              placeholder="Enter shipping address"
              value={shippingAddress}
              onChangeText={setShippingAddress}
              multiline
              numberOfLines={3}
            />
          )}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add any special instructions..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          {/* Wallet Balance */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'wallet' && [styles.paymentOptionActive, { borderColor: primaryColor, backgroundColor: `${primaryColor}10` }]
            ]}
            onPress={() => setPaymentMethod('wallet')}
          >
            <View style={styles.paymentOptionContent}>
              <Ionicons name="wallet" size={24} color={primaryColor} />
              <View style={styles.paymentOptionText}>
                <Text style={styles.paymentOptionTitle}>Wallet Balance</Text>
                <Text style={styles.paymentOptionSubtitle}>
                  {balanceLoading ? 'Loading...' : `Available: ${balance.toLocaleString()} ${currency}`}
                </Text>
              </View>
            </View>
            <View style={[
              styles.radio,
              paymentMethod === 'wallet' && [styles.radioActive, { borderColor: primaryColor }]
            ]}>
              {paymentMethod === 'wallet' && <View style={[styles.radioDot, { backgroundColor: primaryColor }]} />}
            </View>
          </TouchableOpacity>

          {/* Cash on Delivery */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'cod' && [styles.paymentOptionActive, { borderColor: primaryColor, backgroundColor: `${primaryColor}10` }]
            ]}
            onPress={() => setPaymentMethod('cod')}
          >
            <View style={styles.paymentOptionContent}>
              <Ionicons name="cash-outline" size={24} color={primaryColor} />
              <View style={styles.paymentOptionText}>
                <Text style={styles.paymentOptionTitle}>Cash on Delivery</Text>
                <Text style={styles.paymentOptionSubtitle}>
                  Pay when you receive
                </Text>
              </View>
            </View>
            <View style={[
              styles.radio,
              paymentMethod === 'cod' && [styles.radioActive, { borderColor: primaryColor }]
            ]}>
              {paymentMethod === 'cod' && <View style={[styles.radioDot, { backgroundColor: primaryColor }]} />}
            </View>
          </TouchableOpacity>

          {/* Bank Transfer (SePay) */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'banking' && [styles.paymentOptionActive, { borderColor: primaryColor, backgroundColor: `${primaryColor}10` }]
            ]}
            onPress={() => setPaymentMethod('banking')}
          >
            <View style={styles.paymentOptionContent}>
              <Ionicons name="card-outline" size={24} color={primaryColor} />
              <View style={styles.paymentOptionText}>
                <Text style={styles.paymentOptionTitle}>Bank Transfer</Text>
                <Text style={styles.paymentOptionSubtitle}>
                  Pay via SePay gateway
                </Text>
              </View>
            </View>
            <View style={[
              styles.radio,
              paymentMethod === 'banking' && [styles.radioActive, { borderColor: primaryColor }]
            ]}>
              {paymentMethod === 'banking' && <View style={[styles.radioDot, { backgroundColor: primaryColor }]} />}
            </View>
          </TouchableOpacity>

          {/* MoMo */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'momo' && [styles.paymentOptionActive, { borderColor: primaryColor, backgroundColor: `${primaryColor}10` }]
            ]}
            onPress={() => setPaymentMethod('momo')}
          >
            <View style={styles.paymentOptionContent}>
              <Ionicons name="wallet-outline" size={24} color="#D82D8B" />
              <View style={styles.paymentOptionText}>
                <Text style={styles.paymentOptionTitle}>MoMo</Text>
                <Text style={styles.paymentOptionSubtitle}>
                  Pay with MoMo wallet
                </Text>
              </View>
            </View>
            <View style={[
              styles.radio,
              paymentMethod === 'momo' && [styles.radioActive, { borderColor: primaryColor }]
            ]}>
              {paymentMethod === 'momo' && <View style={[styles.radioDot, { backgroundColor: primaryColor }]} />}
            </View>
          </TouchableOpacity>

          {/* VNPay */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'vnpay' && [styles.paymentOptionActive, { borderColor: primaryColor, backgroundColor: `${primaryColor}10` }]
            ]}
            onPress={() => setPaymentMethod('vnpay')}
          >
            <View style={styles.paymentOptionContent}>
              <Ionicons name="card-outline" size={24} color="#0066B2" />
              <View style={styles.paymentOptionText}>
                <Text style={styles.paymentOptionTitle}>VNPay</Text>
                <Text style={styles.paymentOptionSubtitle}>
                  Pay with VNPay wallet
                </Text>
              </View>
            </View>
            <View style={[
              styles.radio,
              paymentMethod === 'vnpay' && [styles.radioActive, { borderColor: primaryColor }]
            ]}>
              {paymentMethod === 'vnpay' && <View style={[styles.radioDot, { backgroundColor: primaryColor }]} />}
            </View>
          </TouchableOpacity>

          {/* ZaloPay */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'zalopay' && [styles.paymentOptionActive, { borderColor: primaryColor, backgroundColor: `${primaryColor}10` }]
            ]}
            onPress={() => setPaymentMethod('zalopay')}
          >
            <View style={styles.paymentOptionContent}>
              <Ionicons name="wallet-outline" size={24} color="#0068FF" />
              <View style={styles.paymentOptionText}>
                <Text style={styles.paymentOptionTitle}>ZaloPay</Text>
                <Text style={styles.paymentOptionSubtitle}>
                  Pay with ZaloPay wallet
                </Text>
              </View>
            </View>
            <View style={[
              styles.radio,
              paymentMethod === 'zalopay' && [styles.radioActive, { borderColor: primaryColor }]
            ]}>
              {paymentMethod === 'zalopay' && <View style={[styles.radioDot, { backgroundColor: primaryColor }]} />}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Checkout Button */}
      <View style={styles.bottomContainer}>
        <View style={styles.checkoutSummary}>
          <View style={styles.checkoutRow}>
            <Text style={styles.checkoutLabel}>Total ({totalItems} items)</Text>
            <Text style={styles.checkoutAmount}>
              {productService.formatPrice(totalPrice)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.checkoutButton,
            submitting && styles.checkoutButtonDisabled,
            { backgroundColor: primaryColor }
          ]}
          onPress={handleCheckout}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Text style={styles.checkoutButtonText}>Place Order</Text>
              <Text style={styles.checkoutButtonAmount}>
                {productService.formatPrice(totalPrice)}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  changeAddressText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  required: {
    color: '#FF3B30',
  },
  itemsPreview: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
  },
  itemPreviewCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemPreviewName: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  itemPreviewQuantity: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  moreItems: {
    fontSize: 13,
    color: '#007AFF',
    marginTop: 8,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#666',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  addressCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    lineHeight: 22,
  },
  editButton: {
    padding: 8,
  },
  addressInput: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minHeight: 100,
  },
  notesInput: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minHeight: 60,
  },
  doneButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  paymentOptionActive: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  paymentOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentOptionText: {
    marginLeft: 12,
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  paymentOptionSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: '#007AFF',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CCC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    padding: 16,
  },
  checkoutButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  checkoutButtonDisabled: {
    opacity: 0.6,
  },
  checkoutButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  checkoutButtonAmount: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  checkoutSummary: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  checkoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkoutLabel: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  checkoutAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
});