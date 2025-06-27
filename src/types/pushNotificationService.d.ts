// Type definitions for pushNotificationService.js
declare module '../services/pushNotificationService' {
  interface PushNotificationService {
    init(userId: string): Promise<boolean>;
    subscribe(userId: string): Promise<PushSubscription | null>;
    unsubscribe(userId: string): Promise<boolean>;
    testNotification(userId: string): Promise<boolean>;
    isSupported(): boolean;
    isPermissionGranted(): boolean;
    isSubscribed(): boolean;
  }

  const pushNotificationService: PushNotificationService;
  export default pushNotificationService;
}
