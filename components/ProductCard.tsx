import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native'
import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Product } from '@/services/productService'
import productService from '@/services/productService'

interface ProductCardProps {
  product: Product
  onPress: () => void
}

export default function ProductCard({ product, onPress }: ProductCardProps) {
  const discountedPrice = productService.calculateDiscountedPrice(product)
  const avgRating = productService.calculateAverageRating(product)
  const stockStatus = productService.getStockStatus(product)
  const hasDiscount = parseFloat(product.salePercentage) > 0

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Product Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: `${product.productImages[0]}.jpg` }}
          style={styles.image}
          resizeMode="cover"
        />
        
        {/* Sale Badge */}
        {hasDiscount && (
          <View style={styles.saleBadge}>
            <Text style={styles.saleBadgeText}>-{product.salePercentage}%</Text>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.info}>
        {/* Brand */}
        <Text style={styles.brand} numberOfLines={1}>
          {product.brand}
        </Text>

        {/* Product Name */}
        <Text style={styles.productName} numberOfLines={2}>
          {product.productName}
        </Text>

        {/* Rating */}
        <View style={styles.ratingContainer}>
          <Ionicons 
            name={avgRating > 0 ? 'star' : 'star-outline'} 
            size={14} 
            color="#FFB800" 
          />
          <Text style={styles.ratingText}>
            {avgRating > 0 ? avgRating.toFixed(1) : 'New'}
          </Text>
          <Text style={styles.reviewCount}>
            ({product.reviews?.length || 0})
          </Text>
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={styles.price}>
            {productService.formatPrice(discountedPrice)}
          </Text>
          {hasDiscount && (
            <Text style={styles.originalPrice}>
              {productService.formatPrice(product.sellingPrice)}
            </Text>
          )}
        </View>

        {/* Stock Status */}
        <View style={[styles.stockBadge, { backgroundColor: stockStatus.color }]}>
          <Text style={styles.stockText}>{stockStatus.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F8F9FA',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  saleBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  saleBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  info: {
    padding: 12,
  },
  brand: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    lineHeight: 20,
    marginBottom: 8,
    minHeight: 40,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    color: '#1A1A1A',
    fontWeight: '600',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#999999',
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  originalPrice: {
    fontSize: 12,
    color: '#999999',
    textDecorationLine: 'line-through',
  },
  stockBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})