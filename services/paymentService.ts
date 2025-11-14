import { ApiResponse } from "@/types/api";
import apiService from "./apiService";

export interface PaymentStatusResponse {
  paymentCode: string;
  status: "pending" | "completed" | "expired" | "failed";
  amount: number;
  paidAmount?: number;
  paymentMethod?: string;
  createdAt: string;
  expiredAt: string;
  paidAt?: string;
  order?: {
    orderId: string;
    status: string;
  } | null;
}



class PaymentService {
  async checkPaymentStatus(
    paymentCode: string
  ): Promise<PaymentStatusResponse> {
    try {
      const response = await apiService.get<ApiResponse<PaymentStatusResponse>>(
        `/payments/check/${paymentCode}`
      );

      return response.data;
    } catch (error) {
      console.error("Error checking payment status:", error);
      throw error;
    }
  }
}

export default new PaymentService();
