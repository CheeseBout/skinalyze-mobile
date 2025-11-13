// File: services/customerSubscriptionService.ts
import { ApiResponse } from "@/types/api";
import apiService from "./apiService";
import { CustomerSubscription } from "@/types/customerSubscription.type";

class CustomerSubscriptionService {
  async getMyActiveSubscriptions(): Promise<CustomerSubscription[]> {
    try {
      const response = await apiService.get<
        ApiResponse<CustomerSubscription[]>
      >("/customer-subscriptions/my");
      return response.data;
    } catch (error) {
      console.error("Error fetching my active subscriptions:", error);
      throw error;
    }
  }
}

export default new CustomerSubscriptionService();
