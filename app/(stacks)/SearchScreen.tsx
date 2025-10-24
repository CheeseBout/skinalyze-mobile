import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  ScrollView,
  Dimensions
} from 'react-native'
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import productService, { Product } from '@/services/productService'
import ProductCard from '@/components/ProductCard'

const { width } = Dimensions.get('window')
const CARD_WIDTH = (width - 48) / 2

const POPULAR_SEARCHES = [
  'Vitamin C',
  'Sunscreen',
  'Moisturizer',
  'Cleanser',
  'Eye Cream',
  'Serum',
  'Clay Mask',
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
  { id: 'relevance', label: 'Relevance' },
  { id: 'price-low', label: 'Price: Low to High' },
  { id: 'price-high', label: 'Price: High to Low' },
  { id: 'rating', label: 'Highest Rated' },
  { id: 'newest', label: 'Newest' },
]

export default function SearchScreen() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSkinType, setSelectedSkinType] = useState<string | null>(null)
  const [selectedSort, setSelectedSort] = useState('relevance')
  const [showFilters, setShowFilters] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  useEffect(() => {
    loadRecentSearches()
  }, [])

  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch()
    } else {
      setFilteredProducts([])
    }
  }, [searchQuery])

  useEffect(() => {
    if (products.length > 0) {
      applyFiltersAndSort()
    }
  }, [products, selectedSkinType, selectedSort])

  const loadRecentSearches = () => {
    // TODO: Load from AsyncStorage
    setRecentSearches(['Vitamin C', 'Sunscreen'])
  }

  const saveRecentSearch = (query: string) => {
    // TODO: Save to AsyncStorage
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5)
    setRecentSearches(updated)
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      setIsLoading(true)
      setError(null)
      
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

    // Filter by skin type
    if (selectedSkinType) {
      results = results.filter(product =>
        product.suitableFor?.includes(selectedSkinType)
      )
    }

    // Sort
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
  }

  const clearSearch = () => {
    setSearchQuery('')
    setProducts([])
    setFilteredProducts([])
    setSelectedSkinType(null)
    setSelectedSort('relevance')
  }

  const renderSearchBar = () => (
    <View style={styles.searchBarContainer}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search skincare products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity 
        style={styles.filterButton}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Ionicons name="options" size={24} color="#007AFF" />
      </TouchableOpacity>
    </View>
  )

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {/* Skin Type Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Skin Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              !selectedSkinType && styles.filterChipActive
            ]}
            onPress={() => setSelectedSkinType(null)}
          >
            <Text style={[
              styles.filterChipText,
              !selectedSkinType && styles.filterChipTextActive
            ]}>All</Text>
          </TouchableOpacity>
          {SKIN_TYPES.map(type => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.filterChip,
                selectedSkinType === type.id && styles.filterChipActive
              ]}
              onPress={() => setSelectedSkinType(type.id)}
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
        <Text style={styles.filterTitle}>Sort By</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {SORT_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.filterChip,
                selectedSort === option.id && styles.filterChipActive
              ]}
              onPress={() => setSelectedSort(option.id)}
            >
              <Text style={[
                styles.filterChipText,
                selectedSort === option.id && styles.filterChipTextActive
              ]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  )

  const renderEmptyState = () => {
    if (searchQuery.trim() === '') {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search" size={80} color="#E5E5E5" />
          <Text style={styles.emptyTitle}>Search for Products</Text>
          <Text style={styles.emptySubtitle}>
            Find your perfect skincare products
          </Text>

          {/* Popular Searches */}
          <View style={styles.suggestionsSection}>
            <Text style={styles.suggestionsTitle}>Popular Searches</Text>
            <View style={styles.suggestionsContainer}>
              {POPULAR_SEARCHES.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionChip}
                  onPress={() => handleQuickSearch(search)}
                >
                  <Ionicons name="search" size={16} color="#666" />
                  <Text style={styles.suggestionText}>{search}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.suggestionsSection}>
              <Text style={styles.suggestionsTitle}>Recent Searches</Text>
              <View style={styles.recentSearches}>
                {recentSearches.map((search, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.recentSearchItem}
                    onPress={() => handleQuickSearch(search)}
                  >
                    <Ionicons name="time-outline" size={20} color="#999" />
                    <Text style={styles.recentSearchText}>{search}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      )
    }

    if (filteredProducts.length === 0 && !isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="sad-outline" size={80} color="#E5E5E5" />
          <Text style={styles.emptyTitle}>No Products Found</Text>
          <Text style={styles.emptySubtitle}>
            Try adjusting your search or filters
          </Text>
          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearSearch}>
            <Text style={styles.clearFiltersText}>Clear All Filters</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return null
  }

  const renderProductItem = ({ item }: { item: Product }) => (
    <View style={styles.productCardWrapper}>
      <ProductCard
        product={item}
        onPress={() => router.push(`/(stacks)/ProductDetailScreen?productId=${item.productId}`)}
      />
    </View>
  )

  const renderResults = () => (
    <View style={styles.resultsContainer}>
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {filteredProducts.length} {filteredProducts.length === 1 ? 'result' : 'results'} found
        </Text>
        {(selectedSkinType || selectedSort !== 'relevance') && (
          <TouchableOpacity onPress={() => {
            setSelectedSkinType(null)
            setSelectedSort('relevance')
          }}>
            <Text style={styles.clearFiltersLink}>Clear Filters</Text>
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

  return (
    <View style={styles.container}>
      {/* Header with Search Bar */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        {renderSearchBar()}
      </View>

      {/* Filters (Collapsible) */}
      {showFilters && renderFilters()}

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Searching products...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleSearch}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : filteredProducts.length > 0 ? (
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
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    padding: 8,
  },
  filtersContainer: {
    backgroundColor: '#FFF',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filterSection: {
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginLeft: 16,
    marginBottom: 8,
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  suggestionsSection: {
    width: '100%',
    marginTop: 32,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
  },
  suggestionText: {
    fontSize: 14,
    color: '#666',
  },
  recentSearches: {
    width: '100%',
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  recentSearchText: {
    fontSize: 15,
    color: '#1A1A1A',
  },
  clearFiltersButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  clearFiltersText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  clearFiltersLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  productsList: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  productCardWrapper: {
    width: CARD_WIDTH,
    marginBottom: 16,
  },
})