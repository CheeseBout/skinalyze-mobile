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
  paymentType: 'order' | 'topup' | 'booking' | 'subscription';
  order?: {
    orderId: string;
    status: string;
  } | null;
}

export interface Bank {
  id: number;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo: string;
  transferSupported?: number;
  lookupSupported?: number;
}

interface VietQRBankResponse {
  code: string;
  desc: string;
  data: Bank[];
}

class PaymentService {
  async getBanks(): Promise<Bank[]> {
    try {
      const response = await fetch("https://api.vietqr.io/v2/banks");
      const result: VietQRBankResponse = await response.json();
      
      if (result.code === "00" && result.data) {
        return result.data;
      }
      console.log(result.data)
      throw new Error("Failed to fetch banks");
    } catch (error) {
      console.error("Error fetching banks:", error);
      throw error;
    }
  }

  async checkPaymentStatus(
    paymentCode: string
  ): Promise<PaymentStatusResponse> {
    try {
      const response = await apiService.get<ApiResponse<PaymentStatusResponse>>(
        `/payments/check/${paymentCode}`
      );
      console.log(response.data)
      return response.data;
    } catch (error) {
      console.error("Error checking payment status:", error);
      throw error;
    }
  }
}

export default new PaymentService();
