import { Component, ChangeDetectionStrategy, signal, computed, inject, ElementRef, viewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { GeminiService, ApiResponse } from './services/gemini.service';
import { HistoryService } from './services/history.service';

@Component({
  selector: 'app-tool',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tool.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tool implements OnInit {
  private geminiService = inject(GeminiService);
  private historyService = inject(HistoryService);
  private router = inject(Router);

  // Core Generator State
  userInput = signal('');
  selectedVibe = signal<string>('Playful');
  uploadedImage = signal<{ file: File | null; previewUrl: string | null }>({ file: null, previewUrl: null });
  isLoading = signal(false);
  isExtractingText = signal(false);
  error = signal<string | null>(null);
  responses = signal<ApiResponse | null>(null);
  copiedState = signal<{ [key: number]: boolean }>({});
  currentHistoryId = signal<number | null>(null);

  // Subtle Insight Feedback State
  feedbackState = signal<'unanswered' | 'answered_helpful' | 'answered_unhelpful' | 'submitted'>('unanswered');
  selectedReason = signal<string | null>(null);
  readonly helpfulReasons: string[] = [
    'Pure rizz',
    'Spot on vibe',
    'Matched her energy',
    'Copied & sent directly',
    'Witty & punchy'
  ];
  readonly unhelpfulReasons: string[] = [
    'A bit too cheesy',
    'Too formal',
    'Missed conversation context',
    'Wanted shorter reply',
    'Needs more rizz'
  ];

  // Vibe Guide Definitions
  hoveredVibe = signal<string | null>(null);

  readonly vibesList: {
    id: string;
    label: string;
    icon: string;
    tagline: string;
    description: string;
    example: string;
  }[] = [
    {
      id: 'Rizz',
      label: 'Rizz',
      icon: '⚡',
      tagline: 'Effortless Charisma',
      description: 'Maximum unspoken magnetism and effortless charisma. Smooth, confident, and irresistible without trying too hard.',
      example: '"Are you always this captivating, or did you turn it up just for me?"'
    },
    {
      id: 'Playful',
      label: 'Playful',
      icon: '😜',
      tagline: 'Lighthearted & Teasing',
      description: 'Fun teasing and banter that sparks back-and-forth tension without being overly serious.',
      example: '"Careful, you\'re one text away from making me like you."'
    },
    {
      id: 'Funny',
      label: 'Funny',
      icon: '😂',
      tagline: 'Humorous & Clever',
      description: 'Sharp observational humor and witty punchlines designed to make her genuinely laugh.',
      example: '"I was going to play hard to get, but my schedule opened up."'
    },
    {
      id: 'Flirty',
      label: 'Flirty',
      icon: '🔥',
      tagline: 'Cheeky & Magnetic',
      description: 'Subtle chemistry, double entendres, and hints of attraction that turn up the heat.',
      example: '"You look like trouble... exactly my kind of trouble."'
    },
    {
      id: 'Confident',
      label: 'Confident',
      icon: '😎',
      tagline: 'Bold & Self-Assured',
      description: 'High-value, self-assured presence with zero neediness or seeking of validation.',
      example: '"I like your confidence. Let\'s see if you can back it up in person."'
    },
    {
      id: 'Casual',
      label: 'Casual',
      icon: '☕',
      tagline: 'Relaxed & Low-Pressure',
      description: 'Breezy and effortless, like chatting with a close friend—zero anxiety or pressure.',
      example: '"Haha fair point. How did the rest of your day turn out?"'
    },
    {
      id: 'Charming',
      label: 'Charming',
      icon: '✨',
      tagline: 'Warm & Magnetic',
      description: 'Smooth charisma, polite intrigue, and genuine warmth that makes her feel seen.',
      example: '"You definitely have good taste. Tell me more about that."'
    },
    {
      id: 'Direct',
      label: 'Direct',
      icon: '🎯',
      tagline: 'Decisive & Action-Oriented',
      description: 'Cuts through small talk to lock down plans or set up a real-world date.',
      example: '"Enough texting. Drinks this Thursday at 8?"'
    }
  ];

  activeVibeInfo = computed(() => {
    const current = this.hoveredVibe() || this.selectedVibe();
    return this.vibesList.find(v => v.id === current) || this.vibesList[0];
  });

  readonly availableVibes: string[] = [
    'Rizz',
    'Playful',
    'Funny',
    'Flirty',
    'Confident',
    'Casual',
    'Charming',
    'Direct'
  ];

  // Camera & Media
  isCameraOpen = signal(false);
  videoElement = viewChild<ElementRef<HTMLVideoElement>>('videoElement');
  private stream: MediaStream | null = null;

  // Settings
  showSettings = signal(false);
  manualApiKey = signal<string>('');
  hasApiKey = signal<boolean>(true);

  async ngOnInit() {
    this.checkApiKey();
    this.loadManualKey();
  }

  selectVibe(vibe: string): void {
    this.selectedVibe.set(vibe);
  }

  // Generation Logic
  async getHelp(): Promise<void> {
    const text = this.userInput().trim();
    const hasImage = !!this.uploadedImage().file;

    if (!text && !hasImage) {
      this.error.set('Please paste her message or attach a chat screenshot.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.copiedState.set({});
    this.feedbackState.set('unanswered');
    this.selectedReason.set(null);
    this.currentHistoryId.set(null);

    // Scroll immediately to skeleton loading section for instant visual feedback
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const skeletonEl = document.getElementById('skeleton-section');
        if (skeletonEl) {
          skeletonEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }

    try {
      const file = this.uploadedImage().file;
      let base64Data: string | null = null;
      let mimeType: string | null = null;

      if (file && this.uploadedImage().previewUrl) {
        base64Data = this.uploadedImage().previewUrl!.split(',')[1];
        mimeType = file.type;
      }

      const result = await this.geminiService.generateReplies(
        text,
        base64Data,
        mimeType,
        [],
        this.selectedVibe(),
        'reply'
      );
      this.responses.set(result);

      // Save to background history
      try {
        const id = await this.historyService.saveHistory({
          timestamp: Date.now(),
          userInput: text || (hasImage ? '[Screenshot Upload]' : ''),
          imagePreviewUrl: this.uploadedImage().previewUrl,
          responses: result
        });
        this.currentHistoryId.set(id);
      } catch (e) {
        console.error('History save skipped', e);
      }

      // Smooth scroll to replies on mobile
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          const el = document.getElementById('results-section');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    } catch (e: any) {
      this.error.set(e.message || 'Wingman Bro is momentarily busy. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  clearInput(): void {
    this.userInput.set('');
    this.uploadedImage.set({ file: null, previewUrl: null });
    const fileInput = document.getElementById('screenshot-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    this.responses.set(null);
    this.error.set(null);
    this.copiedState.set({});
    this.feedbackState.set('unanswered');
    this.selectedReason.set(null);
  }

  copyToClipboard(text: string, index: number): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copiedState.update(state => ({ ...state, [index]: true }));
      setTimeout(() => {
        this.copiedState.update(state => ({ ...state, [index]: false }));
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  }

  onFeedbackChoice(type: 'helpful' | 'not-helpful'): void {
    this.feedbackState.set(type === 'helpful' ? 'answered_helpful' : 'answered_unhelpful');
    this.saveFeedbackToStore(type);
  }

  selectInsightReason(reason: string): void {
    this.selectedReason.set(reason);
    const type = this.feedbackState() === 'answered_helpful' ? 'helpful' : 'not-helpful';
    this.saveFeedbackToStore(type, reason);
    this.feedbackState.set('submitted');
  }

  private async saveFeedbackToStore(type: 'helpful' | 'not-helpful', reason?: string): Promise<void> {
    const id = this.currentHistoryId();
    if (id !== null) {
      try {
        await this.historyService.updateHistoryItem(id, {
          feedback: type,
          ...(reason ? { feedbackReason: reason } : {})
        });
      } catch (e) {
        console.error('Feedback save skipped', e);
      }
    }

    try {
      if (typeof window !== 'undefined') {
        const insights = JSON.parse(localStorage.getItem('WINGMAN_USER_INSIGHTS') || '[]');
        insights.push({
          timestamp: Date.now(),
          vibe: this.selectedVibe(),
          type,
          reason: reason || null
        });
        localStorage.setItem('WINGMAN_USER_INSIGHTS', JSON.stringify(insights.slice(-50)));
      }
    } catch {
      // Non-blocking
    }
  }

  // File Upload & OCR
  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.processFile(input.files[0]);
    }
  }

  private processFile(file: File): void {
    this.error.set(null);
    this.responses.set(null);
    this.copiedState.set({});

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const previewUrl = e.target.result as string;
      this.uploadedImage.set({ file, previewUrl });

      this.isExtractingText.set(true);
      const base64Data = previewUrl.split(',')[1];

      this.geminiService.getTextFromImage(base64Data, file.type)
        .then(extractedText => {
          this.userInput.set(extractedText);
        })
        .catch(e => {
          this.error.set(e.message || 'Could not extract text from screenshot.');
        })
        .finally(() => {
          this.isExtractingText.set(false);
        });
    };
    reader.readAsDataURL(file);
  }

  // Camera Management
  async openCamera(): Promise<void> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      this.isCameraOpen.set(true);
      setTimeout(() => {
        const video = this.videoElement()?.nativeElement;
        if (video) {
          video.srcObject = this.stream;
        } else {
          this.closeCamera();
          this.error.set('Could not initialize camera preview.');
        }
      }, 50);
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      this.error.set(err.message || 'Camera permission denied or unavailable.');
      this.isCameraOpen.set(false);
    }
  }

  closeCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    this.isCameraOpen.set(false);
    this.stream = null;
  }

  captureImage(): void {
    const video = this.videoElement()?.nativeElement;
    if (!video || video.paused || video.ended || !video.videoWidth) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      this.error.set('Could not process camera image.');
      this.closeCamera();
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' });
        this.processFile(file);
      } else {
        this.error.set('Failed to capture frame.');
      }
    }, 'image/png');

    this.closeCamera();
  }

  // Settings & API Key
  loadManualKey() {
    if (typeof window === 'undefined') return;
    const key = localStorage.getItem('MANUAL_API_KEY');
    if (key && (key.includes('AIzaSyBzjMh8vmIGvlfAKd06813FWNPuAfej8YY') || key === 'MY_GEMINI_API_KEY')) {
      localStorage.removeItem('MANUAL_API_KEY');
      this.manualApiKey.set('');
    } else if (key) {
      this.manualApiKey.set(key);
    }
  }

  async checkApiKey() {
    if (typeof window === 'undefined') return;
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
}
