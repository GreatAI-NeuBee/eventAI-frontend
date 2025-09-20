# User Profile System

This document describes the comprehensive user profile system implemented for the EventAI frontend application.

## Features

### 🔐 Complete CRUD Operations
- **Create**: New user profiles are automatically created when a user first accesses their profile
- **Read**: View profile information in a clean, organized layout
- **Update**: Edit profile information with real-time validation
- **Delete**: Account deletion with confirmation

### 📝 Profile Management
- **Basic Information**: Full name, first name, last name, email, phone, location
- **Professional Information**: Company, job title, website, bio
- **Social Links**: LinkedIn, Twitter, GitHub profiles
- **Preferences**: Theme, language, notification settings, timezone

### 🖼️ Avatar Management
- **Upload**: Drag & drop or click to upload profile pictures
- **Preview**: Real-time preview of selected images
- **Validation**: File type and size validation (max 5MB)
- **Storage**: Secure cloud storage with Supabase

### 🔒 Security Features
- **Password Change**: Secure password update with validation
- **Account Deletion**: Permanent account removal with confirmation
- **Data Validation**: Client-side and server-side validation
- **Error Handling**: Comprehensive error handling and user feedback

## File Structure

```
src/
├── types/
│   └── user.ts                    # TypeScript interfaces
├── store/
│   └── userStore.ts              # Zustand store for state management
├── components/user/
│   ├── ProfileForm.tsx           # Main profile editing form
│   ├── PasswordChangeForm.tsx    # Password change form
│   └── AvatarUpload.tsx          # Avatar upload component
└── pages/
    └── User.tsx                  # Main user profile page
```

## Components

### ProfileForm
A comprehensive form for editing user profile information with:
- Form validation with real-time error feedback
- Organized sections (Basic Info, Professional Info, Social Links, Preferences)
- Responsive design for mobile and desktop
- Save/Cancel functionality

### PasswordChangeForm
Secure password change form with:
- Current password verification
- New password strength validation
- Password confirmation matching
- Show/hide password toggles

### AvatarUpload
Profile picture management with:
- Drag & drop file upload
- Image preview
- File type and size validation
- Remove avatar functionality

## State Management

The user profile system uses Zustand for state management with the following store structure:

```typescript
interface UserStore {
  // State
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  isEditing: boolean;
  
  // Actions
  fetchProfile(userId: string): Promise<void>;
  updateProfile(userId: string, updates: UserProfileUpdate): Promise<void>;
  uploadAvatar(userId: string, file: File): Promise<string | null>;
  changePassword(passwordData: PasswordChange): Promise<void>;
  deleteAccount(userId: string): Promise<void>;
}
```

## Database Schema

The user profile data is stored in a `user_profiles` table with the following structure:

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  bio TEXT,
  avatar_url TEXT,
  company TEXT,
  job_title TEXT,
  location TEXT,
  website TEXT,
  social_links JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '...',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Usage

### Accessing the Profile Page
The user profile page is accessible at `/user` and requires authentication.

### Editing Profile Information
1. Click the "Edit Profile" button
2. Modify the desired fields
3. Click "Save Changes" to persist changes
4. Click "Cancel" to discard changes

### Changing Password
1. Navigate to the "Security" tab
2. Click "Change Password"
3. Enter current and new passwords
4. Click "Change Password" to confirm

### Uploading Avatar
1. In the "Profile" tab, use the avatar upload area
2. Drag & drop an image or click to select
3. The image will be automatically uploaded and updated

### Deleting Account
1. Navigate to the "Danger Zone" tab
2. Click "Delete Account"
3. Confirm the deletion in the warning dialog

## Security Considerations

- **Row Level Security (RLS)**: Database policies ensure users can only access their own data
- **Input Validation**: Both client-side and server-side validation
- **File Upload Security**: File type and size restrictions
- **Password Security**: Strong password requirements and secure storage
- **Error Handling**: Sensitive information is not exposed in error messages

## Dependencies

- **React**: UI framework
- **TypeScript**: Type safety
- **Zustand**: State management
- **Supabase**: Backend services (auth, database, storage)
- **Lucide React**: Icons
- **Tailwind CSS**: Styling

## Setup Instructions

1. **Database Setup**: Run the migration script in `database/migrations/001_create_user_profiles.sql`
2. **Environment Variables**: Ensure Supabase credentials are configured
3. **Storage Bucket**: The `avatars` bucket will be created automatically
4. **RLS Policies**: Database policies are included in the migration

## Future Enhancements

- [ ] Profile picture cropping/resizing
- [ ] Two-factor authentication
- [ ] Profile visibility settings
- [ ] Export profile data
- [ ] Profile completion progress
- [ ] Social media integration
- [ ] Profile analytics

