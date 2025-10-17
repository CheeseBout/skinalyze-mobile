const API_URL = process.env.EXPO_PUBLIC_BASE_API_URL || 'http://192.168.1.35:3000/api/v1'

interface RequestOptions {
  headers?: Record<string, string>
  token?: string
}

class ApiService {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
    console.log('🔗 API Base URL:', this.baseURL) 
  }

  private getHeaders(options?: RequestOptions): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers,
    }

    if (options?.token) {
      headers['Authorization'] = `Bearer ${options.token}`
    }

    return headers
  }

  private async request<T>(
    endpoint: string,
    method: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    try {
      const url = `${this.baseURL}${endpoint}`
      console.log(`📡 ${method} ${url}`) 
      
      const config: RequestInit = {
        method,
        headers: this.getHeaders(options),
      }

      if (body) {
        config.body = JSON.stringify(body)
        console.log('Request body:', body) 
      }

      const response = await fetch(url, config)
      console.log(`Response status: ${response.status}`) 
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('API Error:', errorData) 
        throw new Error(errorData.message || `Request failed with status ${response.status}`)
      }

      const data = await response.json()
      console.log('Response data:', data) 
      return data
    } catch (error) {
      console.error(`API ${method} Error:`, error)
      throw error
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, 'GET', undefined, options)
  }

  async post<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, 'POST', body, options)
  }

  async patch<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, 'PATCH', body, options)
  }

  async put<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, 'PUT', body, options)
  }
  
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, 'DELETE', undefined, options)
  }
}

// Create and export a singleton instance
export const apiService = new ApiService(API_URL)

export default apiService