import apiService from "./apiService";

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REJECTED';

export interface User {
  userId: string;
  email: string;
  fullName: string;
  dob: string;
  photoUrl: string | null;
  phone: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  isVerified: boolean;
}

export interface Customer {
  customerId: string;
  user: User;
  aiUsageAmount: number;
  allergicTo: string[];
  pastDermatologicalHistory: string[];
  purchaseHistory: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  productId: string;
  productName: string;
  productDescription: string;
  stock: number;
  brand: string;
  sellingPrice: number;
  productImages: string[];
  ingredients: string;
  suitableFor: string[];
  reviews: any[];
  salePercentage: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  orderItemId: string;
  orderId: string;
  product: Product;
  productId: string;
  priceAtTime: string;
  quantity: number;
}

export interface Order {
  orderId: string;
  customer: Customer;
  customerId: string;
  payment: any | null;
  paymentId: string | null;
  status: OrderStatus;
  shippingAddress: string;
  notes: string | null;
  rejectionReason: string | null;
  processedBy: string | null;
  orderItems: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrdersResponse {
  statusCode: number;
  message: string;
  data: Order[];
  timestamp: string;
}

export interface OrderDetailResponse {
  statusCode: number;
  message: string;
  data: Order;
  timestamp: string;
}

class OrderService {
  /**
   * Get all orders for the current user
   */
  async getMyOrders(token: string): Promise<Order[]> {
    try {
      const response = await apiService.get<OrdersResponse>(
        '/orders/my-orders',
        { token }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  /**
   * Get a specific order by ID
   */
  async getOrderById(orderId: string, token: string): Promise<Order> {
    try {
      const response = await apiService.get<OrderDetailResponse>(
        `/orders/${orderId}`,
        { token }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching order detail:', error);
      throw error;
    }
  }

  /**
   * Calculate total price for an order
   */
  calculateOrderTotal(orderItems: OrderItem[]): number {
    return orderItems.reduce((total, item) => {
      return total + (parseFloat(item.priceAtTime) * item.quantity);
    }, 0);
  }

  /**
   * Calculate total items count
   */
  calculateTotalItems(orderItems: OrderItem[]): number {
    return orderItems.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Get status color for UI
   */
  getStatusColor(status: OrderStatus): string {
    const colorMap: Record<OrderStatus, string> = {
      PENDING: '#FFA500',
      PROCESSING: '#2196F3',
      SHIPPED: '#9C27B0',
      DELIVERED: '#4CAF50',
      CANCELLED: '#F44336',
      REJECTED: '#F44336',
    };
    return colorMap[status] || '#757575';
  }

  /**
   * Get status label in Vietnamese
   */
  getStatusLabel(status: OrderStatus): string {
    const labelMap: Record<OrderStatus, string> = {
      PENDING: 'Chờ xử lý',
      PROCESSING: 'Đang xử lý',
      SHIPPED: 'Đang giao',
      DELIVERED: 'Đã giao',
      CANCELLED: 'Đã hủy',
      REJECTED: 'Từ chối',
    };
    return labelMap[status] || status;
  }

  /**
   * Format currency (VND)
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  /**
   * Format date
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
}

export default new OrderService();
