import apiService from "./apiService";

export interface Category {
  categoryId: string;
  categoryName: string;
  categoryDescription: string;
  createdAt: string;
  updatedAt: string;
}

interface CategoryListResponse {
  statusCode: number;
  message: string;
  data: Category[];
  timestamp: string;
}

interface CategoryResponse {
  statusCode: number;
  message: string;
  data: Category;
  timestamp: string;
}

export interface Review {
  userId: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Product {
  productId: string;
  productName: string;
  productDescription: string;
  stock: number;
  categories: Category[];
  brand: string;
  sellingPrice: number;
  productImages: string[];
  ingredients: string;
  suitableFor: string[];
  reviews: Review[];
  salePercentage: string;
  createdAt: string;
  updatedAt: string;
}

interface ProductListResponse {
  statusCode: number;
  message: string;
  data: Product[];
  timestamp: string;
}

interface ProductResponse {
  statusCode: number;
  message: string;
  data: Product;
  timestamp: string;
}

class ProductService {
  async getAllCategories(): Promise<Category[]> {
    try {
      console.log('📦 Fetching all categories...');
      const response = await apiService.get<CategoryListResponse>('/categories');
      console.log('✅ Categories response:', response);
      
      // The response might be directly the data array or wrapped in response.data
      if (Array.isArray(response)) {
        return response;
      }
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      
      console.error('Unexpected categories response structure:', response);
      return [];
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      throw new Error('Failed to fetch categories');
    }
  }

  async getCategoryById(categoryId: string): Promise<Category> {
    try {
      console.log(`📦 Fetching category ${categoryId}...`);
      const response = await apiService.get<CategoryResponse>(`/categories/${categoryId}`);
      
      if (response.data) {
        return response.data;
      }
      
      throw new Error('Invalid category response structure');
    } catch (error) {
      console.error('❌ Error fetching category by ID:', error);
      throw new Error('Failed to fetch category by ID');
    }
  }

  async getAllProducts(): Promise<Product[]> {
    try {
      console.log('🛍️ Fetching all products...');
      const response = await apiService.get<ProductListResponse>('/products');
      console.log('✅ Products response:', response);
      
      // The response might be directly the data array or wrapped in response.data
      if (Array.isArray(response)) {
        console.log(`📊 Loaded ${response.length} products`);
        return response;
      }
      if (response.data && Array.isArray(response.data)) {
        console.log(`📊 Loaded ${response.data.length} products`);
        return response.data;
      }
      
      console.error('Unexpected products response structure:', response);
      return [];
    } catch (error) {
      console.error('❌ Error fetching all products:', error);
      throw new Error('Failed to fetch products');
    }
  }

  async getProductById(productId: string): Promise<Product> {
    try {
      console.log(`🛍️ Fetching product ${productId}...`);
      const response = await apiService.get<ProductResponse>(`/products/${productId}`);
      
      if (response.data) {
        return response.data;
      }
      
      throw new Error('Invalid product response structure');
    } catch (error) {
      console.error('❌ Error fetching product by ID:', error);
      throw new Error('Failed to fetch product by ID');
    }
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    try {
      console.log(`🛍️ Fetching products for category ${categoryId}...`);
      const response = await apiService.get<ProductListResponse>(`/categories/${categoryId}/products`);
      
      if (Array.isArray(response)) {
        return response;
      }
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error fetching products by category:', error);
      throw new Error('Failed to fetch products by category');
    }
  }

  /**
   * Get products on sale (client-side filtering)
   */
  async getProductsOnSale(): Promise<Product[]> {
    try {
      console.log('💰 Fetching sale products...');
      const allProducts = await this.getAllProducts();
      const saleProducts = allProducts.filter(product => parseFloat(product.salePercentage) > 0);
      console.log(`✅ Found ${saleProducts.length} products on sale`);
      return saleProducts;
    } catch (error) {
      console.error('❌ Error fetching sale products:', error);
      // Gracefully handle error by returning empty array
      return [];
    }
  }

  /**
   * Search products (client-side filtering)
   */
  async searchProducts(query: string): Promise<Product[]> {
    try {
      console.log(`🔍 Searching products with query: ${query}...`);
      const allProducts = await this.getAllProducts();
      
      if (!query.trim()) {
        return allProducts;
      }
      
      const lowerQuery = query.toLowerCase();
      const results = allProducts.filter(
        (product) =>
          product.productName.toLowerCase().includes(lowerQuery) ||
          product.productDescription.toLowerCase().includes(lowerQuery) ||
          product.brand.toLowerCase().includes(lowerQuery)
      );
      
      console.log(`✅ Found ${results.length} products matching "${query}"`);
      return results;
    } catch (error) {
      console.error('❌ Error searching products:', error);
      throw new Error('Failed to search products');
    }
  }

  /**
   * Calculate discounted price
   */
  calculateDiscountedPrice(product: Product): number {
    const salePercentage = parseFloat(product.salePercentage);
    if (salePercentage > 0) {
      return product.sellingPrice * (1 - salePercentage / 100);
    }
    return product.sellingPrice;
  }

  /**
   * Calculate average rating
   */
  calculateAverageRating(product: Product): number {
    if (!product.reviews || product.reviews.length === 0) return 0;
    const sum = product.reviews.reduce((acc, review) => acc + review.rating, 0);
    return sum / product.reviews.length;
  }

  /**
   * Check if product is in stock
   */
  isInStock(product: Product): boolean {
    return product.stock > 0;
  }

  /**
   * Get stock status with color
   */
  getStockStatus(product: Product): { status: string; color: string } {
    if (product.stock === 0) {
      return { status: 'Out of Stock', color: '#FF3B30' };
    } else if (product.stock < 10) {
      return { status: 'Low Stock', color: '#FF9500' };
    } else {
      return { status: 'In Stock', color: '#34C759' };
    }
  }

  /**
   * Format price with currency
   */
  formatPrice(price: number): string {
    return new Intl.NumberFormat('vn-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  }

  /**
   * Get discount amount
   */
  getDiscountAmount(product: Product): number {
    const salePercentage = parseFloat(product.salePercentage);
    if (salePercentage > 0) {
      return product.sellingPrice * (salePercentage / 100);
    }
    return 0;
  }

  /**
   * Check if product has reviews
   */
  hasReviews(product: Product): boolean {
    return product.reviews && product.reviews.length > 0;
  }
}

export const productService = new ProductService();
export default productService;