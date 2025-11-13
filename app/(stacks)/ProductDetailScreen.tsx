import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Dimensions, Alert } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import productService, { Product } from '@/services/productService'
import cartService from '@/services/cartService'
import tokenService from '@/services/tokenService'
import { useCartCount } from '@/hooks/userCartCount'
import reviewService, { ReviewPayload } from '@/services/reviewService'
import { useThemeColor } from '@/contexts/ThemeColorContext'

const { width } = Dimensions.get('window')

export default function ProductDetailScreen() {
  const router = useRouter()
  const { productId } = useLocalSearchParams<{ productId: string }>()
  const { primaryColor } = useThemeColor()

  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const { refreshCount } = useCartCount();

  useEffect(() => {
    if (productId) {
      fetchProductDetails()
    }
  }, [productId])

  const fetchProductDetails = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await productService.getProductById(productId!)
      setProduct(data)
    } catch (err) {
      setError('Failed to load product details')
      console.error('Error fetching product:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuantityChange = (increment: boolean) => {
    if (increment && product && quantity < product.stock) {
      setQuantity(quantity + 1)
    } else if (!increment && quantity > 1) {
      setQuantity(quantity - 1)
    }
  }

  const handleAddToCart = async () => {
    if (!product || !productId) return

    try {
      setIsAddingToCart(true)

      // Get the auth token
      const token = await tokenService.getToken()

      if (!token) {
        Alert.alert(
          'Authentication Required',
          'Please log in to add items to your cart',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Log In',
              onPress: () => router.push('/WelcomeScreen')
            }
          ]
        )
        return
      }

      // Add to cart
      await cartService.addToCart(token, {
        productId: productId,
        quantity: quantity
      });
      
      // Refresh cart count badge
      await refreshCount();

      // Show success message
      Alert.alert(
        'Added to Cart',
        `${quantity} ${quantity === 1 ? 'item' : 'items'} of ${product.productName} added to your cart`,
        [
          { text: 'Continue Shopping', style: 'cancel' },
          {
            text: 'View Cart',
            onPress: () => router.push('/(tabs)/CartScreen')
          }
        ]
      )

      // Reset quantity
      setQuantity(1)

    } catch (err: any) {
      console.error('Error adding to cart:', err)

      // Parse error message from API
      let errorMessage = 'Failed to add product to cart. Please try again.'

      if (err.message) {
        if (err.message.includes('không có sẵn') || err.message.includes('not available')) {
          errorMessage = 'This product is currently out of stock in all warehouses.'
        } else if (err.message.includes('quantity') || err.message.includes('số lượng')) {
          errorMessage = 'The requested quantity is not available.'
        } else if (err.message.includes('token') || err.message.includes('auth')) {
          errorMessage = 'Your session has expired. Please log in again.'
        } else {
          errorMessage = err.message
        }
      }

      Alert.alert(
        'Cannot Add to Cart',
        errorMessage,
        [
          { text: 'OK' }
        ]
      )
    } finally {
      setIsAddingToCart(false)
    }
  }

  const handlePostReview = async () => {
    try {
      const token = await tokenService.getToken()
      
      if (!token) {
        Alert.alert('Authentication Required', 'Please log in to post a review')
        return
      }

      const reviewPayload: ReviewPayload = {
        productId: productId!,
        rating: 5, // You can make this dynamic with a rating picker
        content: 'Your review content here' // Get from TextInput
      };

      const newReview = await reviewService.postReview(token, reviewPayload)
      
      Alert.alert('Success', 'Your review has been posted!')
      // Refresh product details to show the new review
      await fetchProductDetails()
      
    } catch (error) {
      console.error('Error posting review:', error)
      Alert.alert('Error', 'Failed to post review. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading product details...</Text>
      </View>
    )
  }

  if (error || !product) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>{error || 'Product not found'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProductDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const discountedPrice = productService.calculateDiscountedPrice(product)
  const discountAmount = productService.getDiscountAmount(product)
  const avgRating = productService.calculateAverageRating(product)
  const stockStatus = productService.getStockStatus(product)
  const hasDiscount = parseFloat(product.salePercentage) > 0

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageSection}>
          <Image
            source={{ uri: product.productImages[selectedImageIndex] + `.jpg` }}
            style={styles.mainImage}
            resizeMode="cover"
          />
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{product.salePercentage}%</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        {/* Image Thumbnails */}
        {product.productImages.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.thumbnailContainer}
          >
            {product.productImages.map((image, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedImageIndex(index)}
                style={[
                  styles.thumbnail,
                  selectedImageIndex === index && [styles.thumbnailSelected, { borderColor: primaryColor }]
                ]}
              >
                <Image source={{ uri: image + `.jpg` }} style={styles.thumbnailImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Product Info */}
        <View style={styles.infoSection}>
          <Text style={styles.brand}>{product.brand}</Text>
          <Text style={styles.productName}>{product.productName}</Text>

          {/* Rating */}
          <View style={styles.ratingContainer}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= avgRating ? 'star' : 'star-outline'}
                  size={18}
                  color="#FFB800"
                />
              ))}
            </View>
            <Text style={styles.ratingText}>
              {avgRating > 0 ? avgRating.toFixed(1) : 'No reviews'}
              ({product.reviews?.length || 0} reviews)
            </Text>
          </View>

          {/* Price */}
          <View style={styles.priceSection}>
            <Text style={[styles.currentPrice, { color: primaryColor }]}>
              {productService.formatPrice(discountedPrice)}
            </Text>
            {hasDiscount && (
              <View style={styles.originalPriceContainer}>
                <Text style={styles.originalPrice}>
                  {productService.formatPrice(product.sellingPrice)}
                </Text>
                <Text style={styles.savings}>
                  Save {productService.formatPrice(discountAmount)}
                </Text>
              </View>
            )}
          </View>

          {/* Stock Status */}
          <View style={[styles.stockBadge, { backgroundColor: stockStatus.color }]}>
            <Text style={styles.stockText}>{stockStatus.status}</Text>
            <Text style={styles.stockQuantity}>({product.stock} units available)</Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.productDescription}</Text>
          </View>

          {/* Suitable For */}
          {product.suitableFor && product.suitableFor.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Suitable For</Text>
              <View style={styles.tagsContainer}>
                {product.suitableFor.map((item, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: `${primaryColor}15` }]}>
                    <Text style={[styles.tagText, { color: primaryColor }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Ingredients */}
          {product.ingredients && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              <Text style={styles.ingredients}>{product.ingredients}</Text>
            </View>
          )}

          {/* Categories */}
          {product.categories && product.categories.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <View style={styles.tagsContainer}>
                {product.categories.map((category) => (
                  <View key={category.categoryId} style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>{category.categoryName}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Reviews */}
          {product.reviews && product.reviews.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Customer Reviews</Text>
              {product.reviews.slice(0, 3).map((review, index) => (
                <View key={index} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={star <= review.rating ? 'star' : 'star-outline'}
                          size={14}
                          color="#FFB800"
                        />
                      ))}
                    </View>
                    <Text style={styles.reviewDate}>
                      {new Date(review.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleQuantityChange(false)}
            disabled={quantity <= 1 || isAddingToCart}
          >
            <Ionicons name="remove" size={20} color={quantity <= 1 ? '#CCC' : '#1A1A1A'} />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleQuantityChange(true)}
            disabled={quantity >= product.stock || isAddingToCart}
          >
            <Ionicons name="add" size={20} color={quantity >= product.stock ? '#CCC' : '#1A1A1A'} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[
            styles.addToCartButton,
            { backgroundColor: productService.isInStock(product) && !isAddingToCart ? primaryColor : '#CCC' }
          ]}
          onPress={handleAddToCart}
          disabled={!productService.isInStock(product) || isAddingToCart}
        >
          {isAddingToCart ? (
            <>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.addToCartText}>Adding...</Text>
            </>
          ) : (
            <>
              <Ionicons name="cart" size={20} color="#FFF" />
              <Text style={styles.addToCartText}>
                {productService.isInStock(product) ? 'Add to Cart' : 'Out of Stock'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
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
  imageSection: {
    position: 'relative',
  },
  mainImage: {
    width: width,
    height: width,
    backgroundColor: '#F8F9FA',
  },
  discountBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  discountText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#FFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnailContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailSelected: {
    borderColor: '#007AFF', // Will be overridden
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  infoSection: {
    padding: 16,
  },
  brand: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  productName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  priceSection: {
    marginBottom: 16,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#007AFF', // Will be overridden
    marginBottom: 4,
  },
  originalPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  originalPrice: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  savings: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '600',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 24,
  },
  stockText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  stockQuantity: {
    color: '#FFF',
    fontSize: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#666',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#E3F2FD', // Will be overridden
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    color: '#007AFF', // Will be overridden
    fontSize: 13,
    fontWeight: '600',
  },
  categoryTag: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryTagText: {
    color: '#1A1A1A',
    fontSize: 13,
    fontWeight: '600',
  },
  ingredients: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
  },
  reviewCard: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  reviewComment: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 12,
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
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginHorizontal: 16,
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF', // Will be overridden
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  addToCartText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
})