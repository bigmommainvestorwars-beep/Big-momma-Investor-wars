/**
 * Phase 5 Social & Friends System:
 * Friend invitations, friend code lookup, presence tracking,
 * and direct private room challenge dispatching.
 */

export interface Friend {
  userId: string;
  friendCode: string;
  displayName: string;
  elo: number;
  tier: string;
  presence: 'online' | 'in_match' | 'offline';
  activeMatchId?: string;
  syndicateTag?: string;
  avatarSeed?: string;
  lastSeen: number;
}

const STORAGE_FRIENDS_KEY = 'bm_friends_list_v1';
const STORAGE_MY_FRIEND_CODE_KEY = 'bm_my_friend_code_v1';

export class FriendsService {
  /**
   * Returns or generates the user's permanent Friend Code (e.g. BM-7842)
   */
  public static getMyFriendCode(): string {
    let code = localStorage.getItem(STORAGE_MY_FRIEND_CODE_KEY);
    if (!code) {
      const rand = Math.floor(1000 + Math.random() * 9000);
      code = `BM-${rand}`;
      localStorage.setItem(STORAGE_MY_FRIEND_CODE_KEY, code);
    }
    return code;
  }

  public static getFriends(): Friend[] {
    try {
      const raw = localStorage.getItem(STORAGE_FRIENDS_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error reading friends list:', e);
    }

    const seededFriends: Friend[] = [
      {
        userId: 'friend_1',
        friendCode: 'BM-1102',
        displayName: 'WallStreetValkyrie',
        elo: 2360,
        tier: 'Apex Investor',
        presence: 'online',
        syndicateTag: 'GOLD',
        lastSeen: Date.now() - 120000,
      },
      {
        userId: 'friend_2',
        friendCode: 'BM-4521',
        displayName: 'AlphaArbitrage',
        elo: 2320,
        tier: 'Apex Investor',
        presence: 'in_match',
        activeMatchId: 'match_live_772',
        syndicateTag: 'APEX',
        lastSeen: Date.now() - 30000,
      },
      {
        userId: 'friend_3',
        friendCode: 'BM-8831',
        displayName: 'QuantumShort',
        elo: 2095,
        tier: 'Diamond',
        presence: 'online',
        syndicateTag: 'HFT',
        lastSeen: Date.now() - 600000,
      },
      {
        userId: 'friend_4',
        friendCode: 'BM-2049',
        displayName: 'MayfairTycoon',
        elo: 2040,
        tier: 'Diamond',
        presence: 'offline',
        syndicateTag: 'MAYF',
        lastSeen: Date.now() - 14400000,
      },
    ];

    this.saveFriends(seededFriends);
    return seededFriends;
  }

  public static saveFriends(friends: Friend[]): void {
    try {
      localStorage.setItem(STORAGE_FRIENDS_KEY, JSON.stringify(friends));
    } catch (e) {
      console.warn('Error saving friends list:', e);
    }
  }

  /**
   * Add friend by Friend Code
   */
  public static addFriendByCode(code: string): { success: boolean; friend?: Friend; message: string } {
    const formatted = code.trim().toUpperCase();
    if (formatted === this.getMyFriendCode()) {
      return { success: false, message: 'You cannot add your own Friend Code.' };
    }

    const friends = this.getFriends();
    if (friends.some((f) => f.friendCode === formatted)) {
      return { success: false, message: `Investor with code ${formatted} is already in your contacts.` };
    }

    // Mock realistic user matching code
    const names = ['ApexStalker', 'BillionaireBear', 'QuantBaron', 'ArbitrageQueen', 'HedgeMaster'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomElo = 1350 + Math.floor(Math.random() * 600);

    const newFriend: Friend = {
      userId: `friend_${Date.now()}`,
      friendCode: formatted,
      displayName: randomName,
      elo: randomElo,
      tier: randomElo >= 1900 ? 'Diamond' : randomElo >= 1600 ? 'Platinum' : 'Gold',
      presence: 'online',
      syndicateTag: 'APEX',
      lastSeen: Date.now(),
    };

    friends.unshift(newFriend);
    this.saveFriends(friends);

    return {
      success: true,
      friend: newFriend,
      message: `Connected with ${newFriend.displayName} (${formatted})!`,
    };
  }

  public static removeFriend(userId: string): { success: boolean; message: string } {
    const friends = this.getFriends().filter((f) => f.userId !== userId);
    this.saveFriends(friends);
    return { success: true, message: 'Friend removed.' };
  }

  /**
   * Dispatch a direct room challenge to an online friend
   */
  public static issueDirectChallenge(friend: Friend, roomCode: string): {
    success: boolean;
    challengeLink: string;
    message: string;
  } {
    const challengeLink = `${window.location.origin}?room=${roomCode}`;
    return {
      success: true,
      challengeLink,
      message: `Direct 1v1 challenge invitation dispatched to ${friend.displayName} for room ${roomCode}!`,
    };
  }
}
