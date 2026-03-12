---
description: Mandatory project documentation workflow for every completed task
applyTo: "**"
---

Documentation must be updated after every completed work item.

Rules:
1. Every task completion must include a new entry in doc/WORK_LOG.md.
2. Each entry must include:
	 - Date and time with timezone.
	 - Short task title.
	 - What was done.
	 - Files changed.
	 - Verification or test status.
	 - Next actions (if any).
3. Entries must be appended in reverse chronological order (newest first).
4. Do not close a task without updating documentation.
5. Keep entries precise and factual. Avoid vague notes.

Entry format to use:

## [YYYY-MM-DD HH:MM:SS +/-TZ] Task Title
- Summary: ...
- Work done:
	- ...
- Files changed:
	- path/to/file
- Verification:
	- ...
- Next:
	- ...

If no code changes are required and only analysis is performed, still add an entry with "Files changed: none" and include a timestamp.
