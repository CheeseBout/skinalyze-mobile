export interface CustomerSubscription {
  id: string;
  customerId: string;
  planId: string;
  paymentId: string;
  sessionRemaining: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  plan?: {
    planName: string;
  };
}
