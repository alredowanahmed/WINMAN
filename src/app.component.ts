
import { Component, ChangeDetectionStrategy, signal, inject, ElementRef, viewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService, ApiResponse } from './services/gemini.service';
import { HistoryService, HistoryItem } from './services/history.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private geminiService = inject(GeminiService);
  private historyService = inject(HistoryService);

  userInput = signal('');
  uploadedImage = signal<{ file: File | null; previewUrl: string | null }>({ file: null, previewUrl: null });
  isLoading = signal(false);
  isExtractingText = signal(false);
  error = signal<string | null>(null);
  responses = signal<ApiResponse | null>(null);
  
  copiedState = signal<{[key: number]: boolean}>({});

  isCameraOpen = signal(false);
  videoElement = viewChild<ElementRef<HTMLVideoElement>>('videoElement');
  private stream: MediaStream | null = null;

  showHistory = signal(false);
  historyItems = signal<HistoryItem[]>([]);

  ngOnInit() {
    this.loadHistory();
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

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.processFile(input.files[0]);
    }
  }

  private processFile(file: File): void {
    // Reset state for new input
    this.userInput.set('');
    this.error.set(null);
    this.responses.set(null);
    this.copiedState.set({});

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const previewUrl = e.target.result as string;
      this.uploadedImage.set({ file, previewUrl });

      // Start text extraction
      this.isExtractingText.set(true);
      
      // Extract base64 part from previewUrl
      const base64Data = previewUrl.split(',')[1];
      
      this.geminiService.getTextFromImage(base64Data, file.type)
        .then(extractedText => {
          this.userInput.set(extractedText);
        })
        .catch(e => {
          this.error.set(e.message || 'Failed to extract text from image.');
          this.uploadedImage.set({ file: null, previewUrl: null }); // Clear preview on error
          const fileInput = document.getElementById('file-upload') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        })
        .finally(() => {
          this.isExtractingText.set(false);
        });
    };
    reader.readAsDataURL(file);
  }

  async openCamera(): Promise<void> {
    this.clearInput();
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      this.isCameraOpen.set(true);
      // Let Angular render the video element, then set the srcObject
      setTimeout(() => {
        const video = this.videoElement()?.nativeElement;
        if (video) {
          video.srcObject = this.stream;
        } else {
          this.closeCamera();
          this.error.set('Could not initialize camera view. Please try again.');
        }
      }, 0);
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      this.error.set(err.message || 'Could not access the camera. Please check permissions.');
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
      this.error.set('Could not process image.');
      this.closeCamera();
      return;
    }
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture-${Date.now()}.png`, { type: 'image/png' });
        this.processFile(file);
      } else {
        this.error.set('Failed to capture image.');
      }
    }, 'image/png');

    this.closeCamera();
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
      const file = this.uploadedImage().file;
      let base64Data: string | null = null;
      let mimeType: string | null = null;
      
      if (file && this.uploadedImage().previewUrl) {
          base64Data = this.uploadedImage().previewUrl!.split(',')[1];
          mimeType = file.type;
      }

      const result = await this.geminiService.generateReplies(
        this.userInput(),
        base64Data,
        mimeType,
        this.historyItems()
      );
      this.responses.set(result);
      
      // Save to history
      try {
        await this.historyService.saveHistory({
          timestamp: Date.now(),
          userInput: this.userInput(),
          imagePreviewUrl: this.uploadedImage().previewUrl,
          responses: result
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
    this.uploadedImage.set({ file: null, previewUrl: null });
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = '';
    }
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
}
