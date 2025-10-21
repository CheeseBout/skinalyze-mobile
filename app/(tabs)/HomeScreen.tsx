import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import React, { useState } from 'react'
import { useRouter } from 'expo-router'
import { useProducts } from '@/hooks/useProducts'
import { Ionicons } from '@expo/vector-icons'
import productService from '@/services/productService'

export default function HomeScreen() {
  const router = useRouter()
  const { products, categories, saleProducts, isLoading, error, refreshProducts } = useProducts()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = async () => {
    setRefreshing(true)
    await refreshProducts()
    setRefreshing(false)
  }

  if (isLoading && products.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshProducts}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Featured Sale Products */}
      {saleProducts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔥 Hot Deals</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {saleProducts.slice(0, 5).map((product) => (
              <TouchableOpacity
                key={product.productId}
                style={styles.productCard}
                onPress={() => router.push({
                  pathname: '/(stacks)/ProductDetailScreen',
                  params: { productId: product.productId }
                })}
              >
                <Image
                  source={{ uri: product.productImages[0] }}
                  style={styles.productImage}
                />
                <View style={styles.saleBadge}>
                  <Text style={styles.saleBadgeText}>-{product.salePercentage}%</Text>
                </View>
                <Text style={styles.productName} numberOfLines={2}>
                  {product.productName}
                </Text>
                <Text style={styles.productBrand}>{product.brand}</Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.discountedPrice}>
                    ${productService.calculateDiscountedPrice(product).toFixed(2)}
                  </Text>
                  <Text style={styles.originalPrice}>
                    ${product.sellingPrice.toFixed(2)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shop by Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.categoryId}
              style={styles.categoryCard}
            >
              <View style={styles.categoryIcon}>
                <Ionicons name="grid-outline" size={32} color="#007AFF" />
              </View>
              <Text style={styles.categoryName}>{category.categoryName}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* All Products */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Products</Text>
        <View style={styles.productsGrid}>
          {products.map((product) => {
            const stockStatus = productService.getStockStatus(product)
            const avgRating = productService.calculateAverageRating(product)
            
            return (
              <TouchableOpacity
                key={product.productId}
                style={styles.gridProductCard}
                onPress={() => router.push({
                  pathname: '/(stacks)/ProductDetailScreen',
                  params: { productId: product.productId }
                })}
              >
                <Image
                  source={{ uri: product.productImages[0] }}
                  style={styles.gridProductImage}
                />
                {parseFloat(product.salePercentage) > 0 && (
                  <View style={styles.saleBadge}>
                    <Text style={styles.saleBadgeText}>-{product.salePercentage}%</Text>
                  </View>
                )}
                <Text style={styles.productName} numberOfLines={2}>
                  {product.productName}
                </Text>
                <Text style={styles.productBrand}>{product.brand}</Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#FFB800" />
                  <Text style={styles.ratingText}>
                    {avgRating > 0 ? avgRating.toFixed(1) : 'No reviews'}
                  </Text>
                </View>
                <Text style={styles.price}>${product.sellingPrice.toFixed(2)}</Text>
                <View style={[styles.stockBadge, { backgroundColor: stockStatus.color }]}>
                  <Text style={styles.stockBadgeText}>{stockStatus.status}</Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    </ScrollView>
  )
}

// Add all the styles from the previous HomeScreen implementation
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
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  productCard: {
    width: 160,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginBottom: 8,
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
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discountedPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    marginTop: 4,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: 16,
  },
  categoryIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridProductCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gridProductImage: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginVertical: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
  },
  stockBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  stockBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
})