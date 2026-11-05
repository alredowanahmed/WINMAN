import { Injectable } from '@angular/core';
import { SentimentDataPoint } from '../sentiment-chart';

export interface ChatThreadScenario {
  id: string;
  title: string;
  platform: 'Tinder' | 'Bumble' | 'Hinge' | 'Instagram';
  platformIcon: string;
  subtitle: string;
  initialPositivity: number;
  finalPositivity: number;
  positivityShift: number; // e.g. +66%
  peakMomentumTurn: string;
  riskLevel: 'Very Low' | 'Low' | 'Moderate' | 'High';
  summaryInsight: string;
  dataPoints: SentimentDataPoint[];
}

@Injectable({
  providedIn: 'root'
})
export class SentimentService {
  readonly scenarios: ChatThreadScenario[] = [
    {
      id: 'tinder-hey-rescue',
      title: 'Tinder: The Dry "Hey" Inversion',
      platform: 'Tinder',
      platformIcon: '🔥',
      subtitle: 'From a cold, low-effort 28% opener to a locked cocktail date (94%)',
      initialPositivity: 28,
      finalPositivity: 94,
      positivityShift: 66,
      peakMomentumTurn: 'Turn 4',
      riskLevel: 'Very Low',
      summaryInsight: 'Playful frame teasing inverted her apathy into active laughing and banter, finishing with a smooth high-value date lock.',
      dataPoints: [
        {
          turn: 'Turn 1',
          label: 'Her Opener',
          sender: 'her',
          text: 'hey',
          positivity: 28,
          chemistryScore: 15,
          vibe: 'Dry / Cold',
          insight: 'Classic low-investment ping. Never match dry energy with paragraphs.'
        },
        {
          turn: 'Turn 2',
          label: 'Wingman Tease',
          sender: 'wingman',
          text: 'Is that your signature opener or did I just catch you completely speechless? 😉',
          positivity: 62,
          chemistryScore: 55,
          vibe: 'Playful',
          insight: 'Playfully flips the frame: now she has to qualify herself to you.'
        },
        {
          turn: 'Turn 3',
          label: 'Her Laugh & Defense',
          sender: 'her',
          text: 'Haha shut up 😂 I was distracted. But no, usually I am much more creative than that!',
          positivity: 78,
          chemistryScore: 72,
          vibe: 'Playful Banter',
          insight: 'Massive positivity spike (+16%). She invested 2 sentences, laughed, and justified herself.'
        },
        {
          turn: 'Turn 4',
          label: 'Wingman Escalate',
          sender: 'wingman',
          text: 'Alright, I will give you a fair second chance to redeem yourself over drinks this Thursday.',
          positivity: 88,
          chemistryScore: 84,
          vibe: 'Smooth',
          insight: 'Decisive escalation while chemistry is high. Low pressure with specific timing.'
        },
        {
          turn: 'Turn 5',
          label: 'Date Confirmed',
          sender: 'her',
          text: 'Deal! You picking the spot or should I? 🍸',
          positivity: 94,
          chemistryScore: 92,
          vibe: 'Chemistry Spike',
          insight: 'Date locked with high enthusiasm. Positivity peaked at 94%.'
        }
      ]
    },
    {
      id: 'bumble-trick-question',
      title: 'Bumble: Passing the Shit-Test',
      platform: 'Bumble',
      platformIcon: '🐝',
      subtitle: 'From skeptical questioning (42%) to irresistible charisma spike (91%)',
      initialPositivity: 42,
      finalPositivity: 91,
      positivityShift: 49,
      peakMomentumTurn: 'Turn 4',
      riskLevel: 'Very Low',
      summaryInsight: 'Subtle flattery combined with unwavering confidence dismantled her skepticism without being overly agreeable.',
      dataPoints: [
        {
          turn: 'Turn 1',
          label: 'Her Question',
          sender: 'her',
          text: 'What is a guy like you actually doing on Bumble? Be honest.',
          positivity: 42,
          chemistryScore: 35,
          vibe: 'Skeptical / Testing',
          insight: 'Testing your congruence and confidence. Traps: being defensive or self-deprecating.'
        },
        {
          turn: 'Turn 2',
          label: 'Wingman Rizz',
          sender: 'wingman',
          text: 'Looking for someone with great taste... Seems like I might have struck gold.',
          positivity: 74,
          chemistryScore: 68,
          vibe: 'Rizz',
          insight: 'Non-defensive, high-status compliment that reframes her test into mutual chemistry.'
        },
        {
          turn: 'Turn 3',
          label: 'Her Blush',
          sender: 'her',
          text: 'Very smooth answer! Do not let it go straight to your head though 😜',
          positivity: 82,
          chemistryScore: 79,
          vibe: 'Flirty',
          insight: 'Defenses dropped. Playful tease with tongue-out emoji signals attraction.'
        },
        {
          turn: 'Turn 4',
          label: 'Wingman Closer',
          sender: 'wingman',
          text: 'Too late, my ego is already scouting out a great rooftop spot for Saturday night.',
          positivity: 91,
          chemistryScore: 89,
          vibe: 'Confident',
          insight: 'Bold, humorous assumption of attraction locks in weekend momentum.'
        }
      ]
    },
    {
      id: 'hinge-food-banter',
      title: 'Hinge: Prompt Banter to Real Life',
      platform: 'Hinge',
      platformIcon: '🎯',
      subtitle: 'Turned a prompt debate into high chemistry date agreement (96%)',
      initialPositivity: 52,
      finalPositivity: 96,
      positivityShift: 44,
      peakMomentumTurn: 'Turn 4',
      riskLevel: 'Very Low',
      summaryInsight: 'Strong playful conviction over food preferences created fun tension that naturally called for an in-person taste test.',
      dataPoints: [
        {
          turn: 'Turn 1',
          label: 'Prompt Comment',
          sender: 'you',
          text: 'The secret to an authentic carbonara is strictly non-negotiable 🍝',
          positivity: 52,
          chemistryScore: 48,
          vibe: 'Casual',
          insight: 'Relatable, low-friction prompt opener.'
        },
        {
          turn: 'Turn 2',
          label: 'Her Reaction',
          sender: 'her',
          text: 'If you say you add heavy cream I am unmatching you right this second haha',
          positivity: 68,
          chemistryScore: 65,
          vibe: 'Playful Challenge',
          insight: 'High engagement banter. She wants you to prove your culinary standards.'
        },
        {
          turn: 'Turn 3',
          label: 'Wingman Rebuttal',
          sender: 'wingman',
          text: 'Heavy cream is a culinary crime. Pure Pecorino Romano and egg yolks only. I have standards.',
          positivity: 86,
          chemistryScore: 82,
          vibe: 'Confident',
          insight: 'Uncompromising culinary conviction creates an instant shared inside joke.'
        },
        {
          turn: 'Turn 4',
          label: 'Her Invitation',
          sender: 'her',
          text: 'Okay wow you actually passed! Now you have to cook it for me or take me to your favorite spot.',
          positivity: 96,
          chemistryScore: 95,
          vibe: 'Chemistry Spike',
          insight: 'Peak chemistry reached! She introduced the real-life date herself.'
        }
      ]
    }
  ];

