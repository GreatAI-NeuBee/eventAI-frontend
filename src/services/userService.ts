import axios from 'axios';
import type { User } from '@supabase/supabase-js';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Types for API requests/responses
export interface CreateUserRequest {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  provider?: string;
  metadata?: Record<string, any>;
}

export interface CreateUserResponse {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// User Service Class
export class UserService {
  /**
   * Create or update user in the backend database
   */
  static async createOrUpdateUser(supabaseUser: any): Promise<CreateUserResponse> {
    try {
      console.log('🔄 Creating/updating user in backend:', supabaseUser.email);
      
      // Extract user data from Supabase user object
      const userData: CreateUserRequest = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.user_metadata?.full_name || 
              supabaseUser.user_metadata?.name || 
              supabaseUser.email?.split('@')[0] || 'User',
        avatar_url: supabaseUser.user_metadata?.avatar_url || 
                   supabaseUser.user_metadata?.picture || 
                   undefined,
        provider: supabaseUser.app_metadata?.provider || 'google',
        metadata: {
          ...supabaseUser.user_metadata,
          last_sign_in: new Date().toISOString(),
        }
      };

      console.log('📤 Sending user data to API:', userData);

      // Make API call to create/update user
      const response = await apiClient.post<CreateUserResponse>('/users', userData);
      
      console.log('✅ User created/updated successfully:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('❌ Error creating/updating user:', error);
      
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = {
          message: error.response?.data?.message || error.message || 'Failed to create user',
          status: error.response?.status,
          code: error.code,
        };
        
        // Handle specific error cases
        if (error.response?.status === 409) {
          console.log('ℹ️ User already exists, this is normal');
          // If user already exists, try to get the user data
          return error.response.data;
        }
        
        throw apiError;
      }
      
      throw {
        message: 'Unknown error occurred while creating user',
        status: 500,
      } as ApiError;
    }
  }

  /**
   * Get user by ID from backend
   */
  static async getUserById(userId: string): Promise<CreateUserResponse | null> {
    try {
      console.log('🔄 Fetching user from backend:', userId);
      
      const response = await apiClient.get<CreateUserResponse>(`/users/${userId}`);
      
      console.log('✅ User fetched successfully:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('❌ Error fetching user:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log('ℹ️ User not found in backend');
        return null;
      }
      
      throw error;
    }
  }

  /**
   * Update user profile in backend
   */
  static async updateUserProfile(userId: string, updates: Partial<CreateUserRequest>): Promise<CreateUserResponse> {
    try {
      console.log('🔄 Updating user profile:', userId, updates);
      
      const response = await apiClient.patch<CreateUserResponse>(`/users/${userId}`, updates);
      
      console.log('✅ User profile updated successfully:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Delete user from backend
   */
  static async deleteUser(userId: string): Promise<void> {
    try {
      console.log('🔄 Deleting user from backend:', userId);
      
      await apiClient.delete(`/users/${userId}`);
      
      console.log('✅ User deleted successfully');
      
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
  }
}

// Request interceptor to add auth token if available
apiClient.interceptors.request.use(
  (config) => {
    // You can add auth token here if needed
    // const token = getAuthToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      // Log API errors for debugging
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }
    return Promise.reject(error);
  }
);

export default UserService;
