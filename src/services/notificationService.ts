/**
 * Notification Service for PWA Push Notifications
 * Handles push notification subscriptions and sending notifications
 */

export interface PushSubscriptionData {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class NotificationService {
  private vapidPublicKey: string | null = null;
  private readonly API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://eventai-server.munymunyhom.tech';

  /**
   * Get VAPID public key from backend
   */
  async getPublicKey(): Promise<string> {
    if (this.vapidPublicKey) {
      return this.vapidPublicKey;
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}/notifications/public-key`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch public key: ${response.statusText}`);
      }

      const result = await response.json();
      this.vapidPublicKey = result.data.publicKey;
      
      console.log('✅ VAPID public key fetched from backend');
      return this.vapidPublicKey!;
    } catch (error) {
      console.error('❌ Error fetching public key:', error);
      // Fallback to hardcoded key if backend is unavailable
      this.vapidPublicKey = 'BCo-xf8Jfbq7HaY7IPEPsOA07RUtlEvCpgagnZfCu8Ow12RRGDaCeIujwB5rCoKbDMrhnTEpij75q_Ig4kd7fu0';
      console.warn('⚠️ Using fallback VAPID public key');
      return this.vapidPublicKey;
    }
  }

  /**
   * Request notification permission from the user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(eventId: string): Promise<PushSubscriptionData | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return null;
    }

    try {
      // Get VAPID public key from backend
      const publicKey = await this.getPublicKey();
      
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Subscribe to push notifications
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(publicKey)
        });
      }

      // Use toJSON() format to match backend expectations
      const subscriptionJSON = subscription.toJSON();
      const subscriptionData: PushSubscriptionData = {
        endpoint: subscriptionJSON.endpoint!,
        expirationTime: subscriptionJSON.expirationTime,
        keys: {
          p256dh: subscriptionJSON.keys!.p256dh,
          auth: subscriptionJSON.keys!.auth
        }
      };

      console.log('✅ Push subscription created:', subscriptionData);

      // Send subscription to backend
      await this.sendSubscriptionToBackend(eventId, subscriptionData);

      return subscriptionData;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        const endpoint = subscription.endpoint;
        
        // Unsubscribe from browser
        await subscription.unsubscribe();
        
        // Notify backend
        try {
          const response = await fetch(`${this.API_BASE_URL}/notifications/unsubscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint })
          });
          
          if (response.ok) {
            console.log('✅ Unsubscribed from push notifications');
          }
        } catch (error) {
          console.error('Error notifying backend of unsubscribe:', error);
          // Still return true since browser unsubscribe succeeded
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      return false;
    }
  }

  /**
   * Show a local notification
   */
  async showNotification(
    title: string, 
    options: NotificationOptions & { data?: any }
  ): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          icon: '/pwa-192x192.png',
          badge: '/pwa-64x64.png',
          ...options
        } as NotificationOptions & { vibrate?: number[] });
      } else {
        new Notification(title, {
          icon: '/pwa-192x192.png',
          badge: '/pwa-64x64.png',
          ...options
        } as NotificationOptions);
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  /**
   * Send a congestion alert notification
   */
  async sendCongestionAlert(
    area: string, 
    level: 'Low' | 'Moderate' | 'High' | 'Overcrowded',
    peopleCount: number
  ): Promise<void> {
    const emojis = {
      Low: '🟢',
      Moderate: '🟡',
      High: '🟠',
      Overcrowded: '🔴'
    };

    const messages = {
      Low: 'Congestion is low',
      Moderate: 'Moderate congestion detected',
      High: 'High congestion alert!',
      Overcrowded: '⚠️ OVERCROWDED - Take action!'
    };

    await this.showNotification(`${emojis[level]} ${area}`, {
      body: `${messages[level]} - ${peopleCount} people`,
      tag: `congestion-${area}`,
      requireInteraction: level === 'Overcrowded',
      data: { area, level, peopleCount }
    });
  }

  /**
   * Helper: Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
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
  }

  /**
   * Send subscription to backend
   */
  private async sendSubscriptionToBackend(
    eventId: string, 
    subscription: PushSubscriptionData
  ): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Add auth token if needed
          // 'Authorization': `Bearer ${yourAuthToken}`
        },
        body: JSON.stringify({ 
          eventId, 
          subscription 
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to send subscription: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Subscription sent to backend:', data);
      
      if (data.success) {
        console.log('📝 Subscription ID:', data.data.subscriptionId);
      }
    } catch (error) {
      console.error('❌ Error sending subscription to backend:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;

