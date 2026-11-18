import { chromium } from "@playwright/test";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
const server = await createServer({ root: process.cwd(), configFile: false, envFile: false, plugins: [react()], logLevel: "error", server: { host: "127.0.0.1", port: 0 } });
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const out = {};
for (const [w, theme] of [[1100, "light"], [360, "dark"]]) {
  const page = await browser.newPage({ viewport: { width: w, height: 1400 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${origin}/tests/fixtures/message-gallery.html?group=a2ui&theme=${theme}`);
  const form = page.locator('[data-message-id="a2ui-form"]');
  await form.getByText("Flaky test triage").waitFor({ timeout: 90000 });
  const q = async (id, sel) => page.locator(`[data-message-id="${id}"]`).locator(sel).count();
  out[w] = {
    formRadios: await q("a2ui-form", '[role="radio"]'),
    formTextbox: await q("a2ui-form", '[role="textbox"], textarea, input[type="text"]'),
    formCheckbox: await q("a2ui-form", '[role="checkbox"]'),
    formButtons: await form.getByRole("button", { name: "Apply" }).count(),
    humanControls: await q("a2ui-human", 'input, textarea, button[role], [role="radio"], [role="checkbox"]'),
    humanHasDSL: (await page.locator('[data-message-id="a2ui-human"]').innerText()).includes("ChoicePicker"),
    streamingPending: await q("a2ui-streaming", "[data-a2ui-pending]"),
    streamingDSL: (await page.locator('[data-message-id="a2ui-streaming"]').innerText()).includes("surface("),
    blocked: (await page.locator('[data-message-id="a2ui-blocked"]').innerText()).includes("blocked"),
    iframes: await page.locator("iframe").count(),
    overflow: await form.evaluate((e) => e.scrollWidth > e.clientWidth + 1),
    fieldBg: await form.locator("input.buzz-input").evaluate((e) => getComputedStyle(e).backgroundColor),
    cardBg: await form.locator("input.buzz-input").evaluate((e) => { let n = e.parentElement; while (n && getComputedStyle(n).backgroundColor === "rgba(0, 0, 0, 0)") n = n.parentElement; return n ? getComputedStyle(n).backgroundColor : null; }),
    errors,
  };
  await page.screenshot({ path: `${process.env.OUT_DIR ?? "."}/a2ui-gallery-${w}.png`, fullPage: true });
}
console.log(JSON.stringify(out, null, 1));
await browser.close(); await server.close();
