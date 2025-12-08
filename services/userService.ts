import apiService from "./apiService";
import { User, Address } from "./authService";

// --- Interfaces ---
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

interface UploadPhotoData {
  userId: string;
  photoUrl: string;
}

interface UploadPhotoResponse {
  statusCode: number;
  message: string;
  data: UploadPhotoData;
  timestamp: string;
}

class UserService {
  // --- SỬA HÀM NÀY ---
  async getProfile(token: string): Promise<User> {
    try {
      // Dùng any để linh hoạt kiểm tra cấu trúc trả về
      const response = await apiService.get<any>("/users/profile");
      
      console.log("🔍 UserService Raw Response:", JSON.stringify(response, null, 2));

      if (response && response.data) {
        return response.data;
      }
      
      if (response && (response.userId || response.email)) {
        return response;
      }

      console.warn("⚠️ UserService: Unknown profile structure, returning raw response");
      return response;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      throw error; 
    }
  }

  async getCustomerByUserId(
    userId: string,
    token: string
  ): Promise<CustomerData> {
    try {
      const response = await apiService.get<CustomerResponse>(
        `/customers/user/${userId}`
      );
      return response.data || (response as any);
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
      const response = await apiService.patch<any>(
        "/users/profile",
        data
      );
      // Kiểm tra linh hoạt
      return response.data || response;
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
      return response.data || (response as any);
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
      return response.data || (response as any);
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
      return response.data || (response as any);
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

  async getBalance(): Promise<BalanceData> {
    try {
      const response = await apiService.get<BalanceResponse>("/users/balance");
      console.log("❤️ BALANCEEEE", response);
      return response.data || (response as any);
    } catch (error) {
      console.error("Error fetching user balance:", error);
      throw new Error("Failed to fetch user balance");
    }
  }

  /**
   * Upload profile photo
   * @param imageUri - Local image URI from picker/camera
   * @returns Upload result with new photoUrl
   */
  async uploadProfilePhoto(imageUri: string): Promise<UploadPhotoData> {
    try {
      const formData = new FormData();

      // Extract filename and determine type
      const filename = imageUri.split("/").pop() || "profile_photo.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      formData.append("photo", {
        uri: imageUri,
        name: filename,
        type: type,
      } as any);

      console.log("📤 Uploading profile photo...");

      const result = await apiService.uploadFile<UploadPhotoResponse>(
        "/users/upload-photo",
        formData
      );

      console.log("✅ Profile photo uploaded:", result.data);
      return result.data || (result as any);
    } catch (error) {
      console.error("❌ Error uploading profile photo:", error);
      throw new Error("Failed to upload profile photo");
    }
  }
}

export const userService = new UserService();
export default userService;