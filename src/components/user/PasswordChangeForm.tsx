import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Save, X } from 'lucide-react';
import Input from '../common/Input';
import Button from '../common/Button';
import Card from '../common/Card';
import type { PasswordChange } from '../../types/user';

interface PasswordChangeFormProps {
  onSave: (passwordData: PasswordChange) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({
  onSave,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<PasswordChange>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.newPassword)) {
      newErrors.newPassword = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleInputChange = (field: keyof PasswordChange, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Lock className="mr-2 h-5 w-5" />
        Change Password
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Current Password *"
          type={showPasswords.current ? 'text' : 'password'}
          value={formData.currentPassword}
          onChange={(e) => handleInputChange('currentPassword', e.target.value)}
          error={errors.currentPassword}
          icon={Lock}
          placeholder="Enter your current password"
        />

        <Input
          label="New Password *"
          type={showPasswords.new ? 'text' : 'password'}
          value={formData.newPassword}
          onChange={(e) => handleInputChange('newPassword', e.target.value)}
          error={errors.newPassword}
          icon={Lock}
          placeholder="Enter your new password"
          helperText="Must be at least 8 characters with uppercase, lowercase, and number"
        />

        <Input
          label="Confirm New Password *"
          type={showPasswords.confirm ? 'text' : 'password'}
          value={formData.confirmPassword}
          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
          error={errors.confirmPassword}
          icon={Lock}
          placeholder="Confirm your new password"
        />

        <div className="flex justify-end space-x-3 pt-4">
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
            Change Password
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default PasswordChangeForm;
