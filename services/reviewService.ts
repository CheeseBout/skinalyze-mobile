import apiService from "./apiService";

export interface ReviewPayload {    
  productId: string,
  rating: number,
  content: string
}

export interface Review {
    reviewId: string,
    userId: string,
    productId: string,
    rating: number,
    content: string,
    createdAt: string,
    updatedAt: string
}

class ReviewService {
    async postReview(token: string, payload: ReviewPayload): Promise<Review> {
        return await apiService.post<Review>('/reviews', payload, { token });
    }

    async updateReview(token: string, reviewId: string, payload: Partial<ReviewPayload>): Promise<Review> {
        return await apiService.put<Review>(`/reviews/${reviewId}`, payload, { token });
    }

    async deleteReview(token: string, reviewId: string): Promise<void> {
        return await apiService.delete<void>(`/reviews/${reviewId}`, { token });
    }
}
export const reviewService = new ReviewService();
export default reviewService;