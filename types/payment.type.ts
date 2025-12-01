export enum PaymentStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  EXPIRED = "EXPIRED",
}

export interface Payment {
  paymentId: string;
  paymentCode: string;
  status: PaymentStatus;
  amount: number;
  paymentMethod: string | null;
  paidAt: string | null;
  expiredAt: string;
}
