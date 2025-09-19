import { create } from 'zustand';
import { mockUserApi } from '../api/mockUserApi';
import type { UserProfile, UserProfileUpdate, PasswordChange } from '../types/user';

interface UserStore {
  // State
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  isEditing: boolean;
  
  // Actions
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setIsEditing: (editing: boolean) => void;
  clearError: () => void;
  
  // CRUD Operations
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (userId: string, updates: UserProfileUpdate) => Promise<void>;
  uploadAvatar: (userId: string, file: File) => Promise<string | null>;
  changePassword: (passwordData: PasswordChange) => Promise<void>;
  deleteAccount: (userId: string) => Promise<void>;
  
  // Reset
  reset: () => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  // Initial state
  profile: null,
  isLoading: false,
  error: null,
  isEditing: false,

  // Actions
  setProfile: (profile) => set({ profile }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  setIsEditing: (editing) => set({ isEditing: editing }),
  
  clearError: () => set({ error: null }),

  // CRUD Operations
  fetchProfile: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const profile = await mockUserApi.getProfile(userId);
      set({ profile });
    } catch (error) {
      console.error('Error fetching profile:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch profile' 
      });
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (userId: string, updates: UserProfileUpdate) => {
    try {
      set({ isLoading: true, error: null });
      
      const updatedProfile = await mockUserApi.updateProfile(userId, updates);
      set({ profile: updatedProfile });
    } catch (error) {
      console.error('Error updating profile:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update profile' 
      });
    } finally {
      set({ isLoading: false });
    }
  },

  uploadAvatar: async (userId: string, file: File): Promise<string | null> => {
    try {
      set({ isLoading: true, error: null });
      
      const avatarUrl = await mockUserApi.uploadAvatar(userId, file);
      
      // Update profile with new avatar URL
      await get().updateProfile(userId, { avatarUrl });
      
      return avatarUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to upload avatar' 
      });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  changePassword: async (passwordData: PasswordChange) => {
    try {
      set({ isLoading: true, error: null });
      
      await mockUserApi.changePassword(passwordData);
    } catch (error) {
      console.error('Error changing password:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to change password' 
      });
    } finally {
      set({ isLoading: false });
    }
  },

  deleteAccount: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      await mockUserApi.deleteAccount(userId);
      set({ profile: null });
    } catch (error) {
      console.error('Error deleting account:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete account' 
      });
    } finally {
      set({ isLoading: false });
    }
  },

  reset: () => set({
    profile: null,
    isLoading: false,
    error: null,
    isEditing: false,
  }),
}));
