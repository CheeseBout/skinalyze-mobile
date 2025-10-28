import apiService from "./apiService";

interface User {
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
}

interface Dermatologist {
  dermatologistId: string;
  userId: string;
  user: User;
  specialization: string[];
  yearsOfExperience: number;
  bio: string;
  clinicAddress: string;
  consultationFee: number;
  createdAt: string;
  updatedAt: string;
}

class DermatologistService {
  async getDermatologistList(): Promise<Dermatologist[]> {
    try {
      const response = await apiService.get<Dermatologist[]>('/dermatologists');
      return response;
    } catch (error) {
      console.error('Error fetching dermatologist list:', error);
      throw error;
    }
  }

  async getDermatologistById(id: string): Promise<Dermatologist> {
    try {
      const response = await apiService.get<Dermatologist>(`/dermatologists/${id}`);
      return response;
    } catch (error) {
      console.error(`Error fetching dermatologist with ID ${id}:`, error);
      throw error;
    }
  }

  async getDermatologistByUserId(userId: string): Promise<Dermatologist> {
    try {
      const response = await apiService.get<Dermatologist>(`/dermatologists/user/${userId}`);
      return response;
    } catch (error) {
      console.error(`Error fetching dermatologist with user ID ${userId}:`, error);
      throw error;
    }
  }

  async getAvailability(userId: string, date: string): Promise<string[]> {
    try {
        return ["10:00 AM", "11:00 AM", "2:00 PM"];
    } catch (error) {
        console.error(`Error fetching availability for user ID ${userId} on ${date}:`, error);
        throw error;
    }
  }

}

export default new DermatologistService();
export type { Dermatologist, User };