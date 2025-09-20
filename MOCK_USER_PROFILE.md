# Mock User Profile Implementation

This document explains how to use the mock user profile system for development and testing.

## 🚀 Quick Start

The user profile system now uses mock data, so you can test all functionality immediately without setting up a database.

### **Access the Profile Page**
1. Start your development server: `npm run dev`
2. Navigate to: `http://localhost:5173/user`
3. Or click on your profile in the navbar

## 📊 Mock Data

The system comes with pre-populated sample data:

- **Sample User**: John Doe with complete profile information
- **Mock User ID**: `mock-user-1` (used when no real user is authenticated)
- **Real User ID**: Uses actual authenticated user ID when available

## 🔧 Features Available

### ✅ **Profile Management**
- View complete profile information
- Edit all profile fields with validation
- Real-time form validation
- Save/Cancel functionality

### ✅ **Avatar Upload**
- Drag & drop image upload
- File type validation (images only)
- File size validation (max 5MB)
- Mock URL generation for uploaded images

### ✅ **Password Change**
- Current password verification (use `currentpassword` as current password)
- New password strength validation
- Password confirmation matching
- Mock validation responses

### ✅ **Account Deletion**
- Confirmation dialog
- Mock account removal
- Profile data cleanup

## 🧪 Testing Scenarios

### **Test Profile Editing**
1. Go to `/user`
2. Click "Edit Profile"
3. Modify any fields
4. Click "Save Changes"
5. Verify changes are persisted

### **Test Avatar Upload**
1. Go to `/user`
2. Drag & drop an image or click to select
3. Verify the image appears in the profile
4. Click the X to remove the avatar

### **Test Password Change**
1. Go to `/user` → Security tab
2. Click "Change Password"
3. Use `currentpassword` as current password
4. Enter a new password (8+ chars, mixed case, numbers)
5. Confirm the new password
6. Click "Change Password"

### **Test Account Deletion**
1. Go to `/user` → Danger Zone tab
2. Click "Delete Account"
3. Confirm the deletion
4. Verify the profile is cleared

## 🔄 Mock API Behavior

### **Simulated Delays**
- Profile fetch: 500ms
- Profile update: 300ms
- Avatar upload: 1000ms
- Password change: 500ms
- Account deletion: 500ms

### **Mock Validation**
- **Current Password**: Must be `currentpassword`
- **New Password**: Must be 8+ characters with uppercase, lowercase, and numbers
- **File Upload**: Images only, max 5MB
- **URL Validation**: LinkedIn, Twitter, GitHub URL format checking

### **Data Persistence**
- Mock data persists during the session
- Data resets when the page is refreshed
- Use `mockUserApi.resetMockData()` to clear all data

## 🛠️ Development Tools

### **Debug Functions**
```typescript
import { mockUserApi } from './src/api/mockUserApi';

// View all mock profiles
console.log(mockUserApi.getAllProfiles());

// Reset mock data
mockUserApi.resetMockData();
```

### **Console Logging**
The mock API logs all operations to the console for debugging:
- Profile operations
- Password changes
- Account deletions
- Upload operations

## 🔄 Migration to Supabase

When you're ready to use Supabase:

1. **Update the store**: Replace `mockUserApi` imports with Supabase calls
2. **Database setup**: Run the migration script (when you create it)
3. **Environment variables**: Configure Supabase credentials
4. **Storage setup**: Set up the avatars bucket

The component interfaces remain the same, so the migration will be straightforward.

## 📝 Sample Data Structure

```typescript
{
  id: 'mock-user-1',
  email: 'john.doe@example.com',
  fullName: 'John Doe',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+1 (555) 123-4567',
  bio: 'Event organizer with 5+ years of experience...',
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
    notifications: { email: true, push: true, sms: false },
    language: 'en',
    timezone: 'America/New_York',
  },
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
}
```

## 🎯 Ready to Use!

The mock user profile system is now fully functional. You can test all CRUD operations, form validation, file uploads, and user interactions without any database setup!

