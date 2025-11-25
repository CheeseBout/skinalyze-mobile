import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  ScrollView,
  Dimensions,
  StatusBar,
  Animated
} from 'react-native'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import productService, { Product } from '@/services/productService'
import ProductCard from '@/components/ProductCard'
import { useThemeColor } from '@/contexts/ThemeColorContext'

const { width } = Dimensions.get('window')
const CARD_WIDTH = (width - 60) / 2

const POPULAR_SEARCHES = [
  'Vitamin C',
  'Sunscreen',
  'Moisturizer',
  'Cleanser',
  'Eye Cream',
  'Serum',
]

const SKIN_TYPES = [
  { id: 'all-skin-types', label: 'All Skin' },
  { id: 'oily-skin', label: 'Oily' },
  { id: 'dry-skin', label: 'Dry' },
  { id: 'sensitive-skin', label: 'Sensitive' },
  { id: 'combination-skin', label: 'Combination' },
  { id: 'acne-prone-skin', label: 'Acne-Prone' },
]

const SORT_OPTIONS = [
  { id: 'relevance', label: 'Relevance', icon: 'star' },
  { id: 'price-low', label: 'Price: Low', icon: 'arrow-up' },
  { id: 'price-high', label: 'Price: High', icon: 'arrow-down' },
  { id: 'rating', label: 'Top Rated', icon: 'trophy' },
  { id: 'newest', label: 'Newest', icon: 'time' },
]

const RECENT_SEARCHES_KEY = '@recent_searches'

