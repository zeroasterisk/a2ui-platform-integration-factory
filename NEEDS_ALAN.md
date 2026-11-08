# Needs Alan

1. **Targets discussion (not urgent).** We need to agree on the backlog fit criteria and the candidate list (README §4). We also need a decision on Vercel json-render and Thesys OpenUI: track them or leave them out. The cron should not promote any backlog target without your go-ahead.

2. **Upstream A2UI fix for zod 4 (blocks Paseo).** `web_core` reference-map/ref-fields read `_def.typeName`, so zod 4 hosts fail `parseResponse` (46/72 vs 68/72). Proof: `spikes/zod4-rn/README.md`. Proposed fix: open an issue + PR on a2ui-project/a2ui that switches `web_core` to `import ... from 'zod/v3'` (works on zod 3.25 and 4). Related: #3812/#3825. OK to file? Until then the cron does t3code (unaffected) and the Paseo mock.
