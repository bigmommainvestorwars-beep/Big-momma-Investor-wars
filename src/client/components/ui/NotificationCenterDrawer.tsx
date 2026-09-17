import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  X,
  Volume2,
  VolumeX,
  CheckCheck,
  Trash2,
  Zap,
  Dices,
  Gavel,
  Trophy,
  Shield,
  Swords,
  Gift,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import {
  NotificationService,
  AppNotification,
  NotificationType,
} from '../../../services/notifications/notificationService';
import { useNavigation } from '../../context/NavigationContext';

export const NotificationCenterDrawer: React.FC = () => {
  const { navigate } = useNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    NotificationService.getNotifications()
  );
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isPushEnabled, setIsPushEnabled] = useState<boolean>(() =>
    NotificationService.isPushGranted()
  );
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() =>
    NotificationService.isSoundEnabled()
  );

  useEffect(() => {
    const unsub = NotificationService.subscribe((list, unread) => {
      setNotifications(list);
      setUnreadCount(unread);
    });
    return unsub;
  }, []);

  const handleTogglePush = async () => {
    const perm = await NotificationService.requestPushPermission();
    setIsPushEnabled(perm === 'granted');
  };

  const handleToggleSound = () => {
    const next = !isSoundEnabled;
    setIsSoundEnabled(next);
    NotificationService.setSoundEnabled(next);
  };

  const handleNotificationAction = (notif: AppNotification) => {
    NotificationService.markAsRead(notif.id);
    setIsOpen(false);
    if (notif.type === 'YOUR_TURN' || notif.type === 'OPPONENT_ROLL') {
      navigate('GAMEPLAY');
    } else if (notif.type === 'SEASON_REWARD' || notif.type === 'TOURNAMENT_REMINDER') {
      navigate('RANKED' as any);
    } else if (notif.type === 'SYNDICATE_EVENT' || notif.type === 'DIRECT_CHALLENGE') {
      navigate('SOCIAL' as any);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'YOUR_TURN':
        return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'OPPONENT_ROLL':
        return <Dices className="w-4 h-4 text-cyan-400" />;
      case 'AUCTION_OUTBID':
        return <Gavel className="w-4 h-4 text-rose-400" />;
      case 'TOURNAMENT_REMINDER':
        return <Trophy className="w-4 h-4 text-amber-400" />;
      case 'SYNDICATE_EVENT':
        return <Shield className="w-4 h-4 text-emerald-400" />;
      case 'DIRECT_CHALLENGE':
        return <Swords className="w-4 h-4 text-indigo-400" />;
      case 'SEASON_REWARD':
        return <Gift className="w-4 h-4 text-purple-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <>
      {/* Floating Bell Trigger Button */}
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(true)}
        className="relative p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-slate-500 text-slate-300 hover:text-white transition-all cursor-pointer shadow-lg backdrop-blur-md active:scale-95"
        title="Open Notification Center"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white font-mono font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse border-2 border-slate-950">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Slide-out Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-slate-950 border-l border-slate-800 h-full flex flex-col shadow-2xl text-slate-100"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-white">
                    Live Alerts & Push Triggers
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {unreadCount} Unread
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleSound}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
                    title={isSoundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
                  >
                    {isSoundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Push Permission Toggle Banner */}
              <div className="p-3 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-300">
                    Push Notifications:
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                      isPushEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {isPushEnabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                {!isPushEnabled && (
                  <button
                    onClick={handleTogglePush}
                    className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Enable
                  </button>
                )}
              </div>

              {/* Interactive Test Triggers for GDD Phase 5 verification */}
              <div className="p-3 bg-slate-900/40 border-b border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Test Push Triggers (GDD Phase 5)</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[9px] font-mono">
                  <button
                    onClick={() => NotificationService.triggerYourTurn('m_77', 60)}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-yellow-300 border border-slate-700 cursor-pointer"
                  >
                    Turn Alert
                  </button>
                  <button
                    onClick={() => NotificationService.triggerOpponentRoll('AlphaArbitrage', 8, 'Wall St Citadel')}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 cursor-pointer"
                  >
                    Opponent Roll
                  </button>
                  <button
                    onClick={() => NotificationService.triggerAuctionOutbid('Sentient AI Labs', 6500, 'TitanVenture')}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 cursor-pointer"
                  >
                    Auction Outbid
                  </button>
                  <button
                    onClick={() => NotificationService.triggerTournamentReminder(15)}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer"
                  >
                    Tournament
                  </button>
                  <button
                    onClick={() => NotificationService.triggerDirectChallenge('WallStValkyrie', 'BM-9921')}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 cursor-pointer"
                  >
                    1v1 Challenge
                  </button>
                  <button
                    onClick={() =>
                      NotificationService.dispatch(
                        'SYNDICATE_EVENT',
                        'Syndicate Perk Active',
                        'Apex Sovereign Cartel unlocked +5% Rent yield!'
                      )
                    }
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 cursor-pointer"
                  >
                    Syndicate Perk
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 p-2">
                {notifications.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 text-xs font-mono">
                    No active notifications or alerts.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3.5 rounded-xl transition-colors ${
                        notif.read ? 'bg-transparent' : 'bg-slate-900/60 border border-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 shrink-0 mt-0.5">
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">
                              {notif.title}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {new Date(notif.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed mt-1">
                            {notif.message}
                          </p>

                          {/* Quick Action Button */}
                          <div className="mt-2.5 flex items-center justify-between">
                            <button
                              onClick={() => handleNotificationAction(notif)}
                              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer transition-colors"
                            >
                              {notif.actionLabel || 'View Details'}
                            </button>
                            {!notif.read && (
                              <button
                                onClick={() => NotificationService.markAsRead(notif.id)}
                                className="text-[10px] font-mono text-slate-500 hover:text-slate-300 cursor-pointer"
                              >
                                Mark Read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                <button
                  onClick={() => NotificationService.markAllAsRead()}
                  className="text-slate-400 hover:text-white cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all as read
                </button>
                <button
                  onClick={() => NotificationService.clearAll()}
                  className="text-slate-500 hover:text-rose-400 cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear all
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
