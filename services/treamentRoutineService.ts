import { ApiResponse } from "@/types/api";
import apiService from "./apiService";
import { TreatmentRoutine } from "@/types/treatment-routine.type";

class TreatmentRoutineService {
  async getCustomerRoutines(customerId: string): Promise<TreatmentRoutine[]> {
    try {
      const response = await apiService.get<ApiResponse<TreatmentRoutine[]>>(
        `/treatment-routines/customer/${customerId}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching customer routines:", error);
      throw error;
    }
  }
}

export default new TreatmentRoutineService();
