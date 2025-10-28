import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native'
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import cartService, { Cart, CartItem } from '@/services/cartService'
import productService from '@/services/productService'
import tokenService from '@/services/tokenService'

export default function CartScreen() {
  const router = useRouter()
  const [cart, setCart] = useState<Cart | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCart()
  }, [])

  const loadCart = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const token = await tokenService.getToken()
      
      if (!token) {
        setError('Please log in to view your cart')
        return
      }

      const cartData = await cartService.getUserCart(token)
      setCart(cartData)
    } catch (err) {
      console.error('Error loading cart:', err)
      setError('Failed to load cart')
    } finally {
      setIsLoading(false)
    }
  }

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await loadCart()
    setIsRefreshing(false)
  }, [])

  const handleUpdateQuantity = async (item: CartItem, newQuantity: number) => {
    if (newQuantity < 1) return

    try {
      setUpdatingItems(prev => new Set(prev).add(item.productId))

      const token = await tokenService.getToken()
      if (!token) {
        Alert.alert('Error', 'Please log in again')
        return
      }

      const updatedCart = await cartService.updateCartItem(
        token,
        item.productId,
        { quantity: newQuantity }
      )

      setCart(updatedCart)
    } catch (err) {
      console.error('Error updating quantity:', err)
      Alert.alert('Error', 'Failed to update quantity')
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(item.productId)
        return newSet
      })
    }
  }

  const handleRemoveItem = (item: CartItem) => {
    Alert.alert(
      'Remove Item',
      `Remove ${item.productName} from cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdatingItems(prev => new Set(prev).add(item.productId))

              const token = await tokenService.getToken()
              if (!token) {
                Alert.alert('Error', 'Please log in again')
                return
              }

              const updatedCart = await cartService.removeFromCart(token, item.productId)
              setCart(updatedCart)
            } catch (err) {
              console.error('Error removing item:', err)
              Alert.alert('Error', 'Failed to remove item')
            } finally {
              setUpdatingItems(prev => {
                const newSet = new Set(prev)
                newSet.delete(item.productId)
                return newSet
              })
            }
          }
        }
      ]
    )
  }

  const handleClearCart = () => {
    if (!cart || cart.items.length === 0) return

    Alert.alert(
      'Clear Cart',
      'Remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await tokenService.getToken()
              if (!token) {
                Alert.alert('Error', 'Please log in again')
                return
              }

              await cartService.clearCart(token)
              await loadCart()
            } catch (err) {
              console.error('Error clearing cart:', err)
              Alert.alert('Error', 'Failed to clear cart')
            }
          }
        }
      ]
    )
  }

  const handleCheckout = () => {
    if (!cart || cart.items.length === 0) return

    // TODO: Navigate to checkout screen
    Alert.alert(
      'Checkout',
      'Checkout functionality coming soon!',
      [{ text: 'OK' }]
    )
  }

  const renderCartItem = ({ item }: { item: CartItem }) => {
    const isUpdating = updatingItems.has(item.productId)

    return (
      <View style={styles.cartItem}>
        <TouchableOpacity
          style={styles.itemContent}
          onPress={() => router.push({
            pathname: '/(stacks)/ProductDetailScreen',
            params: { productId: item.productId }
          })}
        >
          {/* Product Image Placeholder */}
          <View style={styles.itemImageContainer}>
            <Ionicons name="image-outline" size={40} color="#CCC" />
          </View>

          <View style={styles.itemDetails}>
            <Text style={styles.itemName} numberOfLines={2}>
              {item.productName}
            </Text>
            <Text style={styles.itemPrice}>
              {productService.formatPrice(item.price)}
            </Text>
            <Text style={styles.itemSubtotal}>
              Subtotal: {productService.formatPrice(item.price * item.quantity)}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.itemActions}>
          {/* Quantity Controls */}
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={[styles.quantityButton, isUpdating && styles.disabledButton]}
              onPress={() => handleUpdateQuantity(item, item.quantity - 1)}
              disabled={isUpdating || item.quantity <= 1}
            >
              <Ionicons 
                name="remove" 
                size={18} 
                color={item.quantity <= 1 || isUpdating ? '#CCC' : '#1A1A1A'} 
              />
            </TouchableOpacity>

            {isUpdating ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.quantityText}>{item.quantity}</Text>
            )}

            <TouchableOpacity
              style={[styles.quantityButton, isUpdating && styles.disabledButton]}
              onPress={() => handleUpdateQuantity(item, item.quantity + 1)}
              disabled={isUpdating}
            >
              <Ionicons 
                name="add" 
                size={18} 
                color={isUpdating ? '#CCC' : '#1A1A1A'} 
              />
            </TouchableOpacity>
          </View>

          {/* Remove Button */}
          <TouchableOpacity
            style={[styles.removeButton, isUpdating && styles.disabledButton]}
            onPress={() => handleRemoveItem(item)}
            disabled={isUpdating}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const renderEmptyCart = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cart-outline" size={100} color="#E5E5E5" />
      <Text style={styles.emptyTitle}>Your cart is empty</Text>
      <Text style={styles.emptySubtitle}>
        Add products to your cart to get started
      </Text>
      <TouchableOpacity
        style={styles.shopButton}
        onPress={() => router.push('/(tabs)/HomeScreen')}
      >
        <Text style={styles.shopButtonText}>Start Shopping</Text>
      </TouchableOpacity>
    </View>
  )

  const renderLoginRequired = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="person-circle-outline" size={100} color="#E5E5E5" />
      <Text style={styles.emptyTitle}>Login Required</Text>
      <Text style={styles.emptySubtitle}>
        Please log in to view your cart
      </Text>
      <TouchableOpacity
        style={styles.shopButton}
        onPress={() => router.push('/WelcomeScreen')}
      >
        <Text style={styles.shopButtonText}>Log In</Text>
      </TouchableOpacity>
    </View>
  )

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading cart...</Text>
      </View>
    )
  }

  if (error === 'Please log in to view your cart') {
    return renderLoginRequired()
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadCart}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!cart || cart.items.length === 0) {
    return renderEmptyCart()
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shopping Cart</Text>
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Cart Items */}
      <FlatList
        data={cart.items}
        renderItem={renderCartItem}
        keyExtractor={(item) => item.productId}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      />

      {/* Bottom Summary */}
      <View style={styles.bottomContainer}>
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items ({cart.totalItems})</Text>
            <Text style={styles.summaryValue}>
              {productService.formatPrice(cart.totalPrice)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryValue}>Free</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {productService.formatPrice(cart.totalPrice)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
        >
          <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  )
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F8F9FA',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  clearText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  cartItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  itemImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  itemSubtotal: {
    fontSize: 13,
    color: '#666',
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  quantityButton: {
    padding: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    padding: 8,
  },
  bottomContainer: {
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    padding: 16,
  },
  summarySection: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#666',
  },
  summaryValue: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  totalRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    marginTop: 8,
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
  checkoutButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  checkoutButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
})