# Spike: Express compile in a browser/RN bundle (2026-11-03)

`@a2ui/agent@0.1.0` root + `@a2ui/web_core/catalog`, bundled with esbuild `--platform=browser --conditions=browser --external:fs --external:path`:
- `parseResponse` on `<a2ui>root = Column([Text("hi")])</a2ui>` → v1.0 `createSurface` JSONL. Runs with no DOM shims.
- No lit / custom elements in the bundle (the `/v1_0` lit path is not reached from this entry).
- Size: 1.45 MB raw / 305 KB gzip (antlr4ng + zod dominate). OK for desktop/web, heavy for mobile; Hermes (RN) untested.

Repro: `npm i @a2ui/agent@0.1.0 esbuild@0.25 && npx esbuild entry.mjs --bundle --platform=browser --format=esm --conditions=browser --external:fs --external:path --outfile=b.js && node --input-type=module < b.js`
