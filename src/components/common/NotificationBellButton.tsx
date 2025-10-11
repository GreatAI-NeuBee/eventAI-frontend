import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationService } from '../../services/notificationService';

interface NotificationBellButtonProps {
  eventId: string;
  onSubscribed?: () => void;
}

export const NotificationBellButton: React.FC<NotificationBellButtonProps> = ({ 
  eventId, 
  onSubscribed 
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    // Check current notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
      checkSubscriptionStatus();
    }
  }, []);

  const checkSubscriptionStatus = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    }
  };

  const handleNotificationRequest = async () => {
    // Check for HTTPS requirement (except localhost)
    const isSecureContext = window.isSecureContext || window.location.hostname === 'localhost';
    if (!isSecureContext) {
      showToastMessage('❌ Notifications require HTTPS connection');
      return;
    }

    // Check for Notification API support
    if (!('Notification' in window)) {
      // iOS Safari specific message
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        showToastMessage('📱 iOS: Please install this app to home screen first, then enable notifications');
      } else {
        showToastMessage('❌ Notifications not supported in this browser. Try Chrome or Firefox.');
      }
      return;
    }

    // Check for Service Worker support
    if (!('serviceWorker' in navigator)) {
      showToastMessage('❌ Service Workers not supported. Notifications unavailable.');
      return;
    }

    // Check for Push API support
    if (!('PushManager' in window)) {
      showToastMessage('❌ Push notifications not supported in this browser');
      return;
    }

    if (permission === 'denied') {
      showToastMessage('❌ Notifications blocked. Please enable in browser settings.');
      return;
    }

    setIsLoading(true);

    try {
      // Request permission
      const newPermission = await notificationService.requestPermission();
      setPermission(newPermission);

      if (newPermission === 'granted') {
        // Subscribe to push notifications
        const subscription = await notificationService.subscribeToPush(eventId);
        
        if (subscription) {
          setIsSubscribed(true);
          showToastMessage('✅ Notifications enabled! You will receive live updates.');
          onSubscribed?.();

          // Show a test notification
          setTimeout(() => {
            notificationService.showNotification('🎉 Notifications Active!', {
              body: 'You will now receive real-time congestion alerts for this event.',
              tag: 'notification-enabled'
            });
          }, 1000);
        } else {
          showToastMessage('⚠️ Failed to subscribe. Please try again.');
        }
      } else {
        showToastMessage('❌ Permission denied');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      showToastMessage('❌ Failed to enable notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const getButtonState = () => {
    if (isSubscribed) {
      return {
        icon: <Check className="h-5 w-5" />,
        text: 'Notifications On',
        color: 'bg-green-600 hover:bg-green-700',
        disabled: false
      };
    }
    
    if (permission === 'denied') {
      return {
        icon: <BellOff className="h-5 w-5" />,
        text: 'Blocked',
        color: 'bg-gray-400 cursor-not-allowed',
        disabled: true
      };
    }

    return {
      icon: <Bell className="h-5 w-5" />,
      text: permission === 'granted' ? 'Enable Alerts' : 'Enable Notifications',
      color: 'bg-purple-600 hover:bg-purple-700',
      disabled: false
    };
  };

  const buttonState = getButtonState();

  return (
    <>
      <motion.button
        whileHover={{ scale: buttonState.disabled ? 1 : 1.05 }}
        whileTap={{ scale: buttonState.disabled ? 1 : 0.95 }}
        onClick={handleNotificationRequest}
        disabled={buttonState.disabled || isLoading || isSubscribed}
        className={`
          ${buttonState.color}
          text-white font-semibold py-2 px-4 rounded-lg 
          transition-all duration-200 
          flex items-center gap-2
          shadow-lg
          ${(buttonState.disabled || isSubscribed) ? 'opacity-70' : 'hover:shadow-xl'}
        `}
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
        ) : (
          buttonState.icon
        )}
        <span>{isLoading ? 'Setting up...' : buttonState.text}</span>
      </motion.button>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-2xl p-4 max-w-sm"
          >
            <p className="text-sm font-medium text-gray-900">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NotificationBellButton;

