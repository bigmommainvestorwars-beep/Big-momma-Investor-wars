/**
 * Production Bid Repository
 * Authoritative Firestore repository for auction bids.
 * Stores bids in a subcollection to prevent unbounded document growth.
 * Path: /matches/{matchId}/auctions/{auctionId}/bids/{bidId}
 */

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  Firestore,
  Unsubscribe,
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { Bid } from '../../types/auction';
import { getFirebaseFirestore } from '../firebase/config';

const bidConverter: FirestoreDataConverter<Bid> = {
  toFirestore(bid: Bid): DocumentData {
    return { ...bid };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Bid {
    return snapshot.data() as Bid;
  },
};

export class BidRepository {
  private getDb(): Firestore {
    return getFirebaseFirestore();
  }

  public async getBid(matchId: string, auctionId: string, bidId: string): Promise<Bid | null> {
    const ref = doc(this.getDb(), 'matches', matchId, 'auctions', auctionId, 'bids', bidId).withConverter(bidConverter);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  }

  public async getBidsForAuction(matchId: string, auctionId: string, maxBids = 50): Promise<Bid[]> {
    const colRef = collection(this.getDb(), 'matches', matchId, 'auctions', auctionId, 'bids').withConverter(bidConverter);
    const q = query(colRef, orderBy('amount', 'desc'), orderBy('timestamp', 'desc'), limit(maxBids));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  }

  public async recordBid(matchId: string, auctionId: string, bid: Bid): Promise<void> {
    const ref = doc(this.getDb(), 'matches', matchId, 'auctions', auctionId, 'bids', bid.bidId).withConverter(bidConverter);
    await setDoc(ref, bid);
  }

  public subscribeToBids(
    matchId: string,
    auctionId: string,
    onNext: (bids: Bid[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const colRef = collection(this.getDb(), 'matches', matchId, 'auctions', auctionId, 'bids').withConverter(bidConverter);
    const q = query(colRef, orderBy('amount', 'desc'), limit(20));
    return onSnapshot(
      q,
      (snap) => {
        onNext(snap.docs.map((d) => d.data()));
      },
      onError
    );
  }
}

export const bidRepository = new BidRepository();
