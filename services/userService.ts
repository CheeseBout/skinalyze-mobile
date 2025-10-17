import apiService from './apiService';
import { User } from './authService';

interface UserProfileResponse {
  statusCode: number;
  message: string;
  data: User;
  timestamp: string;
}

interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
  dob?: string;
  photoUrl?: string;
}

interface UpdateAddressPayload {
  addressId: string;
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
      const response = await apiService.get<UserProfileResponse>('/users/profile', { token });
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile');
    }
  }

  async updateProfile(token: string, data: UpdateProfilePayload): Promise<User> {
    try {
      const response = await apiService.patch<UserProfileResponse>(
        '/users/profile', 
        data, 
        { token }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  async updateAddress(token: string, data: UpdateAddressPayload): Promise<User> {
    try {
      const response = await apiService.patch<UserProfileResponse>(
        `/users/addresses/${data.addressId}`, 
        data, 
        { token }
      );
      return response.data;
    } catch (error) {
      throw new Error('Failed to update user address');
    }
  }

  async changePassword(
    token: string, 
    oldPassword: string, 
    newPassword: string
  ): Promise<void> {
    try {
      await apiService.patch(
        '/users/change-password', 
        { oldPassword, newPassword }, 
        { token }
      );
    } catch (error) {
      console.error('Error changing password:', error);
      throw new Error('Failed to change password');
    }
  }
}

export const userService = new UserService();
export default userService;