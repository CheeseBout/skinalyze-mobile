export interface CustomerSubscription {
  id: string;
  customerId: string;
  planId: string;
  paymentId: string;
  sessionsRemaining: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  subscriptionPlan?: {
    planName: string;
  };
}
