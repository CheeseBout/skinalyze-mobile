import apiService from "./apiService";
import tokenService from "./tokenService";
import userService from "./userService";

// Type definitions based on API response
export interface SkinAnalysisResult {
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

interface SkinAnalysisResponse {
  statusCode: number;
  message: string;
  data: SkinAnalysisResult;
  timestamp: string;
}

interface SkinAnalysisListResponse {
  statusCode: number;
  message: string;
  data: SkinAnalysisResult[];
  timestamp: string;
}

class SkinAnalysisService {
  /**
   * Get customer ID from user ID
   * @param userId - User UUID
   * @returns Customer UUID
   */
  private async getCustomerId(userId: string): Promise<string> {
    try {
      const token = await tokenService.getToken();
      if (!token) {
        throw new Error("Authentication required");
      }

      const customerData = await userService.getCustomerByUserId(userId, token);
      return customerData.customerId;
    } catch (error) {
      console.error("❌ Error getting customer ID:", error);
      throw new Error("Failed to retrieve customer information");
    }
  }

  /**
   * Perform disease detection analysis
   * @param userId - User UUID from auth token
   * @param imageUri - Local image URI from camera
   * @returns Analysis result with detected disease
   */
  async detectDisease(
    userId: string,
    imageUri: string
  ): Promise<SkinAnalysisResult> {
    try {
      const token = await tokenService.getToken();
      if (!token) {
        throw new Error("Authentication required. Please log in.");
      }

      // Get customer ID from user ID
      const customerId = await this.getCustomerId(userId);

      // Create FormData for multipart/form-data request
      const formData = new FormData();

      // Extract filename and create file object
      const filename = imageUri.split("/").pop() || "image.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      formData.append("file", {
        uri: imageUri,
        name: filename,
        type: type,
      } as any);

      console.log("📤 Uploading disease detection image...");

      // Use apiService.uploadFile instead of fetch
      const result = await apiService.uploadFile<SkinAnalysisResponse>(
        `/skin-analysis/disease-detection/${customerId}`,
        formData
      );

      // Extract data from response
      const analysisResult: SkinAnalysisResult = result.data || result;
      console.log("✅ Disease detection completed");

      return analysisResult;
    } catch (error) {
      console.error("❌ Error in disease detection:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to analyze skin for disease detection"
      );
    }
  }

  /**
   * Perform skin condition detection analysis
   * @param userId - User UUID from auth token
   * @param imageUri - Local image URI from camera
   * @returns Analysis result with detected condition (Dry, Oily, etc.)
   */
  async detectCondition(
    userId: string,
    imageUri: string
  ): Promise<SkinAnalysisResult> {
    try {
      const token = await tokenService.getToken();
      if (!token) {
        throw new Error("Authentication required. Please log in.");
      }

      // Get customer ID from user ID
      const customerId = await this.getCustomerId(userId);

      // Create FormData for multipart/form-data request
      const formData = new FormData();

      // Extract filename and create file object
      const filename = imageUri.split("/").pop() || "image.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      formData.append("file", {
        uri: imageUri,
        name: filename,
        type: type,
      } as any);

      console.log("📤 Uploading condition detection image...");

      // Use apiService.uploadFile instead of fetch
      const result = await apiService.uploadFile<SkinAnalysisResponse>(
        `/skin-analysis/condition-detection/${customerId}`,
        formData
      );

      // Extract data from response
      const analysisResult: SkinAnalysisResult = result.data || result;
      console.log("✅ Condition detection completed");

      return analysisResult;
    } catch (error) {
      console.error("❌ Error in condition detection:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to analyze skin condition"
      );
    }
  }

  /**
   * Get all analyses for a customer
   * @param customerId - Customer UUID
   * @returns List of analysis results
   */
  async getUserAnalyses(customerId: string): Promise<SkinAnalysisResult[]> {
    try {
      const token = await tokenService.getToken();
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await apiService.get<SkinAnalysisResult[]>(
        `/skin-analysis/customer/${customerId}`
      );

      // The API returns the array directly, not wrapped in { data: [...] }
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error("❌ Error fetching user analyses:", error);
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * Get analysis result by ID
   * @param analysisId - Analysis UUID
   */
  async getAnalysisById(analysisId: string): Promise<SkinAnalysisResult> {
    try {
      const token = await tokenService.getToken();

      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await apiService.get<SkinAnalysisResponse>(
        `/skin-analysis/${analysisId}`
      );

      return response.data;
    } catch (error) {
      console.error("❌ Error fetching analysis:", error);
      throw new Error("Failed to fetch analysis result");
    }
  }
}

export const skinAnalysisService = new SkinAnalysisService();
export default skinAnalysisService;
