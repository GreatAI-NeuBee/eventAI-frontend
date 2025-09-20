import axios from 'axios';

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

export interface BackendUserData {
  id: number;
  userId: string;
  email: string;
  username: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserResponse {
  success: boolean;
  data: BackendUserData;
  message?: string;
  statusCode?: number;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  isUserExists?: boolean;
}

// User Service Class
export class UserService {

  /**
   * Create or update user in the backend database
   */
  static async createOrUpdateUser(supabaseUser: any): Promise<CreateUserResponse> {
    try {
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

      // Make API call to create/update user
      const response = await apiClient.post<CreateUserResponse>('/users', userData);
      
      return response.data;
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = {
          message: error.response?.data?.message || error.message || 'Failed to create user',
          status: error.response?.status,
          code: error.code,
        };
        
        // Handle specific error cases
        if (error.response?.status === 409) {
          // User already exists - this is expected behavior, not an error
          // If user already exists, the backend should return the existing user data
          if (error.response.data && error.response.data.data) {
            return error.response.data;
          }
          
          // If no user data in response, we'll try to fetch it separately
          throw {
            ...apiError,
            isUserExists: true, // Flag to indicate this is a "user exists" scenario
          };
        }
        
        // Only log actual errors, not expected conflicts
        console.error('❌ Error creating/updating user:', error);
        throw apiError;
      }
      
      throw {
        message: 'Unknown error occurred while creating user',
        status: 500,
      } as ApiError;
    }
  }

  /**
   * Get user by email address
   */
  static async getUserByEmail(email: string): Promise<CreateUserResponse | null> {
    try {
      if (!email) {
        throw new Error('Email is required');
      }
      
      const response = await apiClient.get<CreateUserResponse>(`/users/email/${encodeURIComponent(email)}`);
      
      return response.data;
      
    } catch (error) {
      console.error('❌ Error fetching user by email:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      
      throw error;
    }
  }

  /**
   * Get user by backend user ID (not Supabase ID)
   * @deprecated Use getUserByEmail instead
   */
  static async getUserById(backendUserId: string): Promise<CreateUserResponse | null> {
    try {
      if (!backendUserId) {
        throw new Error('Backend user ID is required');
      }
      
      const response = await apiClient.get<CreateUserResponse>(`/users/${backendUserId}`);
      
      return response.data;
      
    } catch (error) {
      console.error('❌ Error fetching user:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 404) {
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
      const response = await apiClient.patch<CreateUserResponse>(`/users/${userId}`, updates);
      
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
      await apiClient.delete(`/users/${userId}`);
      
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
      // Only log non-409 errors (409 is expected for existing users)
      if (error.response?.status !== 409) {
        console.error('API Error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
      }
    }
    return Promise.reject(error);
  }
);

export default UserService;
