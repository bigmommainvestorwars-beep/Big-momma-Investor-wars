/**
 * Production User Repository
 * Authoritative Firestore repository for user documents.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Firestore,
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { User, UserProfile } from '../../types/auth';
import { getFirebaseFirestore } from '../firebase/config';

export interface UserDocument extends User {
  profile?: UserProfile;
  scheduledDeletionAt?: number | null;
  accountStatus: 'active' | 'suspended' | 'pending_deletion';
}

const userConverter: FirestoreDataConverter<UserDocument> = {
  toFirestore(user: UserDocument): DocumentData {
    return { ...user };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): UserDocument {
    return snapshot.data() as UserDocument;
  },
};

export class UserRepository {
  private getDb(): Firestore {
    return getFirebaseFirestore();
  }

  public async getUser(userId: string): Promise<UserDocument | null> {
    const userRef = doc(this.getDb(), 'users', userId).withConverter(userConverter);
    const snap = await getDoc(userRef);
    return snap.exists() ? snap.data() : null;
  }

  public async createUser(user: UserDocument): Promise<void> {
    const userRef = doc(this.getDb(), 'users', user.uid).withConverter(userConverter);
    await setDoc(userRef, user, { merge: true });
  }

  public async updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
    const userRef = doc(this.getDb(), 'users', userId);
    await updateDoc(userRef, {
      profile,
      updatedAt: Date.now(),
    });
  }

  public async scheduleAccountDeletion(userId: string, scheduledAt: number): Promise<void> {
    const userRef = doc(this.getDb(), 'users', userId);
    await updateDoc(userRef, {
      accountStatus: 'pending_deletion',
      scheduledDeletionAt: scheduledAt,
      updatedAt: Date.now(),
    });
  }

  public async cancelAccountDeletion(userId: string): Promise<void> {
    const userRef = doc(this.getDb(), 'users', userId);
    await updateDoc(userRef, {
      accountStatus: 'active',
      scheduledDeletionAt: null,
      updatedAt: Date.now(),
    });
  }
}

export const userRepository = new UserRepository();
