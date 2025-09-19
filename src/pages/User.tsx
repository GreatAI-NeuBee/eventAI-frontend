import React from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Spinner from '../components/common/Spinner';

const UserProfile: React.FC = () => {
  const { user, backendUser, backendUserLoading, refreshBackendUser } = useAuth();

  // If user is not authenticated, show loading or redirect will happen via ProtectedRoute
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'INACTIVE':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'SUSPENDED':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-4 w-4" />;
      case 'SUSPENDED':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (backendUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading user profile...</p>
        </div>
      </div>
    );
  }

  if (!backendUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="text-center max-w-md">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-4">Unable to load your profile information from the server.</p>
          <Button onClick={refreshBackendUser}>
            Try Again
          </Button>
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
          <p className="text-gray-600 mt-2">Manage your account information</p>
        </div>

        {/* User Profile Card */}
        <Card>
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
            <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor(backendUser.status)}`}>
              {getStatusIcon(backendUser.status)}
              <span>{backendUser.status}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <p className="text-base text-gray-900 flex items-center">
                  <User className="mr-3 h-5 w-5 text-gray-400" />
                  {backendUser.username}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <p className="text-base text-gray-900 flex items-center">
                  <Mail className="mr-3 h-5 w-5 text-gray-400" />
                  {backendUser.email}
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <p className="text-base text-gray-900 flex items-center">
                  <Phone className="mr-3 h-5 w-5 text-gray-400" />
                  {backendUser.phone || 'Not provided'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Member Since</label>
                <p className="text-base text-gray-900 flex items-center">
                  <Calendar className="mr-3 h-5 w-5 text-gray-400" />
                  {new Date(backendUser.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default UserProfile;
