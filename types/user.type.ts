export interface User {
  userId: string;
  fullName: string;
  email: string;
  balance?: number;
  dob: string;
  phone: string;
  photoUrl?: string;
  address: string;
  gender: boolean;
  role: string;
  isActive?: boolean;
  isVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}
