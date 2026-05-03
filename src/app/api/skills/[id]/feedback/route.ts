import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/supabase/api";
import { createClient } from "@supabase/supabase-js";
import { classifySentiment, findMatchingGroup, type FeedbackGroup } from "@/lib/feedback-grouping";

const AUTO_REVISION_THRESHOLD = 3;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const org = await authenticateApiKey(request);
  if (!org) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const body = await request.json();
  const { outcome, rating, notes, agent_name } = body as {
    outcome: "success" | "failure" | "partial";
    rating?: number;
    notes?: string;
    agent_name?: string;
  };

  if (!["success", "failure", "partial"].includes(outcome)) {
    return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
  }
  if (rating !== undefined && (rating < 1 || rating > 5)) {
    return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: skill } = await supabase
    .from("skills")
    .select("id, star_count, total_feedback_count")
    .eq("id", id)
    .eq("organization_id", org.id)
    .single();

  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  const sentiment = classifySentiment(outcome, rating ?? null, notes ?? null);

  // Positive feedback: just increment counters, don't store individually
  if (sentiment === 'positive' && (!notes || notes.length < 20)) {
    await supabase.from("skills").update({
      star_count: (skill.star_count || 0) + 1,
      total_feedback_count: (skill.total_feedback_count || 0) + 1,
    }).eq("id", id);

    return NextResponse.json({ logged: true, action: "counted" });
  }

  // Non-positive or detailed feedback: store and group
  await supabase.from("feedback").insert({
    skill_id: id,
    user_id: null,
    source: "agent",
    outcome,
    rating: rating || null,
    notes: notes || null,
    agent_name: agent_name || null,
  });

  await supabase.from("skills").update({
    total_feedback_count: (skill.total_feedback_count || 0) + 1,
  }).eq("id", id);

  // Group the feedback
  let revisionTriggered = false;

  if (notes && notes.length >= 10) {
    const { data: existingGroups } = await supabase
      .from("feedback_groups")
      .select("*")
      .eq("skill_id", id);

    const groups = (existingGroups || []) as FeedbackGroup[];
    const matchingGroup = findMatchingGroup(notes, groups);

    if (matchingGroup) {
      const newCount = matchingGroup.count + 1;
      const samples = matchingGroup.sample_notes.length < 5
        ? [...matchingGroup.sample_notes, notes]
        : matchingGroup.sample_notes;

      await supabase.from("feedback_groups").update({
        count: newCount,
        sample_notes: samples,
        updated_at: new Date().toISOString(),
      }).eq("id", matchingGroup.id);

      // Check threshold for auto-revision
      if (
        newCount >= AUTO_REVISION_THRESHOLD &&
        !matchingGroup.auto_revision_triggered &&
        (matchingGroup.sentiment === 'negative' || matchingGroup.sentiment === 'revision')
      ) {
        await supabase.from("feedback_groups").update({
          auto_revision_triggered: true,
        }).eq("id", matchingGroup.id);

        // Trigger auto-revision
        await triggerAutoRevision(supabase, id, matchingGroup.summary, samples);
        revisionTriggered = true;
      }
    } else {
      // Create new group
      await supabase.from("feedback_groups").insert({
        skill_id: id,
        summary: notes.slice(0, 200),
        sentiment,
        count: 1,
        sample_notes: [notes],
      });
    }
  }

  return NextResponse.json({
    logged: true,
    action: revisionTriggered ? "revision_triggered" : "grouped",
    sentiment,
  });
}

async function triggerAutoRevision(
  supabase: ReturnType<typeof createClient>,
  skillId: string,
  feedbackSummary: string,
  sampleNotes: string[]
) {
  // Get the current skill
  const { data: skill } = await supabase
    .from("skills")
    .select("*")
    .eq("id", skillId)
    .single();

  if (!skill) return;

  // Build the revision prompt
  const feedbackContext = sampleNotes
    .map((note, i) => `${i + 1}. ${note}`)
    .join("\n");

  const revisionPrompt = `You are revising an AI skill based on user feedback.

CURRENT SKILL:
Title: ${skill.title}
Type: ${skill.skill_type}
Instructions:
${skill.instructions}

FEEDBACK (${sampleNotes.length} similar reports):
Summary: ${feedbackSummary}
Individual notes:
${feedbackContext}

Rewrite the instructions to address the feedback. Keep the same structure and format. Only change what the feedback identifies as broken, missing, or needing improvement. Do not add unnecessary content.

Return ONLY the revised instructions text, nothing else.`;

  // Store the revision request — an LLM call would happen here
  // For now, store it as a skill_candidate for review with the prompt
  await supabase.from("skill_candidates").insert({
    organization_id: skill.organization_id,
    source: "agent",
    source_text: revisionPrompt,
    suggested_type: skill.skill_type,
    suggested_title: `[Auto-revision] ${skill.title}`,
    confidence: 0.9,
    status: "pending",
  });

  // Log the auto-revision event
  console.log(`Auto-revision triggered for skill ${skillId}: ${feedbackSummary}`);
}
