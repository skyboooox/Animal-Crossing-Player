# Agent Boundaries

| Agent | Task | Allowed Tools | Allowed Paths | Network Scope | Write Scope | Escalation Required | Stop Conditions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `architect` | Plan, route, synthesize and update contracts. | `rg`, `git status`, read-only shell, `apply_patch` for docs | repo docs, tests for inspection | limited official sources | docs only during kickoff | public API, dependency, security, deploy, destructive ops | first implementable Sprint exists |
| `researcher` | Verify current browser/React/Web Audio performance guidance. | web search, `rg` docs | `docs/websearch/index.md`, docs | official/primary sources | `docs/websearch/index.md` only | downloads, non-official rules, license ambiguity | enough sources to decide |
| `implementer` | Implement one contracted Sprint. | shell, `apply_patch`, focused tests | files named in the Sprint contract | none unless Sprint says otherwise | owned files only | new dependency, behavior change outside contract | verification fails or ownership conflict |
| `fast-editor` | Low-risk local edits inside one file group. | shell, `apply_patch`, focused tests | explicitly assigned files | none | assigned files only | cross-module or public behavior change | diff exceeds assigned scope |
| `evaluator` | Run tests, browser checks and performance captures. | npm scripts, Playwright/browser, read-only shell | tests, generated ignored artifacts | local app only unless MQTT/weather test requires otherwise | test artifacts only | product fix needed, flaky gate unclear | pass/fail evidence is clear |
| `reviewer` | Review diff for regressions and missing tests. | `git diff`, `rg`, read-only shell | whole repo read-only | none | none | P0/P1 risk or destructive change | findings reported |

## Performance Sprint Ownership

- `S-004`: evaluator owns performance harness/tests; architect owns docs.
- `S-005`: implementer owns `HomePage.tsx`, `styles.css` and matching E2E assertions.
- `S-006`: implementer owns provider/context split files; evaluator owns React render evidence.
- `S-007`: implementer owns modal motion files; evaluator owns trace and visual parity checks.
- `S-008`: fast-editor or implementer owns cleanup only after reviewer confirms protected behavior.

## Shared Rules

- No agent may remove visual/audio effects to satisfy performance metrics.
- No agent may edit unrelated dirty files or roll back user changes.
- Large trace, coverage or report artifacts stay out of Git unless explicitly approved.
