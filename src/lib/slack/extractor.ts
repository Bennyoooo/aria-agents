export interface ExtractedSkill {
  title: string;
  description: string;
  instructions: string;
  skill_type: 'prompt' | 'workflow' | 'tool' | 'context_pack';
  tags: string[];
  source_channel: string;
  source_message_ts: string;
  source_user: string;
  confidence: number;
}

export interface SlackMessage {
  text: string;
  user: string;
  ts: string;
  channel: string;
  thread_ts?: string;
}

const SKILL_PATTERNS = [
  { pattern: /(?:here'?s|try|use) (?:a |this |my )?prompt/i, type: 'prompt' as const, weight: 0.8 },
  { pattern: /(?:I|we) (?:use|created|built|made) (?:a |this )?(?:prompt|workflow|tool|script)/i, type: 'prompt' as const, weight: 0.7 },
  { pattern: /step\s*1.*step\s*2/is, type: 'workflow' as const, weight: 0.6 },
  { pattern: /```[\s\S]{100,}```/i, type: 'prompt' as const, weight: 0.5 },
  { pattern: /(?:works great|saved me|hours? (?:of|per)|game.?changer)/i, type: 'prompt' as const, weight: 0.4 },
  { pattern: /(?:mcp|tool|server|endpoint|api|install|npx|pip)/i, type: 'tool' as const, weight: 0.5 },
  { pattern: /(?:workflow|process|sop|checklist|runbook)/i, type: 'workflow' as const, weight: 0.5 },
];

export function scoreMessage(message: SlackMessage): { score: number; type: 'prompt' | 'workflow' | 'tool' | 'context_pack' } {
  let maxScore = 0;
  let bestType: 'prompt' | 'workflow' | 'tool' | 'context_pack' = 'prompt';

  for (const { pattern, type, weight } of SKILL_PATTERNS) {
    if (pattern.test(message.text)) {
      if (weight > maxScore) {
        maxScore = weight;
        bestType = type;
      }
    }
  }

  // Boost for code blocks (likely a prompt or tool)
  const codeBlockCount = (message.text.match(/```/g) || []).length / 2;
  if (codeBlockCount > 0) maxScore = Math.min(1, maxScore + 0.2);

  // Boost for longer messages (more likely to contain useful content)
  if (message.text.length > 500) maxScore = Math.min(1, maxScore + 0.1);
  if (message.text.length > 1000) maxScore = Math.min(1, maxScore + 0.1);

  // Boost for thread replies (discussion = validation)
  if (message.thread_ts && message.thread_ts !== message.ts) {
    maxScore = Math.min(1, maxScore + 0.1);
  }

  return { score: maxScore, type: bestType };
}

export function extractSkillFromMessage(message: SlackMessage): ExtractedSkill | null {
  const { score, type } = scoreMessage(message);

  if (score < 0.4) return null;

  // Extract code blocks as the instruction content
  const codeBlocks = message.text.match(/```([\s\S]*?)```/g);
  const instructions = codeBlocks
    ? codeBlocks.map(b => b.replace(/```/g, '').trim()).join('\n\n')
    : message.text;

  // Generate a title from the first line or first sentence
  const firstLine = message.text.split('\n')[0].replace(/```.*/, '').trim();
  const title = firstLine.length > 80
    ? firstLine.slice(0, 77) + '...'
    : firstLine || 'Untitled skill from Slack';

  // Clean up description
  const description = message.text
    .replace(/```[\s\S]*?```/g, '[code block]')
    .slice(0, 200)
    .trim();

  // Extract tags from common keywords
  const tagPatterns = [
    /\b(code.?review|review)\b/i,
    /\b(testing|test|qa)\b/i,
    /\b(deploy|deployment|ci.?cd)\b/i,
    /\b(debug|debugging)\b/i,
    /\b(prompt|prompting)\b/i,
    /\b(automation|automate)\b/i,
    /\b(documentation|docs)\b/i,
    /\b(onboarding)\b/i,
    /\b(security|auth)\b/i,
    /\b(performance|optimization)\b/i,
  ];

  const tags = tagPatterns
    .filter(p => p.test(message.text))
    .map(p => {
      const match = message.text.match(p);
      return match ? match[1].toLowerCase().replace(/\s+/g, '-') : '';
    })
    .filter(Boolean);

  return {
    title,
    description: description.length >= 50
      ? description
      : description + ' (extracted from Slack conversation by Aria)',
    instructions,
    skill_type: type,
    tags,
    source_channel: message.channel,
    source_message_ts: message.ts,
    source_user: message.user,
    confidence: score,
  };
}

export function extractSkillsFromMessages(messages: SlackMessage[]): ExtractedSkill[] {
  return messages
    .map(extractSkillFromMessage)
    .filter((s): s is ExtractedSkill => s !== null)
    .sort((a, b) => b.confidence - a.confidence);
}
