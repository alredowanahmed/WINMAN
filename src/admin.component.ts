import { Component, ChangeDetectionStrategy, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { db, auth, loginWithGoogle, logout, handleFirestoreError, OperationType } from './firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface Ad {
  id?: string;
  title: string;
  description: string;
  link: string;
  adScript?: string;
  active: boolean;
  createdAt?: any;
}

interface UserStat {
  uid: string;
  usageCount: number;
  lastUsed: any;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './admin.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent implements OnInit, OnDestroy {
  user = signal<any>(null);
  isAdmin = signal(false);
  ads = signal<Ad[]>([]);
  userStats = signal<UserStat[]>([]);
  
  view = signal<'ads' | 'users'>('ads');
  
  newAd = signal<Ad>({
    title: '',
    description: '',
    link: '',
    adScript: '',
    active: true
  });

  isLoading = signal(false);
  error = signal<string | null>(null);

  private adsUnsubscribe: (() => void) | null = null;
  private statsUnsubscribe: (() => void) | null = null;
  private authUnsubscribe: (() => void) | null = null;

  ngOnInit() {
    this.authUnsubscribe = auth.onAuthStateChanged((user) => {
      this.user.set(user);
      if (user && user.email === 'fahimdj071@gmail.com' && user.emailVerified) {
        this.isAdmin.set(true);
        this.loadAds();
        this.loadUserStats();
      } else {
        this.isAdmin.set(false);
        this.unsubscribeAll();
      }
    });
  }

  ngOnDestroy() {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }
    this.unsubscribeAll();
  }

  private unsubscribeAll() {
    if (this.adsUnsubscribe) {
      this.adsUnsubscribe();
      this.adsUnsubscribe = null;
    }
    if (this.statsUnsubscribe) {
      this.statsUnsubscribe();
      this.statsUnsubscribe = null;
    }
  }

  async login() {
    try {
      await loginWithGoogle();
    } catch (e: any) {
      this.error.set('Login failed: ' + e.message);
    }
  }

  async logout() {
    try {
      await logout();
      this.isAdmin.set(false);
      this.ads.set([]);
    } catch (e: any) {
      this.error.set('Logout failed: ' + e.message);
    }
  }

  loadAds() {
    if (this.adsUnsubscribe) this.adsUnsubscribe();
    const adsRef = collection(db, 'ads');
    const q = query(adsRef, orderBy('createdAt', 'desc'));
    
    this.adsUnsubscribe = onSnapshot(q, (snapshot) => {
      const adsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ad[];
      this.ads.set(adsList);
    }, (err) => {
      if (this.isAdmin()) {
        handleFirestoreError(err, OperationType.LIST, 'ads');
      }
    });
  }

  async addAd() {
    const ad = this.newAd();
    if (!ad.title || !ad.description || !ad.link) {
      this.error.set('Please fill all required fields.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      await addDoc(collection(db, 'ads'), {
        ...ad,
        createdAt: serverTimestamp()
      });
      this.newAd.set({
        title: '',
        description: '',
        link: '',
        adScript: '',
        active: true
      });
    } catch (e: any) {
      this.error.set('Failed to add ad: ' + e.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  async toggleAdStatus(ad: Ad) {
    if (!ad.id) return;
    try {
      await updateDoc(doc(db, 'ads', ad.id), {
        active: !ad.active
      });
    } catch (e: any) {
      this.error.set('Failed to update ad: ' + e.message);
    }
  }

  async deleteAd(adId: string) {
    if (!confirm('Are you sure you want to delete this ad?')) return;
    try {
      await deleteDoc(doc(db, 'ads', adId));
    } catch (e: any) {
      this.error.set('Failed to delete ad: ' + e.message);
    }
  }

  async resetUserStats(uid: string) {
    if (!confirm('Are you sure you want to reset usage count for this user?')) return;
    try {
      await updateDoc(doc(db, 'user_stats', uid), {
        usageCount: 0
      });
    } catch (e: any) {
      this.error.set('Failed to reset stats: ' + e.message);
    }
  }

  async deleteUserStats(uid: string) {
    if (!confirm('Are you sure you want to delete stats for this user?')) return;
    try {
      await deleteDoc(doc(db, 'user_stats', uid));
    } catch (e: any) {
      this.error.set('Failed to delete user stats: ' + e.message);
    }
  }

  loadUserStats() {
    if (this.statsUnsubscribe) this.statsUnsubscribe();
    const statsRef = collection(db, 'user_stats');
    const q = query(statsRef, orderBy('lastUsed', 'desc'));
    
    this.statsUnsubscribe = onSnapshot(q, (snapshot) => {
      const statsList = snapshot.docs.map(doc => ({
        ...doc.data()
      })) as UserStat[];
      this.userStats.set(statsList);
    }, (err) => {
      if (this.isAdmin()) {
        handleFirestoreError(err, OperationType.LIST, 'user_stats');
      }
    });
  }

  setView(v: 'ads' | 'users') {
    this.view.set(v);
  }
}