export default function SearchScreen() {
  const router = useRouter()
  // === MODIFIED: Get params for Category Filter ===
  const params = useLocalSearchParams() 
  const { categoryId, categoryName } = params

  const { primaryColor } = useThemeColor()
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSkinType, setSelectedSkinType] = useState<string | null>(null)
  const [selectedSort, setSelectedSort] = useState('relevance')
  const [showFilters, setShowFilters] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    loadRecentSearches()
    startAnimations()
  }, [])

  // === MODIFIED: Handle Initial Category Load ===
  useEffect(() => {
    if (categoryId && typeof categoryId === 'string') {
      // If category is passed, load by category immediately
      handleCategorySearch(categoryId, typeof categoryName === 'string' ? categoryName : '')
    }
  }, [categoryId])

  // === MODIFIED: Search Effect (only if not loading category initially) ===
  useEffect(() => {
    // Only trigger text search if there is text AND it's not just the initial category name load
    // (This prevents double fetching if we set the search query to the category name)
    if (searchQuery.trim() && !isLoading && (!categoryId || searchQuery !== categoryName)) {
       // Debounce could be added here, but using current logic:
       // We only auto-search if the user types, usually handled by onSubmitEditing.
       // However, original code had this effect. Let's respect original flow but guard it.
       // Note: The original code triggered `handleSearch` on `searchQuery` change. 
       // We will keep manual search trigger via onSubmitEditing for cleaner UX, 
       // OR we can keep it live. 
       // Let's assume we wait for user action OR the category load.
    } else if (!searchQuery.trim() && !categoryId) {
      setFilteredProducts([])
    }
  }, [searchQuery])

  useEffect(() => {
    if (products.length > 0) {
      applyFiltersAndSort()
    }
  }, [products, selectedSkinType, selectedSort])

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setRecentSearches(Array.isArray(parsed) ? parsed : [])
      }
    } catch (err) {
      console.error('Failed to load recent searches:', err)
      setRecentSearches([])
    }
  }

  const saveRecentSearch = async (query: string) => {
    try {
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5)
      setRecentSearches(updated)
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    } catch (err) {
      console.error('Failed to save recent search:', err)
    }
  }

  // === MODIFIED: New function to handle Category fetch ===
  const handleCategorySearch = async (id: string, name: string) => {
    try {
      setIsLoading(true)
      setError(null)
      setSearchQuery(name) // Pre-fill search bar so user knows context

      const results = await productService.getProductsByCategory(id)
      setProducts(results)
      // We don't save category navigation to "Recent Text Searches" usually
    } catch (err) {
      setError('Failed to load category products')
      console.error('Category load error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      setIsLoading(true)
      setError(null)
      
      // If user is typing, we switch to text search mode (ignoring initial category param)
      const results = await productService.searchProducts(searchQuery.trim())
      setProducts(results)
      saveRecentSearch(searchQuery.trim())
    } catch (err) {
      setError('Failed to search products')
      console.error('Search error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFiltersAndSort = useCallback(() => {
    let results = [...products]

    if (selectedSkinType) {
      results = results.filter(product =>
        product.suitableFor?.includes(selectedSkinType)
      )
    }

    switch (selectedSort) {
      case 'price-low':
        results.sort((a, b) => {
          const priceA = productService.calculateDiscountedPrice(a)
          const priceB = productService.calculateDiscountedPrice(b)
          return priceA - priceB
        })
        break
      case 'price-high':
        results.sort((a, b) => {
          const priceA = productService.calculateDiscountedPrice(a)
          const priceB = productService.calculateDiscountedPrice(b)
          return priceB - priceA
        })
        break
      case 'rating':
        results.sort((a, b) => {
          const ratingA = productService.calculateAverageRating(a)
          const ratingB = productService.calculateAverageRating(b)
          return ratingB - ratingA
        })
        break
      case 'newest':
        results.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        break
    }

    setFilteredProducts(results)
  }, [products, selectedSkinType, selectedSort])

  const handleQuickSearch = (query: string) => {
    setSearchQuery(query)
    performTextSearch(query) 
  }

  const performTextSearch = async (query: string) => {
    if (!query.trim()) return
    try {
      setIsLoading(true)
      setError(null)
      const results = await productService.searchProducts(query.trim())
      setProducts(results)
      saveRecentSearch(query.trim())
    } catch (err) {
      setError('Failed to search products')
    } finally {
      setIsLoading(false)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setProducts([])
    setFilteredProducts([])
    setSelectedSkinType(null)
    setSelectedSort('relevance')
    // Also clear params if we want to fully reset (requires navigation replace, but clearing state is usually enough)
  }

  const renderSearchBar = () => (
    <View style={styles.searchBarContainer}>
      <View style={styles.searchInputWrapper}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search skincare products..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          // Auto focus only if we didn't come from a category click
          autoFocus={!categoryId}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity 
        style={[
          styles.filterButton,
          showFilters && { backgroundColor: `${primaryColor}15` }
        ]}
        onPress={() => setShowFilters(!showFilters)}
        activeOpacity={0.7}
      >
        <Ionicons name="options" size={20} color={primaryColor} />
      </TouchableOpacity>
    </View>
  )

  const renderFilters = () => (
    <Animated.View 
      style={[
        styles.filtersContainer,
        {
          opacity: fadeAnim,
        }
      ]}
    >
      {/* Skin Type Filter */}
      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <View style={[styles.filterIconWrapper, { backgroundColor: '#F0F9FF' }]}>
            <Ionicons name="water" size={16} color="#2196F3" />
          </View>
          <Text style={styles.filterTitle}>Skin Type</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              !selectedSkinType && [styles.filterChipActive, { backgroundColor: primaryColor }]
            ]}
            onPress={() => setSelectedSkinType(null)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterChipText,
              !selectedSkinType && styles.filterChipTextActive
            ]}>All Types</Text>
          </TouchableOpacity>
          {SKIN_TYPES.map(type => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.filterChip,
                selectedSkinType === type.id && [styles.filterChipActive, { backgroundColor: primaryColor }]
              ]}
              onPress={() => setSelectedSkinType(type.id)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.filterChipText,
                selectedSkinType === type.id && styles.filterChipTextActive
              ]}>{type.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sort Options */}
      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <View style={[styles.filterIconWrapper, { backgroundColor: '#FFF4E6' }]}>
            <Ionicons name="swap-vertical" size={16} color="#FF9800" />
          </View>
          <Text style={styles.filterTitle}>Sort By</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          {SORT_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.filterChip,
                selectedSort === option.id && [styles.filterChipActive, { backgroundColor: primaryColor }]
              ]}
              onPress={() => setSelectedSort(option.id)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={option.icon as any} 
                size={14} 
                color={selectedSort === option.id ? '#FFFFFF' : '#666'} 
              />
              <Text style={[
                styles.filterChipText,
                selectedSort === option.id && styles.filterChipTextActive
              ]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Animated.View>
  )

  const renderEmptyState = () => {
    // Only show empty state if we are not loading and haven't searched yet
    if (searchQuery.trim() === '' && !categoryId) {
      return (
        <Animated.View 
          style={[
            styles.emptyContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={[styles.emptyIcon, { backgroundColor: `${primaryColor}10` }]}>
            <Ionicons name="search" size={56} color={primaryColor} />
          </View>
          <Text style={styles.emptyTitle}>Search Products</Text>
          <Text style={styles.emptySubtitle}>
            Find your perfect skincare products
          </Text>

          {/* Popular Searches */}
          <View style={styles.suggestionsSection}>
            <View style={styles.suggestionHeader}>
              <View style={[styles.suggestionIconWrapper, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="trending-up" size={16} color="#34C759" />
              </View>
              <Text style={styles.suggestionsTitle}>Popular Searches</Text>
            </View>
            <View style={styles.suggestionsGrid}>
              {POPULAR_SEARCHES.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionCard}
                  onPress={() => handleQuickSearch(search)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="search" size={16} color={primaryColor} />
                  <Text style={styles.suggestionText}>{search}</Text>
                  <Ionicons name="arrow-forward" size={14} color="#999" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.suggestionsSection}>
              <View style={styles.suggestionHeader}>
                <View style={[styles.suggestionIconWrapper, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="time" size={16} color="#A855F7" />
                </View>
                <Text style={styles.suggestionsTitle}>Recent Searches</Text>
              </View>
              <View style={styles.recentSearches}>
                {recentSearches.map((search, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.recentSearchCard}
                    onPress={() => handleQuickSearch(search)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.recentSearchLeft}>
                      <View style={[styles.recentSearchIcon, { backgroundColor: `${primaryColor}10` }]}>
                        <Ionicons name="time-outline" size={18} color={primaryColor} />
                      </View>
                      <Text style={styles.recentSearchText}>{search}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#999" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </Animated.View>
      )
    }

    if (filteredProducts.length === 0 && !isLoading) {
      return (
        <Animated.View 
          style={[
            styles.emptyContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={[styles.emptyIcon, { backgroundColor: '#FFE8E8' }]}>
            <Ionicons name="sad-outline" size={56} color="#FF3B30" />
          </View>
          <Text style={styles.emptyTitle}>No Products Found</Text>
          <Text style={styles.emptySubtitle}>
            Try adjusting your search or filters
          </Text>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: primaryColor }]} 
            onPress={clearSearch}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Clear Filters</Text>
          </TouchableOpacity>
        </Animated.View>
      )
    }

    return null
  }

  const renderProductItem = ({ item }: { item: Product }) => (
    <View style={styles.productCardWrapper}>
      <ProductCard
        product={item}
        onPress={() => router.push({
          pathname: '/(stacks)/ProductDetailScreen',
          params: { productId: item.productId }
        })}
      />
    </View>
  )

  const renderResults = () => (
    <View style={styles.resultsContainer}>
      <View style={styles.resultsHeader}>
        <View style={styles.resultsLeft}>
          <View style={[styles.resultsIcon, { backgroundColor: `${primaryColor}15` }]}>
            <Ionicons name="checkmark-circle" size={18} color={primaryColor} />
          </View>
          <Text style={styles.resultsText}>
            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
          </Text>
        </View>
        {(selectedSkinType || selectedSort !== 'relevance') && (
          <TouchableOpacity 
            onPress={() => {
              setSelectedSkinType(null)
              setSelectedSort('relevance')
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.clearFiltersLink, { color: primaryColor }]}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={item => item.productId}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.productsList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
        
        {/* Decorative Background */}
        <View style={styles.backgroundPattern}>
          <View style={[styles.circle1, { backgroundColor: `${primaryColor}08` }]} />
          <View style={[styles.circle2, { backgroundColor: `${primaryColor}05` }]} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          {renderSearchBar()}
        </View>

        <View style={styles.loadingContainer}>
          <View style={[styles.loadingIcon, { backgroundColor: `${primaryColor}15` }]}>
            <ActivityIndicator size="large" color={primaryColor} />
          </View>
          <Text style={styles.loadingText}>Searching products...</Text>
        </View>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
        
        {/* Decorative Background */}
        <View style={styles.backgroundPattern}>
          <View style={[styles.circle1, { backgroundColor: `${primaryColor}08` }]} />
          <View style={[styles.circle2, { backgroundColor: `${primaryColor}05` }]} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          {renderSearchBar()}
        </View>

        <View style={styles.errorContainer}>
          <View style={[styles.errorIcon, { backgroundColor: '#FFE8E8' }]}>
            <Ionicons name="alert-circle" size={56} color="#FF3B30" />
          </View>
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: primaryColor }]} 
            onPress={handleSearch}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      
      {/* Decorative Background */}
      <View style={styles.backgroundPattern}>
        <View style={[styles.circle1, { backgroundColor: `${primaryColor}08` }]} />
        <View style={[styles.circle2, { backgroundColor: `${primaryColor}05` }]} />
      </View>

      {/* Header with Search Bar */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        {renderSearchBar()}
      </View>

      {/* Filters */}
      {showFilters && renderFilters()}

      {/* Content */}
      {filteredProducts.length > 0 ? (
        renderResults()
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderEmptyState()}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    top: -150,
    right: -80,
  },
  circle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    top: -80,
    left: -60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  filterIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.2,
  },
  chipScroll: {
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 28,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
  },
  suggestionsSection: {
    width: '100%',
    marginBottom: 32,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  suggestionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.2,
  },
  suggestionsGrid: {
    gap: 12,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  recentSearches: {
    gap: 10,
  },
  recentSearchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  recentSearchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  recentSearchIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentSearchText: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  resultsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultsIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsText: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '700',
  },
  clearFiltersLink: {
    fontSize: 14,
    fontWeight: '700',
  },
  productsList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  productCardWrapper: {
    width: CARD_WIDTH,
  },
})