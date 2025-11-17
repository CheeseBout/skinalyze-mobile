import apiService from "./apiService";
import { User, Address } from "./authService";

interface UserProfileResponse {
  statusCode: number;
  message: string;
  data: User;
  timestamp: string;
}

interface AddressResponse {
  statusCode: number;
  message: string;
  data: Address;
  timestamp: string;
}

interface DeleteResponse {
  statusCode: number;
  message: string;
  timestamp: string;
}

interface BalanceData {
  userId: string;
  email: string;
  fullName: string;
  balance: number;
  currency: string;
}

interface BalanceResponse {
  statusCode: number;
  message: string;
  data: BalanceData;
  timestamp: string;
}

interface CustomerData {
  customerId: string;
  user: User;
  aiUsageAmount: number;
  allergicTo: string[];
  pastDermatologicalHistory: string[];
  purchaseHistory: any[];
  createdAt: string;
  updatedAt: string;
}

interface CustomerResponse {
  statusCode: number;
  message: string;
  data: CustomerData;
  timestamp: string;
}

interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
  dob?: string;
  photoUrl?: string;
}

interface CreateAddressPayload {
  userId: string;
  street: string;
  streetLine1: string;
  streetLine2?: string;
  wardOrSubDistrict: string;
  district: string;
  city: string;
}

interface UpdateAddressPayload {
  street?: string;
  streetLine1?: string;
  streetLine2?: string;
  wardOrSubDistrict?: string;
  district?: string;
  city?: string;
}

class UserService {
  async getProfile(token: string): Promise<User> {
    try {
      const response = await apiService.get<UserProfileResponse>(
        "/users/profile"
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      throw new Error("Failed to fetch user profile");
    }
  }

  async getCustomerByUserId(
    userId: string,
    token: string
  ): Promise<CustomerData> {
    try {
      console.log("📋 Fetching customer data for user:", userId);
      const response = await apiService.get<CustomerResponse>(
        `/customers/user/${userId}`
      );
      console.log("✅ Customer data retrieved:", response.data.customerId);
      return response.data;
    } catch (error) {
      console.error("Error fetching customer data:", error);
      throw new Error("Failed to fetch customer data");
    }
  }

  async updateProfile(
    token: string,
    data: UpdateProfilePayload
  ): Promise<User> {
    try {
      const response = await apiService.patch<UserProfileResponse>(
        "/users/profile",
        data
      );
      return response.data;
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw new Error("Failed to update user profile");
    }
  }

  async changePassword(
    token: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      await apiService.patch("/users/change-password", {
        oldPassword,
        newPassword,
      });
    } catch (error) {
      console.error("Error changing password:", error);
      throw new Error("Failed to change password");
    }
  }

  async getAddress(addressId: string, token: string): Promise<Address> {
    try {
      const response = await apiService.get<AddressResponse>(
        `/address/${addressId}`
      );
      return response.data;
    } catch (error) {
      console.error("Error getting address:", error);
      throw new Error("Failed to get address");
    }
  }

  async createAddress(
    token: string,
    data: CreateAddressPayload
  ): Promise<Address> {
    try {
      const response = await apiService.post<AddressResponse>("/address", data);
      return response.data;
    } catch (error) {
      console.error("Error creating address:", error);
      throw new Error("Failed to create address");
    }
  }

  async updateAddress(
    token: string,
    addressId: string,
    data: UpdateAddressPayload
  ): Promise<Address> {
    try {
      const response = await apiService.patch<AddressResponse>(
        `/address/${addressId}`,
        data
      );
      return response.data;
    } catch (error) {
      console.error("Error updating address:", error);
      throw new Error("Failed to update address");
    }
  }

  async deleteAddress(token: string, addressId: string): Promise<void> {
    try {
      await apiService.delete<DeleteResponse>(`/address/${addressId}`);
    } catch (error) {
      console.error("Error deleting address:", error);
      throw new Error("Failed to delete address");
    }
  }

  async getBalance(token: string): Promise<BalanceData> {
    try {
      const response = await apiService.get<BalanceResponse>("/users/balance");
      return response.data;
    } catch (error) {
      console.error("Error fetching user balance:", error);
      throw new Error("Failed to fetch user balance");
    }
  }
}

export const userService = new UserService();
export default userService;
