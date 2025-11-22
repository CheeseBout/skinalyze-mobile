import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Product, Category } from '@/services/productService';
import productService from '@/services/productService';

interface ProductContextType {
  products: Product[];
  categories: Category[];
  saleProducts: Product[];
  isLoading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
  searchProducts: (query: string) => Product[];
  getProductById: (productId: string) => Product | undefined;
  getProductsByCategory: (categoryId: string) => Product[];
  getCategoryById: (categoryId: string) => Category | undefined;
}

export const ProductContext = createContext<ProductContextType>({
  products: [],
  categories: [],
  saleProducts: [],
  isLoading: true,
  error: null,
  refreshProducts: async () => {},
  searchProducts: () => [],
  getProductById: () => undefined,
  getProductsByCategory: () => [],
  getCategoryById: () => undefined,
});

interface ProductProviderProps {
  children: ReactNode;
}

export function ProductProvider({ children }: ProductProviderProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saleProducts, setSaleProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('📦 Fetching products data...');

      // Fetch products and categories in parallel
      const [productsData, categoriesData] = await Promise.all([
        productService.getAllProducts(),
        productService.getAllCategories(),
      ]);

      // In fetchAllData, pre-compute values
      const processedProducts = productsData.map(product => ({
        ...product,
        _discountedPrice: productService.calculateDiscountedPrice(product), // Cache this
        _avgRating: productService.calculateAverageRating(product),
        _stockStatus: productService.getStockStatus(product),
      }));

      setProducts(processedProducts);
      setCategories(categoriesData);

      // Filter sale products on client side
      // Products with salePercentage > 0 are considered on sale
      const onSaleProducts = productsData.filter(
        (product) => parseFloat(product.salePercentage) > 0
      );
      setSaleProducts(onSaleProducts);

      console.log('✅ Products data loaded successfully');
      console.log(`📊 Loaded ${productsData.length} products, ${categoriesData.length} categories, ${onSaleProducts.length} on sale`);
    } catch (err: any) {
      console.error('❌ Error fetching products:', err);
      setError(err.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProducts = async () => {
    console.log('🔄 Refreshing products...');
    await fetchAllData();
  };

  // Client-side search (faster than API call)
  const searchProducts = (query: string): Product[] => {
    if (!query.trim()) return products;

    const lowerQuery = query.toLowerCase();
    return products.filter(
      (product) =>
        product.productName.toLowerCase().includes(lowerQuery) ||
        product.productDescription.toLowerCase().includes(lowerQuery) ||
        product.brand.toLowerCase().includes(lowerQuery) ||
        product.categories.some(cat => 
          cat.categoryName.toLowerCase().includes(lowerQuery)
        )
    );
  };

  const getProductById = (productId: string): Product | undefined => {
    return products.find((p) => p.productId === productId);
  };

  const getProductsByCategory = (categoryId: string): Product[] => {
    return products.filter((product) =>
      product.categories.some((cat) => cat.categoryId === categoryId)
    );
  };

  const getCategoryById = (categoryId: string): Category | undefined => {
    return categories.find((c) => c.categoryId === categoryId);
  };

  const value: ProductContextType = {
    products,
    categories,
    saleProducts,
    isLoading,
    error,
    refreshProducts,
    searchProducts,
    getProductById,
    getProductsByCategory,
    getCategoryById,
  };

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}