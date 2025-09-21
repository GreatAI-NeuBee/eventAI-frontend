import type { UserProfile, UserProfileUpdate, PasswordChange } from '../types/user';

// Mock user profiles storage
let mockProfiles: UserProfile[] = [];

// Initialize with some sample data
const initializeMockData = () => {
  if (mockProfiles.length === 0) {
    mockProfiles = [
      {
        id: 'mock-user-1',
        email: 'john.doe@example.com',
        fullName: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1 (555) 123-4567',
        bio: 'Event organizer with 5+ years of experience in large-scale venue management.',
        avatarUrl: '',
        company: 'EventPro Inc.',
        jobTitle: 'Senior Event Manager',
        location: 'New York, NY',
        website: 'https://johndoe.com',
        socialLinks: {
          linkedin: 'https://linkedin.com/in/johndoe',
          twitter: 'https://twitter.com/johndoe',
          github: 'https://github.com/johndoe',
        },
        preferences: {
          theme: 'system',
          notifications: {
            email: true,
            push: true,
            sms: false,
          },
          language: 'en',
          timezone: 'America/New_York',
        },
        createdAt: new Date('2024-01-15').toISOString(),
        updatedAt: new Date('2024-01-15').toISOString(),
      },
    ];
  }
};

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockUserApi = {
  // Get user profile
  async getProfile(userId: string): Promise<UserProfile> {
    await delay(500); // Simulate network delay
    initializeMockData();
    
    let profile = mockProfiles.find(p => p.id === userId);
    
    if (!profile) {
      // Create default profile for new user
      profile = {
        id: userId,
        email: 'user@example.com',
        fullName: '',
        firstName: '',
        lastName: '',
        phone: '',
        bio: '',
        avatarUrl: '',
        company: '',
        jobTitle: '',
        location: '',
        website: '',
        socialLinks: {
          linkedin: '',
          twitter: '',
          github: '',
        },
        preferences: {
          theme: 'system',
          notifications: {
            email: true,
            push: true,
            sms: false,
          },
          language: 'en',
          timezone: 'UTC',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      mockProfiles.push(profile);
    }
    
    return { ...profile };
  },

  // Update user profile
  async updateProfile(userId: string, updates: UserProfileUpdate): Promise<UserProfile> {
    await delay(300);
    initializeMockData();
    
    const profileIndex = mockProfiles.findIndex(p => p.id === userId);
    
    if (profileIndex === -1) {
      throw new Error('Profile not found');
    }
    
    const updatedProfile = {
      ...mockProfiles[profileIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    mockProfiles[profileIndex] = updatedProfile;
    return { ...updatedProfile };
  },

  // Upload avatar (mock implementation)
  async uploadAvatar(userId: string, file: File): Promise<string> {
    await delay(1000); // Simulate upload time
    
    // Create a mock URL for the uploaded file
    const mockUrl = `https://mock-storage.com/avatars/${userId}-${Date.now()}.${file.name.split('.').pop()}`;
    
    // Update the profile with the new avatar URL
    await this.updateProfile(userId, { avatarUrl: mockUrl });
    
    return mockUrl;
  },

  // Change password (mock implementation)
  async changePassword(passwordData: PasswordChange): Promise<void> {
    await delay(500);
    
    // Mock validation
    if (passwordData.currentPassword !== 'currentpassword') {
      throw new Error('Current password is incorrect');
    }
    
    if (passwordData.newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long');
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      throw new Error('Passwords do not match');
    }
    
    // Mock successful password change
    console.log('Password changed successfully');
  },

  // Delete account (mock implementation)
  async deleteAccount(userId: string): Promise<void> {
    await delay(500);
    
    const profileIndex = mockProfiles.findIndex(p => p.id === userId);
    
    if (profileIndex === -1) {
      throw new Error('Profile not found');
    }
    
    mockProfiles.splice(profileIndex, 1);
    console.log('Account deleted successfully');
  },

  // Get all profiles (for debugging)
  getAllProfiles(): UserProfile[] {
    initializeMockData();
    return [...mockProfiles];
  },

  // Reset mock data (for testing)
  resetMockData(): void {
    mockProfiles = [];
    nextId = 1;
  },
};

