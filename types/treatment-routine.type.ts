export enum RoutineStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export interface TreatmentRoutine {
  routineId: string;
  routineName: string;
  status: RoutineStatus;
  createdAt: string;
}
