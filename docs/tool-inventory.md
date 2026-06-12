# Tool Inventory

| Tool | Purpose | When To Use | Required Inputs | Safe Outputs | Token Risk | Permission Risk | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `git status --short` | Dirty-tree guard. | Before edits and final report. | repo cwd | concise changed-file list | low | low | compare before/after scope |
| `rg` | Fast code/docs search. | Locate contracts, effects, imports, timers. | pattern and path | matching lines | medium | low | rerun with narrower path |
| `git diff --check` | Markdown/code whitespace check. | After docs or code edits. | touched files | no output on pass | low | low | command exit 0 |
| `npm run test` | Unit regression. | Any code/test behavior change. | installed deps | Vitest result | medium | low | exit 0 |
| `npm run lint` | Static quality. | Before code handoff. | installed deps | ESLint result | medium | low | exit 0 |
| `npm run build` | Typecheck and production build. | Before code handoff. | installed deps | build result | medium | low | exit 0 |
| `npm run test:e2e` | Browser behavior regression. | UI, motion, onboarding, settings, MQTT-facing changes. | built app, Playwright browsers | pass/fail and traces on retry | high | medium | exit 0 |
| Playwright/CDP performance metrics | Repeatable browser performance evidence. | `S-004..S-007`. | scenario URL and viewport | metric summary, optional trace path | high | low | compare same profile before/after |
| React `<Profiler>` | Render-cost evidence. | Provider/context split. | profiled tree and callback | render count/duration summary | medium | low | compare same interaction before/after |
| Chrome DevTools Rendering | Manual paint/composite diagnosis. | When automated trace is inconclusive. | local app URL | screenshots/notes only | medium | low | confirm with repeatable test if possible |
| Docker Compose MQTT | Local MQTT smoke. | Remote-control validation. | `docker-compose.mqtt.yml` | broker up/down | low | medium | MQTT E2E or manual publish/subscribe |

## Maintenance Rules

- Prefer repeatable command output over manual screenshots for pass/fail gates.
- Keep generated traces and reports ignored unless the user requests checked-in evidence.
- Do not let tool output become a new product rule without a contract update.
