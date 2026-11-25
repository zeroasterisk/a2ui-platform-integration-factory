// Checks a host's rendered reply against visual.json. Browser only (real layout + theme tokens).
// No imports: the host's own browser test runner loads this file and the fixture, and passes an
// adapter built on the host's real block component and theme switch.
// adapter = {
//   block(source): Promise<Element>     // one closed block via the host's real block component,
//                                       // with a working send (so Apply locks); resolves once settled
//   viewport(width, height): Promise    // resize the page
//   textScale(factor): Promise          // root font size, e.g. html { font-size: 150% }; 1 resets
//   theme("light" | "dark"): Promise    // the host's own color-mode switch
//   press(el, name), fill(el, value)    // optional: real user events; default DOM click/input
//   cleanup?(): Promise                 // unmount between cases
//   attrs?: { surface, locked }         // defaults data-a2ui-surface / data-a2ui-locked
// }
export async function checkVisual(fx, a) {
  const pass = [], fail = [], skip = [], notes = {};
  const at = { surface: "[data-a2ui-surface]", locked: "[data-a2ui-locked]", ...(a.attrs ?? {}) };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const painted = (e) => { let n = e.parentElement; while (n && /rgba\(0, 0, 0, 0\)|transparent/.test(getComputedStyle(n).backgroundColor)) n = n.parentElement; return n; };
  const field = (el) => el.querySelector("input:not([type=checkbox]):not([type=radio]), textarea");
  // A field stands off its card by its own fill, or (transparent fill) by a visible border that
  // differs from the card. Hosts on shadcn/Base UI use the border; Buzz uses the fill.
  const colors = (el) => {
    const f = field(el); if (!f) throw new Error("no text field");
    // Base UI wraps the input in a styled control; use the nearest box that draws a border or fill.
    let box = f; for (let n = f, i = 0; n && i < 3; n = n.parentElement, i++) { const s = getComputedStyle(n); if (parseFloat(s.borderTopWidth) > 0 || !/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor)) { box = n; break; } }
    const s = getComputedStyle(box), c = painted(box);
    return { field: s.backgroundColor, border: parseFloat(s.borderTopWidth) > 0 ? s.borderTopColor : null, card: c ? getComputedStyle(c).backgroundColor : null };
  };
  const standsOff = (k) => !/rgba\(0, 0, 0, 0\)|transparent/.test(k.field) ? k.field !== k.card : !!k.border && !/rgba\(0, 0, 0, 0\)|transparent/.test(k.border) && k.border !== k.card;
  const press = a.press ?? (async (el, name) => { const b = [...el.querySelectorAll("button")].find((x) => x.textContent?.trim() === name); if (!b) throw new Error(`no button ${name}`); b.click(); });
  const fill = a.fill ?? (async (f, v) => { const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(f), "value").set; set.call(f, v); f.dispatchEvent(new Event("input", { bubbles: true })); });
  for (const c of fx.cases) {
    try {
      if (c.viewport) await a.viewport(...c.viewport);
      if (c.textScale) await a.textScale(c.textScale);
      if (c.theme) await a.theme(c.theme);
      const el = await a.block(c.source);
      if (!el.querySelector(at.surface)) throw new Error("no surface drawn");
      const ex = c.expect;
      if (ex.fits) {
        const w = window.innerWidth;
        const out = [...el.querySelectorAll(fx.controls)].map((n) => [n, n.getBoundingClientRect()])
          .filter(([, r]) => r.width > 0 && (r.left < -0.5 || r.right > w + 0.5));
        if (out.length) throw new Error(`${out.length} control(s) outside 0..${w}: ${out.map(([n, r]) => `${n.tagName}[${Math.round(r.left)}..${Math.round(r.right)}]`).join(" ")}`);
        const s = el.querySelector(at.surface);
        const over = [s, ...s.querySelectorAll("*")].filter((n) => getComputedStyle(n).overflowX === "visible" && n.scrollWidth > n.clientWidth + 1 && n.clientWidth > 0);
        // Report the innermost overflowing boxes: that is where the content refuses to wrap.
        const leaf = over.filter((n) => !over.some((m) => m !== n && n.contains(m)));
        const side = document.documentElement.scrollWidth > w + 1 ? ` (page scrolls sideways ${document.documentElement.scrollWidth}>${w})` : "";
        if (over.length) throw new Error(`overflowing${side}: ${leaf.slice(0, 3).map((n) => `${n.tagName}.${String(n.className).slice(0, 40)} "${(n.textContent ?? "").slice(0, 24)}" ${n.scrollWidth}>${n.clientWidth}`).join(" | ")}`);
        if (side) throw new Error(side.trim());
      }
      if (ex.fieldOffCard) { const k = colors(el); notes[c.id] = k; if (!standsOff(k)) throw new Error(`field does not stand off card: ${JSON.stringify(k)}`); }
      if (ex.themeChanges) {
        await a.theme("light"); await wait(50); const l = colors(el);
        await a.theme("dark"); await wait(50); const d = colors(el);
        notes[c.id] = { light: l, dark: d };
        if (JSON.stringify(l) === JSON.stringify(d)) throw new Error("same colors in light and dark");
      }
      if (ex.lock) {
        const f = field(el); await fill(f, ex.lock.fill); await press(el, ex.lock.press); await wait(300);
        const lk = el.querySelector(at.locked);
        if (!lk) throw new Error("no locked wrapper");
        if (!lk.inert) throw new Error("locked wrapper not inert");
        if (!(lk.getBoundingClientRect().height > 0)) throw new Error("locked wrapper paints nothing (display: contents?)");
        const op = Number(getComputedStyle(lk).opacity); notes[c.id] = { opacity: op };
        if (!(op < 1)) throw new Error(`opacity ${op}, want < 1`);
        if (field(el)?.value !== ex.lock.fill) throw new Error("typed value lost after send");
      }
      pass.push(c.id);
    } catch (e) { fail.push(`${c.id}: ${e.message}`); }
    finally {
      await a.cleanup?.();
      if (c.textScale && c.textScale !== 1) await a.textScale(1);
      if (c.theme || c.expect.themeChanges) await a.theme("light");
    }
  }
  return { pass, fail, skip, notes };
}
