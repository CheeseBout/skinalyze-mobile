import apiService from "./apiService";

export interface Ward {
  WardCode: string;
  WardName: string;
  DistrictID: number;
}

export interface WardsResponse {
  statusCode: number;
  message: string;
  data: Ward[];
  timestamp: string;
}

export interface CalculateFeePayload {
  toDistrictId: number;
  toWardCode: string;
  weight: number;
  serviceTypeId?: number;
}

export interface CalculateFeeResponse {
  statusCode: number;
  message: string;
  data: {
    fee: number;
    estimatedTime: string;
  };
  timestamp: string;
}

class GHNService {
  /**
   * Get wards for a specific district
   */
  async getWards(districtId: number): Promise<Ward[]> {
    try {
      console.log("🏘️ Fetching wards for district:", districtId);

      const response = await apiService.get<WardsResponse>(
        `/ghn/wards?districtId=${districtId}`
      );

      console.log("✅ Wards fetched:", response.data.length);
      return response.data;
    } catch (error) {
      console.error("❌ Get wards error:", error);
      throw error;
    }
  }

  /**
   * Calculate shipping fee using GHN
   */
  async calculateFee(
    payload: CalculateFeePayload
  ): Promise<{ fee: number; estimatedTime: string }> {
    try {
      console.log("💰 Calculating shipping fee...", payload);

      const response = await apiService.post<CalculateFeeResponse>(
        "/ghn/calculate-fee",
        {
          toDistrictId: payload.toDistrictId,
          toWardCode: payload.toWardCode,
          weight: payload.weight,
          serviceTypeId: payload.serviceTypeId || 2,
        }
      );

      console.log("✅ Fee calculated:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Calculate fee error:", error);
      throw error;
    }
  }
}

export default new GHNService();
