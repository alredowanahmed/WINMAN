
import { Component, ChangeDetectionStrategy, signal, inject, ElementRef, viewChild, OnInit, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { GeminiService, ApiResponse } from './services/gemini.service';
import { HistoryService, HistoryItem } from './services/history.service';
import { AdminComponent } from './admin.component';
import { AdScriptComponent } from './app/components/ad-script.component';
import { db, auth, loginWithGoogle, logout, handleFirestoreError, OperationType } from './firebase';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminComponent, MatIconModule, AdScriptComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, OnDestroy {
  private geminiService = inject(GeminiService);
  private historyService = inject(HistoryService);

  userInput = signal('');
  isLoading = signal(false);
  error = signal<string | null>(null);
  responses = signal<ApiResponse | null>(null);
  
  uploadedImage = signal<{file: File | null, previewUrl: string | null}>({file: null, previewUrl: null});
  isExtractingText = signal(false);
  isCameraOpen = signal(false);
  videoElement = viewChild<ElementRef<HTMLVideoElement>>('videoElement');
  private stream: MediaStream | null = null;
  
  copiedState = signal<{[key: number]: boolean}>({});

  showHistory = signal(false);
  showSettings = signal(false);
  isAdminView = signal(false);
  historyItems = signal<HistoryItem[]>([]);
  hasApiKey = signal<boolean>(true);
  manualApiKey = signal<string>('');
  
  ads = signal<any[]>([]);
  user = signal<any>(null);
  showScrollTop = signal(false);

  private adsUnsubscribe: (() => void) | null = null;
  private authUnsubscribe: (() => void) | null = null;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.showScrollTop.set(window.scrollY > 500);
  }

  async ngOnInit() {
    this.loadHistory();
    this.checkApiKey();
    this.loadManualKey();
    this.initAuth();
    this.fetchAds();
  }

  ngOnDestroy() {
    if (this.adsUnsubscribe) this.adsUnsubscribe();
    if (this.authUnsubscribe) this.authUnsubscribe();
  }

  initAuth() {
    this.authUnsubscribe = auth.onAuthStateChanged(user => {
      this.user.set(user);
      if (user) {
        this.updateUserStats(user.uid);
      }
    });
  }

  async updateUserStats(uid: string) {
    const statsRef = doc(db, 'user_stats', uid);
    try {
      const snap = await getDoc(statsRef);
      if (snap.exists()) {
        await updateDoc(statsRef, {
          usageCount: increment(1),
          lastUsed: serverTimestamp()
        });
      } else {
        await setDoc(statsRef, {
          uid,
          usageCount: 1,
          lastUsed: serverTimestamp()
        });
      }
    } catch (e) {
      console.error('Failed to update user stats', e);
    }
  }

  fetchAds() {
    if (this.adsUnsubscribe) this.adsUnsubscribe();
    const adsRef = collection(db, 'ads');
    const q = query(adsRef, where('active', '==', true));
    
    this.adsUnsubscribe = onSnapshot(q, (snapshot) => {
      const adsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      this.ads.set(adsList);
    }, (err) => {
      console.error('Failed to fetch ads', err);
    });
  }

  toggleAdminView() {
    this.isAdminView.update(v => !v);
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
      this.isAdminView.set(false);
    } catch (e: any) {
      this.error.set('Logout failed: ' + e.message);
    }
  }

  loadManualKey() {
    const key = localStorage.getItem('MANUAL_API_KEY');
    if (key) {
      this.manualApiKey.set(key);
    }
  }

  async checkApiKey() {
    const manualKey = localStorage.getItem('MANUAL_API_KEY');
    if (manualKey) {
      this.hasApiKey.set(true);
      return;
    }

    const win = window as any;
    if (win.aistudio && typeof win.aistudio.hasSelectedApiKey === 'function') {
      const hasKey = await win.aistudio.hasSelectedApiKey();
      this.hasApiKey.set(hasKey);
    }
  }

  toggleSettings() {
    this.showSettings.update(v => !v);
  }

  saveManualKey() {
    const key = this.manualApiKey().trim();
    if (key) {
      localStorage.setItem('MANUAL_API_KEY', key);
      this.hasApiKey.set(true);
      this.geminiService.reinitialize();
      this.showSettings.set(false);
    } else {
      localStorage.removeItem('MANUAL_API_KEY');
      this.checkApiKey();
      this.geminiService.reinitialize();
      this.showSettings.set(false);
    }
  }

  async openKeySelector() {
    const win = window as any;
    if (win.aistudio && typeof win.aistudio.openSelectKey === 'function') {
      await win.aistudio.openSelectKey();
      this.hasApiKey.set(true);
      this.geminiService.reinitialize();
    } else {
      this.toggleSettings();
    }
  }

  async loadHistory() {
    try {
      const items = await this.historyService.getHistory();
      this.historyItems.set(items);
    } catch (e) {
      console.error('Failed to load history', e);
    }
  }

  toggleHistory() {
    this.showHistory.set(!this.showHistory());
    if (this.showHistory()) {
      this.loadHistory();
    }
  }

  async clearHistory() {
    if (confirm('Are you sure you want to clear all history?')) {
      await this.historyService.clearHistory();
      this.historyItems.set([]);
    }
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  private async processFile(file: File): Promise<void> {
    const reader = new FileReader();
    reader.onload = async (e: any) => {
      this.uploadedImage.set({
        file,
        previewUrl: e.target.result
      });

      // Automatically extract text from screenshot
      this.isExtractingText.set(true);
      try {
        const base64Data = e.target.result.split(',')[1];
        const extractedText = await this.geminiService.getTextFromImage(base64Data, file.type);
        if (extractedText) {
          this.userInput.set(extractedText);
        }
      } catch (err) {
        console.error('OCR failed:', err);
      } finally {
        this.isExtractingText.set(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async openCamera() {
    this.isCameraOpen.set(true);
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      const video = this.videoElement()?.nativeElement;
      if (video) {
        video.srcObject = this.stream;
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      this.error.set('Camera access denied. Please check permissions.');
      this.isCameraOpen.set(false);
    }
  }

  closeCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    this.isCameraOpen.set(false);
  }

  captureImage() {
    const video = this.videoElement()?.nativeElement;
    if (video) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
          this.processFile(file);
          this.closeCamera();
        }
      }, 'image/jpeg');
    }
  }

  async getHelp(): Promise<void> {
    if (!this.userInput() && !this.uploadedImage().file) {
      this.error.set("Please enter her message or upload a screenshot.");
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.responses.set(null);
    this.copiedState.set({});

    try {
      let base64Data: string | undefined;
      let mimeType: string | undefined;

      if (this.uploadedImage().file && this.uploadedImage().previewUrl) {
        base64Data = this.uploadedImage().previewUrl!.split(',')[1];
        mimeType = this.uploadedImage().file!.type;
      }

      const result = await this.geminiService.generateReplies(
        this.userInput(),
        this.historyItems(),
        base64Data,
        mimeType
      );
      this.responses.set(result);
      
      // Save to history
      try {
        await this.historyService.saveHistory({
          timestamp: Date.now(),
          userInput: this.userInput(),
          responses: result,
          imagePreviewUrl: this.uploadedImage().previewUrl || undefined
        });
        this.loadHistory(); // Refresh history list
      } catch (e) {
        console.error('Failed to save history', e);
      }
      
    } catch (e: any) {
      this.error.set(e.message || 'An unknown error occurred.');
    } finally {
      this.isLoading.set(false);
    }
  }

  clearInput(): void {
    this.userInput.set('');
    this.uploadedImage.set({file: null, previewUrl: null});
    this.responses.set(null);
    this.error.set(null);
    this.copiedState.set({});
  }
  
  copyToClipboard(text: string, index: number): void {
    navigator.clipboard.writeText(text).then(() => {
        this.copiedState.update(state => ({...state, [index]: true}));
        setTimeout(() => {
            this.copiedState.update(state => ({...state, [index]: false}));
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
  }

  shareAdvice(text: string) {
    if (navigator.share) {
      navigator.share({
        title: 'Desi Wingman Advice',
        text: `Check out this dating advice from Desi Wingman: "${text}"`,
        url: window.location.href
      }).catch(err => console.error('Error sharing:', err));
    } else {
      this.copyToClipboard(text, 9999);
    }
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
