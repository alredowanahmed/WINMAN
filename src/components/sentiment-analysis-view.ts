import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  ElementRef,
  viewChild,
  effect,
  OnDestroy,
  input,
  output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SentimentService, ChatThreadScenario } from '../services/sentiment.service';
import { mountSentimentChart, unmountSentimentChart, SentimentDataPoint } from '../sentiment-chart';

@Component({
  selector: 'app-sentiment-analysis-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
      
      <!-- Header Bar -->
      <div class="p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-orange-600/20 text-orange-400 border border-orange-500/30 text-sm">
              📊
            </span>
            <h2 class="text-base sm:text-lg font-bold text-white font-display tracking-tight">
              Response Sentiment Analysis
            </h2>
            <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-medium">
              Live Recharts
            </span>
          </div>
          <p class="text-xs text-zinc-400 mt-1">
            Visualizing conversation positivity shifts over time across dating chat turns.
          </p>
        </div>

        @if (canClose()) {
          <button
            (click)="close.emit()"
            class="self-end sm:self-center p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer text-xs flex items-center gap-1"
            aria-label="Close Sentiment View">
            <span>✕</span>
            <span class="text-[11px]">Close</span>
          </button>
        }
      </div>

      <div class="p-4 sm:p-6 space-y-6">

        <!-- Thread Scenario Switcher -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Select Chat Thread
            </span>
            <span class="text-[11px] text-zinc-500">
              {{ currentScenario().subtitle }}
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            @for (sc of scenarios; track sc.id) {
              <button
                (click)="selectScenario(sc.id)"
                class="p-2.5 rounded-xl text-left transition-all cursor-pointer border text-xs"
                [class.bg-orange-950/40]="selectedScenarioId() === sc.id"
                [class.border-orange-500/60]="selectedScenarioId() === sc.id"
                [class.shadow-md]="selectedScenarioId() === sc.id"
                [class.shadow-orange-900/20]="selectedScenarioId() === sc.id"
                [class.bg-zinc-900/60]="selectedScenarioId() !== sc.id"
                [class.border-zinc-800]="selectedScenarioId() !== sc.id"
                [class.hover:border-zinc-700]="selectedScenarioId() !== sc.id">
                <div class="flex items-center justify-between font-semibold text-zinc-200">
                  <span class="truncate">{{ sc.title }}</span>
                  <span class="text-[11px] font-mono text-emerald-400 font-bold shrink-0 ml-1">
                    +{{ sc.positivityShift }}%
                  </span>
                </div>
                <div class="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
                  <span>{{ sc.platformIcon }} {{ sc.platform }}</span>
                  <span>•</span>
                  <span>{{ sc.dataPoints.length }} Turns</span>
                </div>
              </button>
            }
          </div>
        </div>

        <!-- Metric KPI Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          
          <!-- Overall Positivity -->
          <div class="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-3">
            <span class="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Peak Positivity
            </span>
            <div class="flex items-baseline gap-1.5 mt-1">
              <span class="text-xl sm:text-2xl font-black font-display text-white">
                {{ currentScenario().finalPositivity }}%
              </span>
              <span class="text-[10px] text-emerald-400 font-semibold">
                Spike ✨
              </span>
            </div>
            <span class="text-[10px] text-zinc-500 mt-0.5 block truncate">
              High Chemistry Zone
            </span>
          </div>

          <!-- Positivity Shift -->
          <div class="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-3">
            <span class="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Positivity Shift
            </span>
            <div class="flex items-baseline gap-1.5 mt-1">
              <span class="text-xl sm:text-2xl font-black font-display text-emerald-400">
                +{{ currentScenario().positivityShift }}%
              </span>
              <span class="text-xs">📈</span>
            </div>
            <span class="text-[10px] text-zinc-500 mt-0.5 block truncate">
              From {{ currentScenario().initialPositivity }}% opener
            </span>
          </div>

          <!-- Peak Momentum Turn -->
          <div class="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-3">
            <span class="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Peak Turn
            </span>
            <div class="flex items-baseline gap-1.5 mt-1">
              <span class="text-xl sm:text-2xl font-black font-display text-orange-400">
                {{ currentScenario().peakMomentumTurn }}
              </span>
            </div>
            <span class="text-[10px] text-zinc-500 mt-0.5 block truncate">
              Optimal Date Escalation
            </span>
          </div>

          <!-- Ghosting Risk -->
          <div class="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-3">
            <span class="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Ghosting Risk
            </span>
            <div class="flex items-baseline gap-1.5 mt-1">
              <span class="text-xl sm:text-2xl font-black font-display text-emerald-400">
                {{ currentScenario().riskLevel }}
              </span>
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <span class="text-[10px] text-zinc-500 mt-0.5 block truncate">
              Mutual Investment High
            </span>
          </div>

        </div>

        <!-- Recharts Visualization Canvas Area -->
        <div class="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 sm:p-5 relative">
          
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-white uppercase tracking-wider">
                  Conversation Positivity Trend
                </span>
                <span class="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 text-[10px] font-mono">
                  Area: 0% → 100%
                </span>
              </div>
              <p class="text-[11px] text-zinc-400 mt-0.5">
                Hover or tap data points to inspect turn psychological takeaways and message text.
              </p>
            </div>

            <!-- Legend Pills -->
            <div class="flex items-center gap-3 text-[10px] font-medium text-zinc-400">
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-pink-500"></span>
                <span>Her</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>You</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-orange-500"></span>
                <span>Wingman Boost</span>
              </div>
            </div>
          </div>

          <!-- Recharts Target Container -->
          <div 
            #chartContainer 
            class="w-full min-h-[260px] h-[260px] relative transition-opacity duration-300">
          </div>

          <!-- Baseline Indicator Footer -->
          <div class="mt-3 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between text-[11px] text-zinc-400 gap-2">
            <div class="flex items-center gap-2">
              <span class="inline-block w-2.5 h-0.5 bg-zinc-600 border border-zinc-500 border-dashed"></span>
              <span>Dotted gray: Neutral baseline (50%)</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="inline-block w-2.5 h-0.5 bg-emerald-500 border border-emerald-400 border-dashed"></span>
              <span class="text-emerald-400">Green dotted: High Chemistry Zone (75%+)</span>
            </div>
          </div>

        </div>

        <!-- Psychological Summary Note -->
        <div class="p-3.5 rounded-xl bg-orange-950/20 border border-orange-500/20 flex items-start gap-2.5 text-xs text-zinc-300">
          <span class="text-base shrink-0">🧠</span>
          <div class="leading-relaxed">
            <strong class="text-orange-400 font-semibold">Strategic Insight:</strong>
            {{ currentScenario().summaryInsight }}
          </div>
        </div>

        <!-- Turn-by-Turn Message Stream -->
        <div>
          <div class="flex items-center justify-between mb-3 px-1">
            <span class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Turn-by-Turn Positivity Feed
            </span>
            <span class="text-[11px] text-zinc-500">
              Chronological conversation flow
            </span>
          </div>

          <div class="space-y-2.5">
            @for (point of currentScenario().dataPoints; track point.turn) {
              <div 
                class="p-3 rounded-xl border transition-all text-xs flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                [class.bg-zinc-900]="point.sender !== 'wingman'"
                [class.bg-orange-950/20]="point.sender === 'wingman'"
                [class.border-zinc-800]="point.sender !== 'wingman'"
                [class.border-orange-500/40]="point.sender === 'wingman'">
                
                <div class="flex-1 space-y-1.5">
                  <div class="flex items-center gap-2">
                    <span 
                      class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                      [class.bg-pink-500/20]="point.sender === 'her'"
                      [class.text-pink-300]="point.sender === 'her'"
                      [class.bg-emerald-500/20]="point.sender === 'you'"
                      [class.text-emerald-300]="point.sender === 'you'"
                      [class.bg-orange-500/20]="point.sender === 'wingman'"
                      [class.text-orange-300]="point.sender === 'wingman'">
                      {{ point.sender === 'her' ? 'Her' : point.sender === 'wingman' ? '⚡ Wingman Boost' : 'You' }}
                    </span>
                    <span class="text-zinc-500 font-mono text-[10px]">{{ point.turn }}</span>
                    <span class="text-zinc-400 font-medium text-[11px]">• {{ point.label }}</span>
                  </div>

                  <p class="text-zinc-200 font-medium text-xs leading-relaxed bg-black/20 p-2 rounded-lg border border-white/5">
                    "{{ point.text }}"
                  </p>

                  <p class="text-[11px] text-zinc-400 leading-snug">
                    <span class="text-zinc-500 font-semibold">Takeaway:</span> {{ point.insight }}
                  </p>
                </div>

                <!-- Positivity Score Badge & Bar -->
                <div class="sm:w-32 shrink-0 flex flex-col items-start sm:items-end justify-center pt-1 sm:pt-0">
                  <div class="flex items-baseline gap-1">
                    <span class="text-[10px] text-zinc-500 font-mono">Positivity</span>
                    <span 
                      class="font-mono font-bold text-sm"
                      [class.text-emerald-400]="point.positivity >= 75"
                      [class.text-amber-400]="point.positivity >= 50 && point.positivity < 75"
                      [class.text-rose-400]="point.positivity < 50">
                      {{ point.positivity }}%
                    </span>
                  </div>
                  
                  <!-- Mini Progress Bar -->
                  <div class="w-full bg-zinc-800 rounded-full h-1.5 mt-1 overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all duration-500"
                      [style.width.%]="point.positivity"
                      [class.bg-emerald-500]="point.positivity >= 75"
                      [class.bg-amber-500]="point.positivity >= 50 && point.positivity < 75"
                      [class.bg-rose-500]="point.positivity < 50">
                    </div>
                  </div>

                  <span class="text-[10px] text-orange-400 font-semibold mt-1">
                    {{ point.vibe }}
                  </span>
                </div>

              </div>
            }
          </div>
        </div>

      </div>

      <!-- Footer Bar with Quick Action -->
      <div class="p-4 bg-zinc-900/80 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <span class="text-zinc-400">
          Ready to turn cold chat threads into real-life dates?
        </span>
        <button
          (click)="applyToMainChat.emit(currentScenario().id)"
          class="w-full sm:w-auto px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold shadow-lg shadow-orange-600/30 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5">
          <span>⚡ Try This Calibrated Strategy</span>
        </button>
      </div>

    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SentimentAnalysisView implements OnDestroy {
  private sentimentService = inject(SentimentService);

  // Inputs
  canClose = input<boolean>(true);
  customLines = input<string[] | null>(null);
  activeVibe = input<string>('Rizz');

  // Outputs
  close = output<void>();
  applyToMainChat = output<string>();

  // State
  scenarios = this.sentimentService.scenarios;
  selectedScenarioId = signal<string>(this.scenarios[0].id);

  chartContainer = viewChild<ElementRef<HTMLDivElement>>('chartContainer');

  currentScenario = computed(() => {
    const custom = this.customLines();
    if (custom && custom.length > 0 && this.selectedScenarioId() === 'custom-thread') {
      return this.sentimentService.analyzeCustomThread(custom, this.activeVibe());
    }
    return this.scenarios.find(s => s.id === this.selectedScenarioId()) || this.scenarios[0];
  });

  constructor() {
    // Whenever scenario or container changes, mount/update the Recharts chart
    effect(() => {
      const containerRef = this.chartContainer();
      const scenario = this.currentScenario();
      const vibe = this.activeVibe();

      if (containerRef?.nativeElement && scenario?.dataPoints) {
        // Slight RAF to ensure DOM has rendered layout
        requestAnimationFrame(() => {
          mountSentimentChart(containerRef.nativeElement, scenario.dataPoints, vibe);
        });
      }
    });
  }

  selectScenario(id: string) {
    this.selectedScenarioId.set(id);
  }

  ngOnDestroy() {
    const containerRef = this.chartContainer();
    if (containerRef?.nativeElement) {
      unmountSentimentChart(containerRef.nativeElement);
    }
  }
}
