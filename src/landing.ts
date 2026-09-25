import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

export interface FaqItem {
  id: string;
  category: 'general' | 'vibes' | 'features' | 'privacy' | 'tech';
  categoryLabel: string;
  question: string;
  answer: string;
  highlights?: string[];
}

@Component({
  selector: 'app-landing',
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing {
  private router = inject(Router);

  mobileMenuOpen = signal<boolean>(false);
  selectedCategory = signal<string>('all');
  searchQuery = signal<string>('');
  expandedFaqIds = signal<Record<string, boolean>>({
    'how-it-works-faq': true, // Open the first by default for immediate engagement
    'vibes-faq': false,
  });

  readonly categories = [
    { id: 'all', label: 'All Questions' },
    { id: 'general', label: 'General & Dating' },
    { id: 'vibes', label: 'Conversation Vibes' },
    { id: 'features', label: 'OCR & Features' },
    { id: 'privacy', label: 'Privacy & Security' },
    { id: 'tech', label: 'Pricing & API Key' },
  ];

  readonly faqList: FaqItem[] = [
    {
      id: 'how-it-works-faq',
      category: 'general',
      categoryLabel: 'General & Dating',
      question: 'How does Wingman Bro work as an AI wingman for Tinder and dating apps?',
      answer: 'Wingman Bro acts as your personal AI dating conversation assistant for Tinder, Bumble, Hinge, and Instagram DMs. You can either paste what she texted or upload a screenshot of your chat. Wingman Bro analyzes the conversational momentum, message pacing, tone, and context, then generates 3 distinct, high-impact reply options tailored to your selected vibe.',
      highlights: [
        'Works with text or direct screenshot uploads',
        'Generates 3 calibrated reply variations every time',
        'Optimized for natural banter without sounding generic or robotic'
      ]
    },
    {
      id: 'vibes-faq',
      category: 'vibes',
      categoryLabel: 'Conversation Vibes',
      question: 'What are the conversation vibes (Rizz, Magnetic, Smooth, Witty, etc.) and how do I choose?',
      answer: 'Wingman Bro provides 11 specialized conversation vibes so your replies match your personality and the stage of the conversation. Each vibe calibrates the AI\'s tension dynamics, humor, and response rhythm:',
      highlights: [
        '⚡ Rizz: Effortless charisma, unspoken magnetism, and playful confidence without trying too hard.',
        '🧲 Magnetic: Intriguing, tension-building mystery that pulls her attention right to you.',
        '🍸 Smooth: Velvet composure, poised charm, and natural transitions into date invites.',
        '💡 Witty: Razor-sharp comebacks, intellectual playfulness, and clever banter.',
        '😜 Playful: Lighthearted teasing that sparks fun back-and-forth momentum.',
        '🔥 Flirty: Subtle chemistry, attraction hints, and romantic tension.',
        '😎 Confident: High-value, bold presence with zero neediness or validation-seeking.',
        '🎯 Direct: Decisive, clear replies that cut through small talk to lock down plans.'
      ]
    },
    {
      id: 'difference-chatgpt-faq',
      category: 'general',
      categoryLabel: 'General & Dating',
      question: 'How is Wingman Bro different from ChatGPT, Claude, or generic AI chatbots?',
      answer: 'General chatbots tend to output long, formal paragraphs filled with academic vocabulary that scream "written by an AI." In dating apps, long or try-hard messages immediately kill attraction. Wingman Bro is tuned specifically for real-world dating psychology: short, punchy messages, natural casual capitalization, witty callbacks, and conversational tension that make matches actually want to reply.',
      highlights: [
        'No multi-paragraph essays or robotic bullet points',
        'Calibrated for natural texting cadence and modern slang',
        'Provides actionable reply options with copy-to-clipboard ease'
      ]
    },
    {
      id: 'ocr-screenshot-faq',
      category: 'features',
      categoryLabel: 'OCR & Features',
      question: 'Can I upload screenshots of my dating chats, and how does OCR vision analysis work?',
      answer: 'Yes! You can take a screenshot on your phone from Tinder, Bumble, Hinge, or Instagram and upload it directly into Wingman Bro, or use the built-in Camera capture button. Our computer vision OCR model scans the chat bubble layout, distinguishes between your messages and hers, reads timestamps, and extracts the full conversation context automatically.',
      highlights: [
        'Instant OCR extraction with zero manual typing required',
        'Reads chat bubbles, timestamps, and message lengths',
        'Works with light and dark mode screenshots from iOS and Android'
      ]
    },
    {
      id: 'privacy-faq',
      category: 'privacy',
      categoryLabel: 'Privacy & Security',
      question: 'Are my dating screenshots and private messages kept safe and confidential?',
      answer: 'Your privacy is 100% protected. Wingman Bro does not store your uploaded screenshots or chat messages on remote company databases or cloud servers. All conversation history is saved exclusively on your local device via browser IndexedDB. You can clear your entire history with one click at any time.',
      highlights: [
        'Local storage only via client-side IndexedDB',
        'Zero tracking, advertising surveillance, or message selling',
        'One-click "Clear All History" wipe feature'
      ]
    },
    {
      id: 'free-pricing-faq',
      category: 'tech',
      categoryLabel: 'Pricing & API Key',
      question: 'Is Wingman Bro completely free to use?',
      answer: 'Yes, Wingman Bro is free to use. There are no surprise paywalls, forced subscription traps, or credit card requirements. You can start generating witty dating replies right now on any device.',
      highlights: [
        '100% free web app access with no hidden paywalls',
        'Works on desktop, tablet, iPhone, and Android',
        'No account creation or mandatory signup required to test'
      ]
    },
    {
      id: 'gemini-key-faq',
      category: 'tech',
      categoryLabel: 'Pricing & API Key',
      question: 'Can I use my own Google AI Studio Gemini API key for unlimited speed?',
      answer: 'Yes! Power users can configure their personal Google Gemini API key by clicking "Settings" in the tool header. When set, your private key is saved exclusively in your browser\'s local storage and used directly for lightning-fast, high-quota response generation.',
      highlights: [
        'Optional Google AI Studio API key integration',
        'Key stays in your browser\'s local storage—never shared',
        'Get a free Gemini API key at aistudio.google.com'
      ]
    },
    {
      id: 'multilingual-faq',
      category: 'general',
      categoryLabel: 'General & Dating',
      question: 'Does Wingman Bro understand multilingual chats, Banglish, and regional slang?',
      answer: 'Yes! Wingman Bro has deep cultural calibration. It effortlessly understands English, Banglish, Bengali, Hindi, Urdu, Spanish, and French, as well as modern social media slang (e.g., "no cap", "delulu", "ghosting", "dry texter"). It crafts replies that feel culturally authentic without sounding forced or translated.',
      highlights: [
        'Native comprehension of Banglish and multilingual text styles',
        'Culturally attuned to international and diaspora dating dynamics',
        'Accurately parses mixed-language banter and modern acronyms'
      ]
    },
    {
      id: 'pwa-install-faq',
      category: 'features',
      categoryLabel: 'OCR & Features',
      question: 'Can I install Wingman Bro as an app on my phone for quick access?',
      answer: 'Yes! Wingman Bro is a fully progressive web application (PWA). You can install it on your home screen in seconds for a full-screen, native-app experience without downloading large files from the App Store.',
      highlights: [
        'iOS (Safari): Tap Share → "Add to Home Screen"',
        'Android (Chrome): Tap Menu (three dots) → "Install app"',
        'Instant launch with camera access and offline history viewing'
      ]
    },
    {
      id: 'roadmap-faq',
      category: 'features',
      categoryLabel: 'OCR & Features',
      question: 'What is the Dating Roadmap feature in Wingman Bro?',
      answer: 'The Dating Roadmap is a built-in milestone tracker designed to help you stay proactive in your dating life. You can set and manage personal dating goals—such as refreshing your Tinder profile pictures, initiating 3 new conversations, asking a match out for coffee, or planning a weekend date—with target completion dates.',
      highlights: [
        'Track goals from first match to in-person dates',
        'Set target dates and check off achievements',
        'Saved locally on your device for complete discretion'
      ]
    }
  ];

  filteredFaqs = computed(() => {
    const cat = this.selectedCategory();
    const query = this.searchQuery().toLowerCase().trim();

    return this.faqList.filter(item => {
      const matchesCategory = cat === 'all' || item.category === cat;
      const matchesQuery = !query || 
        item.question.toLowerCase().includes(query) || 
        item.answer.toLowerCase().includes(query) ||
        (item.highlights && item.highlights.some(h => h.toLowerCase().includes(query)));
      return matchesCategory && matchesQuery;
    });
  });

  // Schema.org FAQPage JSON-LD representation
  faqJsonLd = computed(() => {
    const mainEntity = this.faqList.map(item => ({
      '@type': 'Question',
      'name': item.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': item.answer + (item.highlights ? ' Highlights: ' + item.highlights.join('; ') : '')
      }
    }));

    return JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': mainEntity
    });
  });

  toggleFaq(id: string): void {
    this.expandedFaqIds.update(current => ({
      ...current,
      [id]: !current[id]
    }));
  }

  isFaqExpanded(id: string): boolean {
    return !!this.expandedFaqIds()[id];
  }

  expandAll(): void {
    const updated: Record<string, boolean> = {};
    for (const faq of this.faqList) {
      updated[faq.id] = true;
    }
    this.expandedFaqIds.set(updated);
  }

  collapseAll(): void {
    this.expandedFaqIds.set({});
  }

  setCategory(catId: string): void {
    this.selectedCategory.set(catId);
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value || '');
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  navigateToTool(): void {
    this.closeMobileMenu();
    this.router.navigate(['/tool']);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  scrollToSection(sectionId: string): void {
    this.closeMobileMenu();
    if (typeof window !== 'undefined') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }
}
