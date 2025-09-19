import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Wifi, WifiOff } from 'lucide-react';

interface ApiStatusProps {
  className?: string;
}

const ApiStatus: React.FC<ApiStatusProps> = ({ className = "" }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        // Use the health endpoint at the server root, not API base URL
        const response = await fetch(`http://localhost:3000/health`, {
          signal: controller.signal,
          method: 'GET',
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          setApiStatus('online');
        } else {
          setApiStatus('offline');
        }
      } catch (error) {
        console.warn('API health check failed:', error);
        setApiStatus('offline');
      }
    };

    const handleOnlineStatus = () => setIsOnline(navigator.onLine);

    // Check API status on mount and when coming back online
    checkApiStatus();

    // Listen for network status changes
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    // Check API status periodically (every 30 seconds)
    const interval = setInterval(checkApiStatus, 30000);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
      clearInterval(interval);
    };
  }, [API_BASE_URL]);

  const getStatusIcon = () => {
    if (!isOnline) {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }

    switch (apiStatus) {
      case 'online':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'offline':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'checking':
        return <Wifi className="w-4 h-4 text-yellow-500 animate-pulse" />;
      default:
        return <Wifi className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    if (!isOnline) {
      return 'No Internet';
    }

    switch (apiStatus) {
      case 'online':
        return 'API Connected';
      case 'offline':
        return 'API Offline';
      case 'checking':
        return 'Checking...';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    if (!isOnline || apiStatus === 'offline') {
      return 'text-red-600 bg-red-50 border-red-200';
    }
    if (apiStatus === 'online') {
      return 'text-green-600 bg-green-50 border-green-200';
    }
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  };

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor()} ${className}`}>
      {getStatusIcon()}
      <span>{getStatusText()}</span>
    </div>
  );
};

export default ApiStatus;
