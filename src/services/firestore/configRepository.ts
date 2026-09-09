/**
 * Production Configuration Repository
 * Firestore repository for system & ruleset configurations (/configurations/{configId}).
 */

import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  Firestore,
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '../firebase/config';

export interface ConfigurationDocument<T = unknown> {
  configId: string;
  configType: 'ruleset' | 'board' | 'companies' | 'market_events' | 'sp_actions' | 'system';
  version: string;
  payload: T;
  updatedAt: number;
}

const configConverter: FirestoreDataConverter<ConfigurationDocument> = {
  toFirestore(config: ConfigurationDocument): DocumentData {
    return { ...config };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): ConfigurationDocument {
    return snapshot.data() as ConfigurationDocument;
  },
};

export class ConfigRepository {
  private getDb(): Firestore {
    return getFirebaseFirestore();
  }

  public async getConfiguration<T = unknown>(configId: string): Promise<ConfigurationDocument<T> | null> {
    const ref = doc(this.getDb(), 'configurations', configId).withConverter(configConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as ConfigurationDocument<T>) : null;
  }

  public async setConfiguration<T = unknown>(config: ConfigurationDocument<T>): Promise<void> {
    const ref = doc(this.getDb(), 'configurations', config.configId).withConverter(configConverter);
    await setDoc(ref, config, { merge: true });
  }

  public async getAllConfigurations(): Promise<ConfigurationDocument[]> {
    const colRef = collection(this.getDb(), 'configurations').withConverter(configConverter);
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => d.data());
  }
}

export const configRepository = new ConfigRepository();
