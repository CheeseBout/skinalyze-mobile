import apiService from "./apiService";
import { User, Address } from "./authService";

// --- VN Public API Base URL ---
const VN_PUBLIC_API_BASE_URL = "https://vn-public-apis.fpo.vn";

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

// --- VN Public API Interfaces ---
/**
 * Tỉnh/Thành phố
 */
export interface Province {
  code: string;
  name: string;
  name_with_type: string;
  slug: string;
  type: string;
}

/**
 * Quận/Huyện
 */
export interface District {
  code: string;
  name: string;
  name_with_type: string;
  slug: string;
  type: string;
  province_code: string;
}

/**
 * Xã/Phường/Thị trấn
 */
export interface Commune {
  code: string;
  name: string;
  name_with_type: string;
  slug: string;
  type: string;
  district_code: string;
}

/**
 * Response từ VN Public API
 */
interface VNPublicAPIResponse<T> {
  data: {
    data: T[];
    total: number;
    page: number;
    limit: number;
  };
  error: {
    message: string;
  };
}

class UserService {
  async getProfile(token: string): Promise<User> {
    try {
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

  // ==================== VN PUBLIC API INTEGRATION ====================

  /**
   * Lấy danh sách tất cả tỉnh/thành phố
   * @param searchQuery - Từ khóa tìm kiếm (optional)
   * @returns Danh sách các tỉnh/thành phố
   * 
   * @example
   * // Lấy tất cả tỉnh/thành
   * const provinces = await userService.getProvinces();
   * 
   * // Tìm kiếm theo từ khóa
   * const provinces = await userService.getProvinces("ninh");
   */
  async getProvinces(searchQuery?: string): Promise<Province[]> {
    try {
      let url = `${VN_PUBLIC_API_BASE_URL}/provinces/getAll?limit=-1`;
      
      if (searchQuery) {
        url += `&q=${encodeURIComponent(searchQuery)}&cols=name,name_with_type`;
      }
      
      console.log("🌍 Fetching provinces from VN Public API:", url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // API trả về { data: { data: [...], total, page, limit }, error: {...} }
      const provinces = result.data?.data || [];
      console.log(`✅ Fetched ${provinces.length} provinces`);
      
      return provinces;
    } catch (error) {
      console.error("❌ Error fetching provinces from VN Public API:", error);
      throw new Error("Failed to fetch provinces");
    }
  }

  /**
   * Lấy danh sách quận/huyện theo tỉnh
   * @param provinceCode - Code của tỉnh/thành (VD: "01" cho Hà Nội, "79" cho TP.HCM)
   * @param searchQuery - Từ khóa tìm kiếm (optional)
   * @returns Danh sách các quận/huyện
   * 
   * @example
   * // Lấy danh sách quận/huyện của Hà Nội
   * const districts = await userService.getDistricts("01");
   */
  async getDistricts(
    provinceCode: string,
    searchQuery?: string
  ): Promise<District[]> {
    try {
      let url = `${VN_PUBLIC_API_BASE_URL}/districts/getByProvince?provinceCode=${provinceCode}&limit=-1`;
      
      if (searchQuery) {
        url += `&q=${encodeURIComponent(searchQuery)}&cols=name,name_with_type`;
      }
      
      console.log("🏙️ Fetching districts from VN Public API:", url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const districts = result.data?.data || [];
      
      console.log(`✅ Fetched ${districts.length} districts for province ${provinceCode}`);
      
      return districts;
    } catch (error) {
      console.error("❌ Error fetching districts from VN Public API:", error);
      throw new Error("Failed to fetch districts");
    }
  }

  /**
   * Lấy danh sách xã/phường/thị trấn theo quận/huyện
   * @param districtCode - Code của quận/huyện
   * @param searchQuery - Từ khóa tìm kiếm (optional)
   * @returns Danh sách các xã/phường/thị trấn
   * 
   * @example
   * // Lấy danh sách xã/phường của quận Ba Đình
   * const wards = await userService.getWardsByDistrict("001");
   */
  async getWardsByDistrict(
    districtCode: string,
    searchQuery?: string
  ): Promise<Commune[]> {
    try {
      let url = `${VN_PUBLIC_API_BASE_URL}/wards/getByDistrict?districtCode=${districtCode}&limit=-1`;
      
      if (searchQuery) {
        url += `&q=${encodeURIComponent(searchQuery)}&cols=name,name_with_type`;
      }
      
      console.log("🏘️ Fetching wards from VN Public API:", url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const wards = result.data?.data || [];
      
      console.log(`✅ Fetched ${wards.length} wards for district ${districtCode}`);
      
      return wards;
    } catch (error) {
      console.error("❌ Error fetching wards from VN Public API:", error);
      throw new Error("Failed to fetch wards");
    }
  }

  /**
   * Lấy danh sách TẤT CẢ quận/huyện
   * @param searchQuery - Từ khóa tìm kiếm (optional)
   * @returns Danh sách tất cả quận/huyện
   */
  async getAllDistricts(searchQuery?: string): Promise<District[]> {
    try {
      let url = `${VN_PUBLIC_API_BASE_URL}/districts/getAll?limit=-1`;
      
      if (searchQuery) {
        url += `&q=${encodeURIComponent(searchQuery)}&cols=name,name_with_type`;
      }
      
      console.log("🏙️ Fetching all districts from VN Public API:", url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const districts = result.data?.data || [];
      
      console.log(`✅ Fetched ${districts.length} total districts`);
      
      return districts;
    } catch (error) {
      console.error("❌ Error fetching all districts from VN Public API:", error);
      throw new Error("Failed to fetch all districts");
    }
  }

  /**
   * Lấy danh sách TẤT CẢ xã/phường/thị trấn
   * @param searchQuery - Từ khóa tìm kiếm (optional)
   * @returns Danh sách tất cả xã/phường/thị trấn
   */
  async getAllWards(searchQuery?: string): Promise<Commune[]> {
    try {
      let url = `${VN_PUBLIC_API_BASE_URL}/wards/getAll?limit=-1`;
      
      if (searchQuery) {
        url += `&q=${encodeURIComponent(searchQuery)}&cols=name,name_with_type`;
      }
      
      console.log("🏘️ Fetching all wards from VN Public API:", url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const wards = result.data?.data || [];
      
      console.log(`✅ Fetched ${wards.length} total wards`);
      
      return wards;
    } catch (error) {
      console.error("❌ Error fetching all wards from VN Public API:", error);
      throw new Error("Failed to fetch all wards");
    }
  }

  /**
   * Tìm kiếm tỉnh/thành theo tên
   * @param searchText - Text để tìm kiếm
   * @returns Danh sách các tỉnh/thành phù hợp
   */
  async searchProvinces(searchText: string): Promise<Province[]> {
    return this.getProvinces(searchText);
  }

  /**
   * Tìm kiếm quận/huyện theo tên trong một tỉnh
   * @param provinceCode - Code tỉnh/thành
   * @param searchText - Text để tìm kiếm
   * @returns Danh sách các quận/huyện phù hợp
   */
  async searchDistricts(
    provinceCode: string,
    searchText: string
  ): Promise<District[]> {
    return this.getDistricts(provinceCode, searchText);
  }

  /**
   * Tìm kiếm xã/phường theo tên trong một quận/huyện
   * @param districtCode - Code quận/huyện
   * @param searchText - Text để tìm kiếm
   * @returns Danh sách các xã/phường phù hợp
   */
  async searchWards(
    districtCode: string,
    searchText: string
  ): Promise<Commune[]> {
    return this.getWardsByDistrict(districtCode, searchText);
  }

  /**
   * Lấy thông tin đầy đủ của địa chỉ từ ward code
   * @param wardCode - Code của xã/phường
   * @param districtCode - Code của quận/huyện
   * @param provinceCode - Code của tỉnh/thành
   * @returns Thông tin đầy đủ: ward, district, province
   */
  async getFullAddressInfo(
    wardCode: string,
    districtCode: string,
    provinceCode: string
  ): Promise<{
    ward: Commune | null;
    district: District | null;
    province: Province | null;
  }> {
    try {
      const [wards, districts, provinces] = await Promise.all([
        this.getWardsByDistrict(districtCode),
        this.getDistricts(provinceCode),
        this.getProvinces(),
      ]);

      const ward = wards.find(w => w.code === wardCode) || null;
      const district = districts.find(d => d.code === districtCode) || null;
      const province = provinces.find(p => p.code === provinceCode) || null;

      return {
        ward,
        district,
        province,
      };
    } catch (error) {
      console.error("❌ Error getting full address info:", error);
      throw new Error("Failed to get full address info");
    }
  }
}

export const userService = new UserService();
export default userService;