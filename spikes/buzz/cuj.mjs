// Buzz slice-1 CUJ: message gallery (host fixture, real plugin renderer, stub relay).
// Run from the buzz-app root (copy in, never commit there):
//   OUT_DIR=/path node cuj.mjs
// Journey: agent reply form → pick Quarantine → type note → tick Tell #release →
// Apply → "Sent to the agent" + inert lock with values kept; person's copy,
// streaming and off-catalog rows stay non-live.
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
const OUT = process.env.OUT_DIR ?? ".";
const server = await createServer({ root: process.cwd(), configFile: false, envFile: false, plugins: [react()], logLevel: "error", server: { host: "127.0.0.1", port: 0 } });
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const out = {};
for (const [w, theme] of [[1100, "light"], [412, "dark"]]) {
  const page = await browser.newPage({ viewport: { width: w, height: w > 500 ? 900 : 915 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${origin}/tests/fixtures/message-gallery.html?group=a2ui&theme=${theme}`);
  const form = page.locator('[data-message-id="a2ui-form"]');
  await form.getByText("Flaky test triage").waitFor({ timeout: 120000 });
  if (w < 500) {
    const narrow = page.getByRole("button", { name: "Narrow preview" });
    if (await narrow.count()) await narrow.click();
  }
  let n = 0;
  const shot = async (label) => {
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/f-${w}-${String(n++).padStart(2, "0")}-${label}.png` });
  };
  await form.scrollIntoViewIfNeeded();
  await shot("form");
  await form.getByRole("radio", { name: "Quarantine" }).click();
  await shot("pick");
  const note = form.getByRole("textbox", { name: "Note for the team" });
  await note.fill("Quarantining until #415 lands");
  await shot("note");
  await form.getByRole("checkbox", { name: "Tell #release" }).click();
  await shot("tick");
  await form.getByRole("button", { name: "Apply" }).click();
  await form.getByText("Sent to the agent").waitFor({ timeout: 10000 });
  await form.getByText("Sent to the agent").evaluate((e) => e.scrollIntoView({ block: "end" }));
  await shot("sent");
  const r = {
    sent: await form.getByText("Sent to the agent").count(),
    inert: await form.locator("[inert]").count(),
    quarantineChecked: await form.getByRole("radio", { name: "Quarantine" }).isChecked(),
    noteKept: await note.inputValue(),
    tickKept: await form.getByRole("checkbox", { name: "Tell #release" }).isChecked(),
    overflow: await form.evaluate((e) => e.scrollWidth > e.clientWidth + 1),
  };
  for (const id of ["a2ui-human", "a2ui-streaming", "a2ui-blocked"]) {
    const row = page.locator(`[data-message-id="${id}"]`);
    await row.scrollIntoViewIfNeeded();
    await shot(id);
  }
  r.humanControls = await page.locator('[data-message-id="a2ui-human"]').locator('input, textarea, [role="radio"], [role="checkbox"]').count();
  r.streamingDSL = (await page.locator('[data-message-id="a2ui-streaming"]').innerText()).includes("surface(");
  r.blocked = /blocked/i.test(await page.locator('[data-message-id="a2ui-blocked"]').innerText());
  r.iframes = await page.locator("iframe").count();
  r.pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  r.errors = errors;
  out[w] = r;
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
await server.close();
