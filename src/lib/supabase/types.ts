export type SkillType = 'prompt' | 'workflow' | 'tool' | 'context_pack';
export type FeedbackOutcome = 'success' | 'failure' | 'partial';
export type FeedbackSource = 'agent' | 'web';
export type CopySource = 'web' | 'mcp';
export type DataSensitivity = 'public' | 'internal' | 'confidential';

export interface Organization {
  id: string;
  name: string;
  domain: string;
  api_key: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  organization_id: string | null;
  function_team: string | null;
  contributor_role: string | null;
  created_at: string;
}

export interface Skill {
  id: string;
  organization_id: string;
  owner_id: string;
  title: string;
  description: string;
  skill_type: SkillType;
  instructions: string;
  agent_compatibility: string[];
  function_team: string;
  tags: string[] | null;
  data_sensitivity: DataSensitivity;
  is_hidden: boolean;
  tips: string | null;
  created_at: string;
  updated_at: string;
  // joined fields
  owner?: Profile;
  feedback_count?: number;
  avg_rating?: number | null;
  use_count?: number;
  success_rate?: number | null;
}

export interface Feedback {
  id: string;
  skill_id: string;
  user_id: string | null;
  source: FeedbackSource;
  outcome: FeedbackOutcome;
  rating: number | null;
  notes: string | null;
  agent_name: string | null;
  created_at: string;
  // joined fields
  skill?: Skill;
  user?: Profile;
}

export interface CopyEvent {
  id: string;
  skill_id: string;
  user_id: string | null;
  source: CopySource;
  created_at: string;
}

export interface SkillWithStats extends Skill {
  feedback_count: number;
  avg_rating: number | null;
  use_count: number;
  success_rate: number | null;
}
