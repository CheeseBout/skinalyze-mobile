export interface SkinAnalysis {
  analysisId: string;
  customerId: string;
  source: "AI_SCAN" | "MANUAL";
  chiefComplaint: string | null;
  patientSymptoms: string | null;
  imageUrls: string[];
  notes: string | null;
  aiDetectedDisease: string | null;
  aiDetectedCondition: string | null;
  aiRecommendedProducts: string[] | null;
  mask: string | string[] | null; // Can be string or array
  createdAt: string;
  updatedAt: string;
}