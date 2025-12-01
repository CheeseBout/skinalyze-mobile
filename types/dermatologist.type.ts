import { User } from "./user.type";

export interface Dermatologist {
  dermatologistId: string;
  userId: string;
  user: User;
  specialization: string[];
  yearsOfExperience: number;
  bio: string;
  clinicAddress: string;
  defaultSlotPrice: number;
  createdAt: string;
  updatedAt: string;
}
