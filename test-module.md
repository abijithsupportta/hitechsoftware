Write and run Vitest tests for the module described.
Use existing test patterns from web/tests/.
Run via terminal. Fix all failures.
Report pass/fail count only.
```

---

**The Complete File Structure You Now Have:**
```
HitechSoftware/
├── .windsurfrules          ← NEW — Windsurf reads this
├── .windsurfignore         ← NEW — What to skip
├── .cursorrules            ← Keep — if ever switching back
├── .cursorignore           ← Keep
├── AGENTS.md               ← Same for both
├── .windsurf/
│   └── prompts/            ← NEW — Reusable prompts
│       ├── new-module.md
│       ├── fix-bug.md
│       └── test-module.md
├── web/
├── supabase/
└── doc/