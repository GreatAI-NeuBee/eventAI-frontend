import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Building, Globe, Linkedin, Twitter, Github, Save, X } from 'lucide-react';
import Input from '../common/Input';
import Button from '../common/Button';
import Card from '../common/Card';
import type { UserProfile, UserProfileUpdate } from '../../types/user';

interface ProfileFormProps {
  profile: UserProfile;
  onSave: (updates: UserProfileUpdate) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ProfileForm: React.FC<ProfileFormProps> = ({
  profile,
  onSave,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<UserProfileUpdate>({
    fullName: profile.fullName || '',
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    phone: profile.phone || '',
    bio: profile.bio || '',
    company: profile.company || '',
    jobTitle: profile.jobTitle || '',
    location: profile.location || '',
    website: profile.website || '',
    socialLinks: {
      linkedin: profile.socialLinks?.linkedin || '',
      twitter: profile.socialLinks?.twitter || '',
      github: profile.socialLinks?.github || '',
    },
    preferences: {
      theme: profile.preferences?.theme || 'system',
      notifications: {
        email: profile.preferences?.notifications?.email ?? true,
        push: profile.preferences?.notifications?.push ?? true,
        sms: profile.preferences?.notifications?.sms ?? false,
      },
      language: profile.preferences?.language || 'en',
      timezone: profile.preferences?.timezone || 'UTC',
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData({
      fullName: profile.fullName || '',
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      phone: profile.phone || '',
      bio: profile.bio || '',
      company: profile.company || '',
      jobTitle: profile.jobTitle || '',
      location: profile.location || '',
      website: profile.website || '',
      socialLinks: {
        linkedin: profile.socialLinks?.linkedin || '',
        twitter: profile.socialLinks?.twitter || '',
        github: profile.socialLinks?.github || '',
      },
      preferences: {
        theme: profile.preferences?.theme || 'system',
        notifications: {
          email: profile.preferences?.notifications?.email ?? true,
          push: profile.preferences?.notifications?.push ?? true,
          sms: profile.preferences?.notifications?.sms ?? false,
        },
        language: profile.preferences?.language || 'en',
        timezone: profile.preferences?.timezone || 'UTC',
      },
    });
  }, [profile]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName?.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (formData.website && !isValidUrl(formData.website)) {
      newErrors.website = 'Please enter a valid URL';
    }

    if (formData.socialLinks?.linkedin && !isValidLinkedInUrl(formData.socialLinks.linkedin)) {
      newErrors.linkedin = 'Please enter a valid LinkedIn URL';
    }

    if (formData.socialLinks?.twitter && !isValidTwitterUrl(formData.socialLinks.twitter)) {
      newErrors.twitter = 'Please enter a valid Twitter URL';
    }

    if (formData.socialLinks?.github && !isValidGitHubUrl(formData.socialLinks.github)) {
      newErrors.github = 'Please enter a valid GitHub URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const isValidLinkedInUrl = (url: string): boolean => {
    return url.includes('linkedin.com/in/') || url.includes('linkedin.com/company/');
  };

  const isValidTwitterUrl = (url: string): boolean => {
    return url.includes('twitter.com/') || url.includes('x.com/');
  };

  const isValidGitHubUrl = (url: string): boolean => {
    return url.includes('github.com/');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return {
          ...prev,
          [parent]: {
            ...(prev[parent as keyof UserProfileUpdate] as Record<string, any> || {}),
            [child]: value,
          },
        };
      }
      return {
        ...prev,
        [field]: value,
      };
    });

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <User className="mr-2 h-5 w-5" />
          Basic Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Full Name *"
            value={formData.fullName || ''}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            error={errors.fullName}
            icon={User}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name *"
              value={formData.firstName || ''}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              error={errors.firstName}
            />
            <Input
              label="Last Name *"
              value={formData.lastName || ''}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              error={errors.lastName}
            />
          </div>
          <Input
            label="Email"
            value={profile.email}
            disabled
            icon={Mail}
            helperText="Email cannot be changed"
          />
          <Input
            label="Phone"
            value={formData.phone || ''}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            icon={Phone}
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </Card>

      {/* Professional Information */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Building className="mr-2 h-5 w-5" />
          Professional Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Company"
            value={formData.company || ''}
            onChange={(e) => handleInputChange('company', e.target.value)}
            icon={Building}
          />
          <Input
            label="Job Title"
            value={formData.jobTitle || ''}
            onChange={(e) => handleInputChange('jobTitle', e.target.value)}
          />
          <Input
            label="Location"
            value={formData.location || ''}
            onChange={(e) => handleInputChange('location', e.target.value)}
            icon={MapPin}
            placeholder="City, Country"
          />
          <Input
            label="Website"
            value={formData.website || ''}
            onChange={(e) => handleInputChange('website', e.target.value)}
            icon={Globe}
            placeholder="https://yourwebsite.com"
            error={errors.website}
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bio
          </label>
          <textarea
            value={formData.bio || ''}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            rows={4}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Tell us about yourself..."
          />
        </div>
      </Card>

      {/* Social Links */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Links</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="LinkedIn"
            value={formData.socialLinks?.linkedin || ''}
            onChange={(e) => handleInputChange('socialLinks.linkedin', e.target.value)}
            icon={Linkedin}
            placeholder="https://linkedin.com/in/username"
            error={errors.linkedin}
          />
          <Input
            label="Twitter"
            value={formData.socialLinks?.twitter || ''}
            onChange={(e) => handleInputChange('socialLinks.twitter', e.target.value)}
            icon={Twitter}
            placeholder="https://twitter.com/username"
            error={errors.twitter}
          />
          <Input
            label="GitHub"
            value={formData.socialLinks?.github || ''}
            onChange={(e) => handleInputChange('socialLinks.github', e.target.value)}
            icon={Github}
            placeholder="https://github.com/username"
            error={errors.github}
          />
        </div>
      </Card>

      {/* Preferences */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Theme
            </label>
            <select
              value={formData.preferences?.theme || 'system'}
              onChange={(e) => handleInputChange('preferences.theme', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select
              value={formData.preferences?.language || 'en'}
              onChange={(e) => handleInputChange('preferences.language', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notifications
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.preferences?.notifications?.email ?? true}
                onChange={(e) => handleInputChange('preferences.notifications.email', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">Email notifications</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.preferences?.notifications?.push ?? true}
                onChange={(e) => handleInputChange('preferences.notifications.push', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">Push notifications</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.preferences?.notifications?.sms ?? false}
                onChange={(e) => handleInputChange('preferences.notifications.sms', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">SMS notifications</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button
          type="submit"
          loading={isLoading}
        >
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </form>
  );
};

export default ProfileForm;

