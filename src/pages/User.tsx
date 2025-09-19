import React, { useEffect, useState } from 'react';
import { 
  User, 
  Edit3, 
  Settings, 
  Shield, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  Globe, 
  Linkedin, 
  Twitter, 
  Github,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUserStore } from '../store/userStore';
import ProfileForm from '../components/user/ProfileForm';
import PasswordChangeForm from '../components/user/PasswordChangeForm';
import AvatarUpload from '../components/user/AvatarUpload';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Spinner from '../components/common/Spinner';
import type { UserProfile, UserProfileUpdate, PasswordChange } from '../types/user';

const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const {
    profile,
    isLoading,
    error,
    isEditing,
    fetchProfile,
    updateProfile,
    uploadAvatar,
    changePassword,
    deleteAccount,
    setIsEditing,
    clearError,
  } = useUserStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'danger'>('profile');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    // Use mock user ID for testing, or real user ID if available
    const userId = user?.id || 'mock-user-1';
    fetchProfile(userId);
  }, [user?.id, fetchProfile]);

  const handleSaveProfile = async (updates: UserProfileUpdate) => {
    const userId = user?.id || 'mock-user-1';
    await updateProfile(userId, updates);
    setIsEditing(false);
  };

  const handleUploadAvatar = async (file: File) => {
    const userId = user?.id || 'mock-user-1';
    await uploadAvatar(userId, file);
  };

  const handleRemoveAvatar = async () => {
    const userId = user?.id || 'mock-user-1';
    await updateProfile(userId, { avatarUrl: '' });
  };

  const handleChangePassword = async (passwordData: PasswordChange) => {
    await changePassword(passwordData);
    setShowPasswordForm(false);
  };

  const handleDeleteAccount = async () => {
    const userId = user?.id || 'mock-user-1';
    await deleteAccount(userId);
  };

  if (isLoading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Profile</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => user?.id && fetchProfile(user.id)}>
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="text-center">
          <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Profile Found</h2>
          <p className="text-gray-600">Unable to load your profile information.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
                <button
                  onClick={clearError}
                  className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <User className="inline-block mr-2 h-4 w-4" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'security'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Shield className="inline-block mr-2 h-4 w-4" />
              Security
            </button>
            <button
              onClick={() => setActiveTab('danger')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'danger'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Trash2 className="inline-block mr-2 h-4 w-4" />
              Danger Zone
            </button>
          </nav>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Avatar Upload */}
            <AvatarUpload
              currentAvatarUrl={profile.avatarUrl}
              onUpload={handleUploadAvatar}
              onRemove={handleRemoveAvatar}
              isLoading={isLoading}
            />

            {/* Profile Form */}
            {isEditing ? (
              <ProfileForm
                profile={profile}
                onSave={handleSaveProfile}
                onCancel={() => setIsEditing(false)}
                isLoading={isLoading}
              />
            ) : (
              <Card>
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    disabled={isLoading}
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      <p className="mt-1 text-sm text-gray-900">{profile.fullName || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="mt-1 text-sm text-gray-900 flex items-center">
                        <Mail className="mr-2 h-4 w-4" />
                        {profile.email}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="mt-1 text-sm text-gray-900 flex items-center">
                        <Phone className="mr-2 h-4 w-4" />
                        {profile.phone || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Location</label>
                      <p className="mt-1 text-sm text-gray-900 flex items-center">
                        <MapPin className="mr-2 h-4 w-4" />
                        {profile.location || 'Not provided'}
                      </p>
                    </div>
                  </div>

                  {/* Professional Info */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Company</label>
                      <p className="mt-1 text-sm text-gray-900 flex items-center">
                        <Building className="mr-2 h-4 w-4" />
                        {profile.company || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Job Title</label>
                      <p className="mt-1 text-sm text-gray-900">{profile.jobTitle || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Website</label>
                      <p className="mt-1 text-sm text-gray-900 flex items-center">
                        <Globe className="mr-2 h-4 w-4" />
                        {profile.website ? (
                          <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-500">
                            {profile.website}
                          </a>
                        ) : (
                          'Not provided'
                        )}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Bio</label>
                      <p className="mt-1 text-sm text-gray-900">{profile.bio || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Social Links */}
                {(profile.socialLinks?.linkedin || profile.socialLinks?.twitter || profile.socialLinks?.github) && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-4">Social Links</h4>
                    <div className="flex space-x-4">
                      {profile.socialLinks?.linkedin && (
                        <a
                          href={profile.socialLinks.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-gray-600 hover:text-primary-600"
                        >
                          <Linkedin className="h-5 w-5 mr-2" />
                          LinkedIn
                        </a>
                      )}
                      {profile.socialLinks?.twitter && (
                        <a
                          href={profile.socialLinks.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-gray-600 hover:text-primary-600"
                        >
                          <Twitter className="h-5 w-5 mr-2" />
                          Twitter
                        </a>
                      )}
                      {profile.socialLinks?.github && (
                        <a
                          href={profile.socialLinks.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-gray-600 hover:text-primary-600"
                        >
                          <Github className="h-5 w-5 mr-2" />
                          GitHub
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Account Info */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>Member since {new Date(profile.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Last updated {new Date(profile.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {showPasswordForm ? (
              <PasswordChangeForm
                onSave={handleChangePassword}
                onCancel={() => setShowPasswordForm(false)}
                isLoading={isLoading}
              />
            ) : (
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Security Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Password</h4>
                      <p className="text-sm text-gray-600">Last changed 3 months ago</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowPasswordForm(true)}
                    >
                      Change Password
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Danger Zone Tab */}
        {activeTab === 'danger' && (
          <Card>
            <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center">
              <Trash2 className="mr-2 h-5 w-5" />
              Danger Zone
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-900">Delete Account</h4>
                <p className="text-sm text-red-700 mt-1">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                {!showDeleteConfirm ? (
                  <Button
                    variant="danger"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="mt-3"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                ) : (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-red-700 font-medium">
                      Are you absolutely sure? This action cannot be undone.
                    </p>
                    <div className="flex space-x-3">
                      <Button
                        variant="danger"
                        onClick={handleDeleteAccount}
                        loading={isLoading}
                      >
                        Yes, delete my account
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
