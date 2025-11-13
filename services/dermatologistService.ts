import { Dermatologist } from "@/types/dermatologist.type";
import { ApiResponse } from "./../types/api";
import apiService from "./apiService";
import { AvailabilitySlot } from "@/types/availability-slot.type";

class DermatologistService {
  async getDermatologistList(): Promise<Dermatologist[]> {
    try {
      const response = await apiService.get<ApiResponse<Dermatologist[]>>(
        "/dermatologists"
      );

      return response.data;
    } catch (error) {
      console.error("Error fetching dermatologist list:", error);
      throw error;
    }
  }

  async getDermatologistById(id: string): Promise<Dermatologist> {
    try {
      const response = await apiService.get<ApiResponse<Dermatologist>>(
        `/dermatologists/${id}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching dermatologist with ID ${id}:`, error);
      throw error;
    }
  }

  async getDermatologistByUserId(userId: string): Promise<Dermatologist> {
    try {
      const response = await apiService.get<Dermatologist>(
        `/dermatologists/user/${userId}`
      );
      return response;
    } catch (error) {
      console.error(
        `Error fetching dermatologist with user ID ${userId}:`,
        error
      );
      throw error;
    }
  }

  async getAvailability(userId: string, date: string): Promise<string[]> {
    try {
      return ["10:00 AM", "11:00 AM", "2:00 PM"];
    } catch (error) {
      console.error(
        `Error fetching availability for user ID ${userId} on ${date}:`,
        error
      );
      throw error;
    }
  }

  async getAvailabilitySummary(
    dermatologistId: string,
    month: number,
    year: number
  ): Promise<string[]> {
    try {
      const response = await apiService.get<ApiResponse<string[]>>(
        `/dermatologists/${dermatologistId}/availability-summary`,
        {
          params: { month, year },
        }
      );
      console.log("Calendar", response);

      return response.data;
    } catch (error) {
      console.error("Error fetching availability summary:", error);
      throw error;
    }
  }

  async getAvailabilityForDay(
    dermatologistId: string,
    date: string
  ): Promise<AvailabilitySlot[]> {
    try {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const response = await apiService.get<ApiResponse<AvailabilitySlot[]>>(
        `/dermatologists/${dermatologistId}/availability`,
        {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Error fetching availability for day ${date}:`, error);
      throw error;
    }
  }
}

export default new DermatologistService();
