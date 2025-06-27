// Push Notification Service
class PushNotificationService {
  constructor() {
    this.registration = null;
    this.subscription = null;
    this.vapidPublicKey = null;
    this.serverURL = import.meta.env.VITE_SERVER_URL || 
                    import.meta.env.VITE_API_URL;
  }

  // Initialize push notifications
  async init(userId) {
    try {
      console.log('🔔 Initializing push notifications...');
      
      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service workers not supported');
      }

      // Check if push messaging is supported
      if (!('PushManager' in window)) {
        throw new Error('Push messaging not supported');
      }

      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service worker registered:', this.registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Get VAPID public key from server
      await this.getVapidPublicKey();

      // Request permission and subscribe
      const hasPermission = await this.requestPermission();
      if (hasPermission && userId) {
        await this.subscribe(userId);
      }

      return true;
    } catch (error) {
      console.error('❌ Error initializing push notifications:', error);
      return false;
    }
  }

  // Get VAPID public key from server
  async getVapidPublicKey() {
    try {
      const response = await fetch(`${this.serverURL}/api/push/vapid-public-key`);
      const data = await response.json();
      this.vapidPublicKey = data.publicKey;
      console.log('✅ Got VAPID public key');
    } catch (error) {
      console.error('❌ Error getting VAPID public key:', error);
      throw error;
    }
  }

  // Request notification permission
  async requestPermission() {
    try {
      const permission = await Notification.requestPermission();
      console.log('📋 Notification permission:', permission);
      
      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        return true;
      } else if (permission === 'denied') {
        console.log('❌ Notification permission denied');
        return false;
      } else {
        console.log('⚠️ Notification permission dismissed');
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting permission:', error);
      return false;
    }
  }

  // Subscribe to push notifications
  async subscribe(userId) {
    try {
      if (!this.registration || !this.vapidPublicKey) {
        throw new Error('Service worker or VAPID key not available');
      }

      // Check if already subscribed
      const existingSubscription = await this.registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('📱 Already subscribed to push notifications');
        this.subscription = existingSubscription;
        
        // Update subscription on server
        await this.sendSubscriptionToServer(userId, existingSubscription);
        return existingSubscription;
      }

      // Create new subscription
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      console.log('✅ Subscribed to push notifications:', subscription);
      this.subscription = subscription;

      // Send subscription to server
      await this.sendSubscriptionToServer(userId, subscription);

      return subscription;
    } catch (error) {
      console.error('❌ Error subscribing to push notifications:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(userId) {
    try {
      if (!this.subscription) {
        console.log('📵 Not subscribed to push notifications');
        return true;
      }

      // Unsubscribe from browser
      const success = await this.subscription.unsubscribe();
      
      if (success) {
        console.log('✅ Unsubscribed from push notifications');
        
        // Notify server
        await this.sendUnsubscribeToServer(userId, this.subscription.endpoint);
        
        this.subscription = null;
        return true;
      } else {
        console.log('❌ Failed to unsubscribe from push notifications');
        return false;
      }
    } catch (error) {
      console.error('❌ Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  // Send subscription to server
  async sendSubscriptionToServer(userId, subscription) {
    try {
      const response = await fetch(`${this.serverURL}/api/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
              auth: arrayBufferToBase64(subscription.getKey('auth'))
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Subscription sent to server:', data);
    } catch (error) {
      console.error('❌ Error sending subscription to server:', error);
      throw error;
    }
  }

  // Send unsubscribe to server
  async sendUnsubscribeToServer(userId, endpoint) {
    try {
      const response = await fetch(`${this.serverURL}/api/push/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          endpoint
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      console.log('✅ Unsubscribe sent to server');
    } catch (error) {
      console.error('❌ Error sending unsubscribe to server:', error);
      throw error;
    }
  }

  // Test push notification
  async testNotification(userId) {
    try {
      const response = await fetch(`${this.serverURL}/api/push/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();
      console.log('🧪 Test notification result:', data);
      return data.success;
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      return false;
    }
  }

  // Check if notifications are supported
  isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  // Check if permission is granted
  isPermissionGranted() {
    return Notification.permission === 'granted';
  }

  // Check if subscribed
  isSubscribed() {
    return !!this.subscription;
  }

  // Convert VAPID key to Uint8Array
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Create singleton instance
const pushNotificationService = new PushNotificationService();

export default pushNotificationService;
