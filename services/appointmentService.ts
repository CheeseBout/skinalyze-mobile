import { ApiResponse } from "@/types/api";
import apiService from "./apiService";

import {
  CreateAppointmentDto,
  CreateSubscriptionAppointmentDto,
  AppointmentReservationResult,
} from "@/types/appointment.type";

class AppointmentService {
  // Pay as you go appointment
  async createReservation(
    dto: CreateAppointmentDto
  ): Promise<AppointmentReservationResult> {
    try {
      const response = await apiService.post<
        ApiResponse<AppointmentReservationResult>
      >("/appointments", dto);
      return response.data;
    } catch (error) {
      console.error("Error creating reservation:", error);
      throw error;
    }
  }

  async createSubscriptionAppointment(
    dto: CreateSubscriptionAppointmentDto
  ): Promise<any> {
    try {
      const response = await apiService.post<ApiResponse<any>>(
        "/appointments/use-subscription",
        dto
      );
      return response.data;
    } catch (error) {
      console.error("Error creating subscription appointment:", error);
      throw error;
    }
  }
}

export default new AppointmentService();