  /**
   * Generates dynamic sentiment data points from raw text lines
   */
  analyzeCustomThread(lines: string[], currentVibe: string = 'Rizz'): ChatThreadScenario {
    const cleaned = lines.filter(l => l.trim().length > 0);
    if (cleaned.length === 0) {
      return this.scenarios[0];
    }

    const dataPoints: SentimentDataPoint[] = cleaned.map((line, idx) => {
      const isEven = idx % 2 === 0;
      const isLast = idx === cleaned.length - 1;
      const textLower = line.toLowerCase();

      // Heuristic sentiment scoring
      let score = 50;
      if (textLower.includes('😂') || textLower.includes('haha') || textLower.includes('lol') || textLower.includes('love') || textLower.includes('deal') || textLower.includes('drinks') || textLower.includes('cocktail')) {
        score += 30;
      }
      if (textLower.includes('smooth') || textLower.includes('cute') || textLower.includes('coffee') || textLower.includes('fun')) {
        score += 20;
      }
      if (textLower.includes('?') && line.length > 25) {
        score += 15;
      }
      if (line.length <= 4 && !textLower.includes('yes')) {
        score -= 25; // dry text penalty
      }
      if (textLower.includes('k') || textLower.includes('nm') || textLower.includes('idk')) {
        score -= 20;
      }

      // Progression boost: later turns with active wingman tend to climb
      const progressionBoost = Math.min(30, idx * 8);
      const finalScore = Math.max(15, Math.min(98, score + progressionBoost));

      const sender: 'her' | 'you' | 'wingman' = isLast ? 'wingman' : isEven ? 'her' : 'you';
      
      return {
        turn: `Turn ${idx + 1}`,
        label: isLast ? 'Wingman Reply' : isEven ? 'Her Text' : 'Your Text',
        sender,
        text: line,
        positivity: finalScore,
        chemistryScore: Math.min(98, finalScore + 4),
        vibe: isLast ? currentVibe : finalScore > 75 ? 'Playful Banter' : finalScore > 50 ? 'Casual' : 'Cold / Dry',
        insight: isLast 
          ? `Calibrated with ${currentVibe} vibe to accelerate conversational momentum and escalate toward a date.`
          : isEven 
          ? (finalScore < 45 ? 'Her message reflects low initial investment. Needs pattern interrupt.' : 'Her message shows warm receptivity and reciprocal energy.')
          : 'Conversation continuation keeping banter alive.'
      };
    });

    const initialPositivity = dataPoints[0]?.positivity || 50;
    const finalPositivity = dataPoints[dataPoints.length - 1]?.positivity || 75;
    const positivityShift = finalPositivity - initialPositivity;

    return {
      id: 'custom-thread',
      title: 'Current Chat Thread Analysis',
      platform: 'Tinder',
      platformIcon: '💬',
      subtitle: `Real-time sentiment progression across ${dataPoints.length} conversation turns`,
      initialPositivity,
      finalPositivity,
      positivityShift,
      peakMomentumTurn: `Turn ${dataPoints.length}`,
      riskLevel: finalPositivity > 75 ? 'Very Low' : finalPositivity > 50 ? 'Low' : 'Moderate',
      summaryInsight: positivityShift >= 0 
        ? `Conversational momentum has increased by +${positivityShift}% positivity since the opener.`
        : `Conversation needs a calibrated pattern interrupt to recover momentum.`,
      dataPoints
    };
  }
}
