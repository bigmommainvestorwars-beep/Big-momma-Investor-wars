/**
 * Phase 5 Push Notification Triggers & In-App Notification Center:
 * Handles Web/Native push permissions, sound cues, asynchronous turn alerts,
 * auction outbid alerts, tournament reminders, and syndicate events.
 */

export type NotificationType =
  | 'YOUR_TURN'
  | 'OPPONENT_ROLL'
  | 'AUCTION_OUTBID'
  | 'TOURNAMENT_REMINDER'
  | 'SYNDICATE_EVENT'
  | 'DIRECT_CHALLENGE'
  | 'SEASON_REWARD';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  soundCue?: boolean;
}

const STORAGE_NOTIFICATIONS_KEY = 'bm_in_app_notifications_v1';
const STORAGE_SOUND_ENABLED_KEY = 'bm_notification_sound_enabled';

type NotificationListener = (notifications: AppNotification[], unreadCount: number) => void;

class NotificationServiceClass {
  private listeners: Set<NotificationListener> = new Set();
  private audioCtx: AudioContext | null = null;

  constructor() {
    // Seed initial notifications if empty
    this.ensureInitialNotifications();
  }

  private ensureInitialNotifications(): void {
    const existing = this.getNotifications();
    if (existing.length === 0) {
      const initial: AppNotification[] = [
        {
          id: 'notif_welcome_season',
          type: 'SEASON_REWARD',
          title: 'Season 1: Sovereign Apex Underway!',
          message: 'Compete in ranked matches to climb from Bronze to Apex Investor and earn up to 50,000 ƁM weekly!',
          timestamp: Date.now() - 3600000,
          read: false,
          actionLabel: 'View Leaderboard',
        },
        {
          id: 'notif_syndicate_welcome',
          type: 'SYNDICATE_EVENT',
          title: 'Apex Sovereign Cartel Perk Active',
          message: 'Your syndicate has unlocked the Apex Cartel Dividend (+5% rental yields)!',
          timestamp: Date.now() - 7200000,
          read: false,
          actionLabel: 'View Syndicate',
        },
      ];
      this.saveNotifications(initial);
    }
  }

  private memoryNotifications: AppNotification[] | null = null;
  private memorySoundEnabled: boolean = true;

  public getNotifications(): AppNotification[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_NOTIFICATIONS_KEY);
        if (raw) return JSON.parse(raw);
      } else if (this.memoryNotifications) {
        return this.memoryNotifications;
      }
    } catch (e) {
      console.warn('Error reading notifications:', e);
    }
    return [];
  }

  private saveNotifications(list: AppNotification[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_NOTIFICATIONS_KEY, JSON.stringify(list));
      } else {
        this.memoryNotifications = list;
      }
    } catch (e) {
      console.warn('Error saving notifications:', e);
    }
  }

  public isSoundEnabled(): boolean {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(STORAGE_SOUND_ENABLED_KEY) !== 'false';
    }
    return this.memorySoundEnabled;
  }

  public setSoundEnabled(enabled: boolean): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_SOUND_ENABLED_KEY, enabled ? 'true' : 'false');
    } else {
      this.memorySoundEnabled = enabled;
    }
  }

  public async requestPushPermission(): Promise<NotificationPermission> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        return permission;
      } catch (e) {
        console.warn('Notification permission error:', e);
        return 'denied';
      }
    }
    return 'denied';
  }

  public isPushGranted(): boolean {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  }

  /**
   * Generates custom Web Audio synthesized chimes for various game events
   */
  private playSoundCue(type: NotificationType): void {
    if (!this.isSoundEnabled()) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'YOUR_TURN') {
        // High alert two-tone ping (880Hz -> 1320Hz)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'AUCTION_OUTBID') {
        // Dramatic minor tension buzz (440Hz -> 370Hz)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(370, now + 0.25);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'SEASON_REWARD') {
        // Joyful chord fanfare (523Hz -> 659Hz -> 783Hz)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else {
        // Gentle bell blip
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {
      console.warn('Audio synthesis failed:', e);
    }
  }

  /**
   * Dispatch an authoritative notification into the notification drawer
   * and display a browser notification if allowed.
   */
  public dispatch(
    type: NotificationType,
    title: string,
    message: string,
    actionUrl?: string,
    actionLabel?: string
  ): AppNotification {
    const notifications = this.getNotifications();
    const newNotif: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      title,
      message,
      timestamp: Date.now(),
      read: false,
      actionUrl,
      actionLabel,
      soundCue: true,
    };

    notifications.unshift(newNotif);
    // Keep last 40 notifications
    if (notifications.length > 40) {
      notifications.pop();
    }
    this.saveNotifications(notifications);

    // Audio cue
    this.playSoundCue(type);

    // Native / Web push notification fallback
    if (this.isPushGranted()) {
      try {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico',
        });
      } catch (err) {
        console.warn('Native notification error:', err);
      }
    }

    this.notifyListeners();
    return newNotif;
  }

  // Specialized triggers requested in GDD Phase 5:
  public triggerYourTurn(matchId: string, timeLeftSeconds: number = 60): AppNotification {
    return this.dispatch(
      'YOUR_TURN',
      '⚡ Your Turn to Move!',
      `You have ${timeLeftSeconds}s to roll the dice or execute Strategy Cards.`,
      `#match_${matchId}`,
      'Roll Now'
    );
  }

  public triggerOpponentRoll(opponentName: string, roll: number, spaceName: string): AppNotification {
    return this.dispatch(
      'OPPONENT_ROLL',
      `🎲 ${opponentName} Rolled ${roll}`,
      `Landed on [${spaceName}]. Ready for market impact.`
    );
  }

  public triggerAuctionOutbid(assetName: string, amountBM: number, bidderName: string): AppNotification {
    return this.dispatch(
      'AUCTION_OUTBID',
      `📉 Outbid on ${assetName}!`,
      `${bidderName} placed a winning bid of ${amountBM.toLocaleString()} ƁM. Place counter-bid now!`,
      undefined,
      'Counter Bid'
    );
  }

  public triggerTournamentReminder(minutesLeft: number = 15): AppNotification {
    return this.dispatch(
      'TOURNAMENT_REMINDER',
      '🏆 Weekly Tournament Starting',
      `Season 1 Ranked distribution and Tournament commences in ${minutesLeft} minutes!`,
      undefined,
      'View Standings'
    );
  }

  public triggerDirectChallenge(challengerName: string, roomCode: string): AppNotification {
    return this.dispatch(
      'DIRECT_CHALLENGE',
      `⚔️ Match Challenge from ${challengerName}`,
      `Invited you to a 1v1 match in Room [${roomCode}].`,
      `#room_${roomCode}`,
      'Accept & Join'
    );
  }

  public getUnreadCount(): number {
    return this.getNotifications().filter((n) => !n.read).length;
  }

  public markAsRead(id: string): void {
    const list = this.getNotifications();
    const item = list.find((n) => n.id === id);
    if (item) {
      item.read = true;
      this.saveNotifications(list);
      this.notifyListeners();
    }
  }

  public markAllAsRead(): void {
    const list = this.getNotifications().map((n) => ({ ...n, read: true }));
    this.saveNotifications(list);
    this.notifyListeners();
  }

  public clearAll(): void {
    this.saveNotifications([]);
    this.notifyListeners();
  }

  public subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    const list = this.getNotifications();
    const unread = list.filter((n) => !n.read).length;
    listener(list, unread);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const list = this.getNotifications();
    const unread = list.filter((n) => !n.read).length;
    this.listeners.forEach((fn) => fn(list, unread));
  }
}

export const NotificationService = new NotificationServiceClass();
