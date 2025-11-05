/**
 * Browser Notification Service
 * Handles requesting permissions and displaying browser notifications
 */

export class BrowserNotificationService {
  /**
   * Request notification permission from the browser
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return 'denied';
    }
    
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    
    if (Notification.permission === 'denied') {
      return 'denied';
    }
    
    return await Notification.requestPermission();
  }
  
  /**
   * Show a browser notification
   */
  static async showNotification(title: string, options: NotificationOptions = {}) {
    const permission = await this.requestPermission();
    
    if (permission === 'granted') {
      new Notification(title, {
        icon: '/icon-192.png',
        badge: '/favicon.ico',
        requireInteraction: false,
        ...options
      });
    }
  }
  
  /**
   * Check if browser supports notifications
   */
  static isSupported(): boolean {
    return 'Notification' in window;
  }
  
  /**
   * Get current notification permission status
   */
  static getPermission(): NotificationPermission {
    if (!this.isSupported()) {
      return 'denied';
    }
    return Notification.permission;
  }
  
  /**
   * Check if notifications are enabled (permission granted)
   */
  static isEnabled(): boolean {
    return this.getPermission() === 'granted';
  }
}
