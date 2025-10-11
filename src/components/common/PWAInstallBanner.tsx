import React, { useEffect, useState } from 'react';
import { X, Download, Smartphone, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallBannerProps {
  onRequestNotificationPermission?: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ 
  onRequestNotificationPermission 
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    
    if (isStandalone || isInWebAppiOS) {
      setIsInstalled(true);
      setShowBanner(false);
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // Show banner only if not dismissed before
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
      console.log('✅ PWA was installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('No install prompt available');
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        
        // Register for push notifications
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          const registration = await navigator.serviceWorker.ready;
          
          // Subscribe to push notifications
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              // You'll need to generate a VAPID key and add it here
              // For now, using a placeholder
              'BEl62iUYgUivxIkv69yViEuiBIa-Ib37J8YgFl52J05wl5SqSdJJQBq2bFY-xwKS4AJ8iXJQhDqV-p6YYWhPWPQ'
            )
          });

          console.log('✅ Push subscription successful:', subscription);
          
          // Send subscription to your backend
          onRequestNotificationPermission?.();
        }

        // Show a test notification
        new Notification('EventBuddy Notifications Enabled! 🎉', {
          body: 'You will now receive real-time congestion alerts',
          icon: '/pwa-192x192.png',
          badge: '/pwa-64x64.png',
          tag: 'welcome'
        } as NotificationOptions);
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  // Helper function to convert VAPID key
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Don't show banner if app is already installed
  if (isInstalled) {
    // Show notification prompt if not enabled
    if (notificationPermission === 'default') {
      return (
        <AnimatePresence>
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
          >
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 bg-white/20 rounded-lg p-2">
                  <Bell className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">Enable Live Alerts</h3>
                  <p className="text-sm text-purple-100 mb-3">
                    Get instant notifications about congestion updates and event changes
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleEnableNotifications}
                      className="flex-1 bg-white text-purple-600 font-semibold py-2 px-4 rounded-lg hover:bg-purple-50 transition-colors"
                    >
                      Enable Alerts
                    </button>
                    <button
                      onClick={() => setNotificationPermission('denied')}
                      className="px-4 py-2 text-white/80 hover:text-white transition-colors"
                    >
                      Later
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      );
    }
    return null;
  }

  // Show install banner
  if (!showBanner || !deferredPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
      >
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-2xl p-4 relative">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-white/80 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-start gap-3 pr-6">
            <div className="flex-shrink-0 bg-white/20 rounded-lg p-2">
              <Smartphone className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Install EventBuddy</h3>
              <p className="text-sm text-purple-100 mb-3">
                Add to your home screen for quick access and real-time notifications
              </p>
              
              <div className="flex gap-2 mb-3">
                <div className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-3 py-1">
                  <Download className="h-3 w-3" />
                  <span>Offline Access</span>
                </div>
                <div className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-3 py-1">
                  <Bell className="h-3 w-3" />
                  <span>Live Alerts</span>
                </div>
              </div>
              
              <button
                onClick={handleInstallClick}
                className="w-full bg-white text-purple-600 font-semibold py-2 px-4 rounded-lg hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Add to Home Screen
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAInstallBanner;

