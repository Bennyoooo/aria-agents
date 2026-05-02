export interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  threadId: string;
  labels: string[];
}

export interface ExtractedCandidate {
  title: string;
  description: string;
  source_text: string;
  suggested_type: 'skill' | 'mcp' | 'agent' | 'plugin';
  confidence: number;
  tags: string[];
  source_email_id: string;
  source_subject: string;
  source_from: string;
}

const SKILL_SIGNALS = [
  { pattern: /(?:here'?s|try|use) (?:a |this |my )?(?:prompt|template|workflow|script|tool|checklist)/i, weight: 0.8, type: 'skill' as const },
  { pattern: /(?:step\s*1|first,?\s*(?:you|we))[\s\S]{50,}(?:step\s*2|then|next)/is, weight: 0.7, type: 'skill' as const },
  { pattern: /(?:I|we) (?:use|created|built|wrote|developed) (?:a |this )?(?:script|tool|automation|workflow|process)/i, weight: 0.7, type: 'skill' as const },
  { pattern: /(?:how to|guide|tutorial|instructions for|steps to)/i, weight: 0.6, type: 'skill' as const },
  { pattern: /(?:best practice|standard process|sop|runbook)/i, weight: 0.6, type: 'skill' as const },
  { pattern: /(?:tip|trick|hack|shortcut|pro tip)/i, weight: 0.5, type: 'skill' as const },
  { pattern: /```[\s\S]{80,}```/i, weight: 0.5, type: 'skill' as const },
  { pattern: /(?:mcp|plugin|extension|integration|connector|api endpoint)/i, weight: 0.5, type: 'mcp' as const },
  { pattern: /(?:install|npm|pip|brew|npx|curl)\s+\S+/i, weight: 0.4, type: 'mcp' as const },
];

const SKIP_PATTERNS = [
  /^(re:|fwd:|fw:)\s/i,
  /unsubscribe/i,
  /out of office/i,
  /calendar invitation/i,
  /invitation:\s/i,
  /(?:automated|auto-generated|do not reply)/i,
  /newsletter/i,
];

export function shouldSkipEmail(email: EmailMessage): boolean {
  if (SKIP_PATTERNS.some(p => p.test(email.subject) || p.test(email.body.slice(0, 200)))) {
    return true;
  }
  if (email.body.length < 100) return true;
  if (email.labels.some(l => ['SPAM', 'TRASH', 'CATEGORY_PROMOTIONS', 'CATEGORY_SOCIAL'].includes(l))) {
    return true;
  }
  return false;
}

export function scoreEmail(email: EmailMessage): { score: number; type: 'skill' | 'mcp' | 'agent' | 'plugin' } {
  if (shouldSkipEmail(email)) return { score: 0, type: 'skill' };

  let maxScore = 0;
  let bestType: 'skill' | 'mcp' | 'agent' | 'plugin' = 'skill';
  const text = `${email.subject}\n${email.body}`;

  for (const { pattern, weight, type } of SKILL_SIGNALS) {
    if (pattern.test(text)) {
      if (weight > maxScore) {
        maxScore = weight;
        bestType = type;
      }
    }
  }

  if (text.length > 1000) maxScore = Math.min(1, maxScore + 0.1);
  const codeBlocks = (text.match(/```/g) || []).length / 2;
  if (codeBlocks > 0) maxScore = Math.min(1, maxScore + 0.15);

  return { score: maxScore, type: bestType };
}

export function extractFromEmail(email: EmailMessage): ExtractedCandidate | null {
  const { score, type } = scoreEmail(email);
  if (score < 0.4) return null;

  const codeBlocks = email.body.match(/```([\s\S]*?)```/g);
  const mainContent = codeBlocks
    ? codeBlocks.map(b => b.replace(/```/g, '').trim()).join('\n\n')
    : email.body;

  const title = email.subject
    .replace(/^(re:|fwd:|fw:)\s*/gi, '')
    .trim()
    .slice(0, 80) || 'Untitled from email';

  const description = email.body
    .replace(/```[\s\S]*?```/g, '[code]')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);

  const tagPatterns = [
    /\b(code.?review)\b/i, /\b(testing|test)\b/i, /\b(deploy)/i,
    /\b(debug)/i, /\b(prompt)/i, /\b(automation)\b/i,
    /\b(documentation|docs)\b/i, /\b(onboarding)\b/i,
    /\b(security)\b/i, /\b(performance)\b/i, /\b(workflow)\b/i,
  ];

  const tags = tagPatterns
    .filter(p => p.test(email.body))
    .map(p => email.body.match(p)?.[1]?.toLowerCase().replace(/\s+/g, '-') || '')
    .filter(Boolean);

  return {
    title,
    description: description.length >= 50
      ? description
      : `${description} (extracted from email by Aria)`.padEnd(50, ' '),
    source_text: mainContent,
    suggested_type: type,
    confidence: score,
    tags: [...tags, 'from-email'],
    source_email_id: email.id,
    source_subject: email.subject,
    source_from: email.from,
  };
}

export function extractFromEmails(emails: EmailMessage[]): ExtractedCandidate[] {
  return emails
    .map(extractFromEmail)
    .filter((c): c is ExtractedCandidate => c !== null)
    .sort((a, b) => b.confidence - a.confidence);
}
