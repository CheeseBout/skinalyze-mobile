import { ApiResponse } from "@/types/api";
import apiService from "./apiService";

import {
  CreateAppointmentDto,
  CreateSubscriptionAppointmentDto,
  AppointmentReservationResult,
  Appointment,
  AppointmentWithRelations,
  AppointmentStatus,
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
  async getAppointmentById(appointmentId: string) {
    try {
      const response = await apiService.get<
        ApiResponse<AppointmentWithRelations>
      >(`/appointments/${appointmentId}`);
      console.log("Appointment", response);

      return response.data;
    } catch (error) {
      console.error(
        `Error getting appointment with ID: ${appointmentId}`,
        error
      );
      throw error;
    }
  }

  async getCustomerAppointments(
    customerId: string,
    status?: AppointmentStatus
  ): Promise<AppointmentWithRelations[]> {
    try {
      const params: any = {
        customerId: customerId,
      };
      if (status) {
        params.status = status;
      }

      const response = await apiService.get<
        ApiResponse<AppointmentWithRelations[]>
      >("/appointments", { params });

      return response.data;
    } catch (error) {
      console.error("Error fetching customer appointments:", error);
      throw error;
    }
  }
}

export default new AppointmentService();
