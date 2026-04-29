# TODOS

## Post-Phase 1, Pre-Experiment

### Admin/Analytics Dashboard
**What:** Add an admin page showing submission counts, reaction counts by type, cross-team reuse events, top assets by reactions, and contributor breakdown by function_team.
**Why:** The design partner sponsor will ask "what did we learn?" after the 48-hour experiment. Raw SQL queries are not a demo. A simple dashboard page makes the post-experiment debrief professional and data-driven.
**Effort:** human: ~1 day / CC: ~2 hours
**Depends on:** Phase 1 data model and at least a few seed assets for testing.
**Context:** The dashboard should show the same metrics as the Experiment Measurement table in the design doc: submission count, cross-team reuse count, non-developer contributor count, multi-LLM asset count, and copy event count. Consider making this a protected route accessible only to the founder's email.

## Phase 2 (after experiment validation)

### Asset Versioning
**What:** Track edit history on assets so users can see what changed.
**Why:** The outside voice flagged: "When someone edits a prompt, the old version disappears. Anyone who copied the old version has no way to diff." Deferred because the 48-hour experiment doesn't need version history, but a real product does.

### Notification System
**What:** Notify users (via email or in-app) when new assets are submitted in their org.
**Why:** Passive discovery (open app, browse) won't sustain contribution beyond the first week. Active notification creates a feedback loop that keeps people returning.

### Multiple-Domain Organizations
**What:** Allow companies with multiple email domains (acme.com, acme.co.uk) to share one org.
**Why:** Many companies have subsidiary or acquired-company domains. Currently, each domain creates a separate org with no merge mechanism.

### Asset Tags/Categories
**What:** Add user-defined tags or a category taxonomy beyond asset_type and function_team.
**Why:** At 50+ assets, the current filtering (type, LLM, team) won't be sufficient for discovery. Tags enable cross-functional browsing.
