
export interface RoutineDetail {
  routineDetailId: string;
  productIds: string[] | null;
  description: string | null;
  content: string; 
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
