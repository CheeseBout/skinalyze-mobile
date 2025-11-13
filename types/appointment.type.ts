export enum AppointmentType {
  NEW_PROBLEM = "NEW_PROBLEM",
  FOLLOW_UP = "FOLLOW_UP",
}

// Payment as GO Appointment Reservation
export interface CreateAppointmentDto {
  dermatologistId: string;
  startTime: string;
  endTime: string;
  appointmentType: AppointmentType;

  analysisId?: string;
  trackingRoutineId?: string;

  note?: string;
}

export interface CreateSubscriptionAppointmentDto extends CreateAppointmentDto {
  customerSubscriptionId: string;
}

export interface AppointmentReservationResult {
  appointmentId: string;
  paymentCode: string;
  amount: number;
  expiredAt: string;
  qrCodeUrl: string;
}
