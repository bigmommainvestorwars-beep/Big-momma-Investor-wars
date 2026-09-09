/**
 * Production Auction Repository
 * Authoritative Firestore repository for auctions (/matches/{matchId}/auctions/{auctionId}).
 */

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  Firestore,
  Unsubscribe,
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { Auction } from '../../types/auction';
import { getFirebaseFirestore } from '../firebase/config';

const auctionConverter: FirestoreDataConverter<Auction> = {
  toFirestore(auction: Auction): DocumentData {
    return { ...auction };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Auction {
    return snapshot.data() as Auction;
  },
};

export class AuctionRepository {
  private getDb(): Firestore {
    return getFirebaseFirestore();
  }

  public async getAuction(matchId: string, auctionId: string): Promise<Auction | null> {
    const ref = doc(this.getDb(), 'matches', matchId, 'auctions', auctionId).withConverter(auctionConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  }

  public async getActiveAuction(matchId: string): Promise<Auction | null> {
    const colRef = collection(this.getDb(), 'matches', matchId, 'auctions').withConverter(auctionConverter);
    const q = query(colRef, where('status', '==', 'active'));
    const snap = await getDocs(q);
    return snap.empty ? null : snap.docs[0].data();
  }

  public async setAuction(matchId: string, auction: Auction): Promise<void> {
    const ref = doc(this.getDb(), 'matches', matchId, 'auctions', auction.id).withConverter(auctionConverter);
    await setDoc(ref, auction, { merge: true });
  }

  public subscribeToActiveAuction(
    matchId: string,
    onNext: (auction: Auction | null) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const colRef = collection(this.getDb(), 'matches', matchId, 'auctions').withConverter(auctionConverter);
    const q = query(colRef, where('status', '==', 'active'));
    return onSnapshot(
      q,
      (snap) => {
        onNext(snap.empty ? null : snap.docs[0].data());
      },
      onError
    );
  }
}

export const auctionRepository = new AuctionRepository();
