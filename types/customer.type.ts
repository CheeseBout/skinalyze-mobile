export interface Customer {
  customerId: string;
  userId: string;
  aiUsageAmount: number;
  allergicTo: string[];
  pastDermatologicalHistory: string[];
  purchaseHistory?: string[];
  user?: any;
}
