export interface FeedbackGroup {
  id: string;
  skill_id: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'revision';
  count: number;
  sample_notes: string[];
  auto_revision_triggered: boolean;
  created_at: string;
  updated_at: string;
}

export function normalizeFeedbackNote(note: string): string {
  return note
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifySentiment(outcome: string, rating: number | null, notes: string | null): 'positive' | 'negative' | 'revision' {
  if (outcome === 'failure') return 'negative';
  if (outcome === 'partial') return 'revision';
  if (rating !== null && rating <= 2) return 'negative';
  if (rating !== null && rating <= 3) return 'revision';

  const revisionSignals = [
    /should|could|would|missing|lacks|doesn'?t|didn'?t|fails? to|broken|wrong|incorrect|outdated|update|fix|improve|add|needs?/i,
    /but |however |except |unfortunately/i,
    /doesn'?t work|didn'?t work|not working|stopped working/i,
  ];

  if (notes && revisionSignals.some(p => p.test(notes))) {
    return 'revision';
  }

  return 'positive';
}

export function computeSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeFeedbackNote(a).split(' '));
  const wordsB = new Set(normalizeFeedbackNote(b).split(' '));
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

export function findMatchingGroup(
  note: string,
  groups: FeedbackGroup[],
  threshold: number = 0.4
): FeedbackGroup | null {
  let bestMatch: FeedbackGroup | null = null;
  let bestScore = 0;

  for (const group of groups) {
    for (const sample of group.sample_notes) {
      const score = computeSimilarity(note, sample);
      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = group;
      }
    }
  }

  return bestMatch;
}
