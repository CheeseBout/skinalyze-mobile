import apiService from './apiService';
import tokenService from './tokenService';
import userService from './userService';

// Type definitions based on API response
export interface SkinAnalysisResult {
  analysisId: string;
  customerId: string;
  source: 'AI_SCAN' | 'MANUAL';
  chiefComplaint: string | null;
  patientSymptoms: string | null;
  imageUrls: string[];
  notes: string | null;
  aiDetectedDisease: string | null;
  aiDetectedCondition: string | null;
  aiRecommendedProducts: string[] | null;
  mask: string[] | null;
  createdAt: string;
  updatedAt: string;
}

interface SkinAnalysisResponse {
  statusCode: number;
  message: string;
  data: SkinAnalysisResult;
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
        throw new Error('Authentication required');
      }

      const customerData = await userService.getCustomerByUserId(userId, token);
      return customerData.customerId;
    } catch (error) {
      console.error('❌ Error getting customer ID:', error);
      throw new Error('Failed to retrieve customer information');
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
        throw new Error('Authentication required. Please log in.');
      }

      // Get customer ID from user ID
      const customerId = await this.getCustomerId(userId);

      // Create FormData for multipart/form-data request
      const formData = new FormData();
      
      // Extract filename and create file object
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: imageUri,
        name: filename,
        type: type,
      } as any);


      // Make API call using fetch directly for multipart/form-data
      const response = await fetch(
        `${apiService['baseURL']}/skin-analysis/disease-detection/${customerId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.message || 'Disease detection failed');
      }

      const result = await response.json();

      // Check if response has data property or is direct response
      const analysisResult: SkinAnalysisResult = result.data || result;
      

      return analysisResult;
    } catch (error) {
      console.error('❌ Error in disease detection:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to analyze skin for disease detection'
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
        throw new Error('Authentication required. Please log in.');
      }

      // Get customer ID from user ID
      const customerId = await this.getCustomerId(userId);

      // Create FormData for multipart/form-data request
      const formData = new FormData();
      
      // Extract filename and create file object
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: imageUri,
        name: filename,
        type: type,
      } as any);


      // Make API call using fetch directly for multipart/form-data
      const response = await fetch(
        `${apiService['baseURL']}/skin-analysis/condition-detection/${customerId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.message || 'Condition detection failed');
      }

      const result = await response.json();

      // Check if response has data property or is direct response
      const analysisResult: SkinAnalysisResult = result.data || result;
      

      return analysisResult;
    } catch (error) {
      console.error('❌ Error in condition detection:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to analyze skin condition'
      );
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
        throw new Error('Authentication required');
      }

      const response = await apiService.get<SkinAnalysisResponse>(
        `/skin-analysis/${analysisId}`,
        { token }
      );

      return response.data;
    } catch (error) {
      console.error('❌ Error fetching analysis:', error);
      throw new Error('Failed to fetch analysis result');
    }
  }
}

export const skinAnalysisService = new SkinAnalysisService();
export default skinAnalysisService;