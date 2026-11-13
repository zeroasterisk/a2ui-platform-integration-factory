// Argon slice-2a Major 1: is one <a2ui> block atomic when it carries two surface() statements and the second fails?
import { ExpressFormat, RendererState } from '@a2ui/agent';
import { MessageProcessor } from '@a2ui/web_core';
import { basicCatalog } from '@a2ui/web_core/v1_0';
const proc = new MessageProcessor([basicCatalog], () => {});
const state = RendererState.of(proc);
const ids = () => [...proc.model.surfacesMap.keys()].join(',');
const texts = (sid) => JSON.stringify(proc.model.surfacesMap.get(sid) ?? null, (k, v) => v instanceof Map ? Object.fromEntries(v) : v).match(/"t\d"/g);
const p = (sid) => new ExpressFormat([basicCatalog], { surfaceId: sid }).createParser();
p('m1:0').parseResponse('surface("triage")\nroot = Text("t1")', { state, wrapped: false });
console.log('after turn 1:', ids(), texts('triage'));
// Block 2: good update to triage, then a new surface with an off-catalog component.
const src = 'surface("triage", update=true)\nroot = Text("t2")\n\nsurface("other")\nroot = Iframe(url="x")';
let parts = 0;
try {
  const out = p('m2:0').parseResponse(src, { state, wrapped: false });
  for (const _ of out) parts++;
  console.log('block 2 accepted, parts:', parts);
} catch (e) { console.log('block 2 rejected after', parts, 'parts:', e.message.slice(0, 90)); }
console.log('after block 2: surfaces =', ids(), '| triage texts =', texts('triage'));
// Reverse order: bad first, good second.
const src2 = 'surface("other2")\nroot = Iframe(url="x")\n\nsurface("triage", update=true)\nroot = Text("t3")';
try { for (const _ of p('m3:0').parseResponse(src2, { state, wrapped: false })); console.log('block 3 accepted'); } catch (e) { console.log('block 3 rejected:', e.message.slice(0, 90)); }
console.log('after block 3: surfaces =', ids(), '| triage texts =', texts('triage'));
// Control: a valid two-surface block applies both.
try { for (const _ of p('m4:0').parseResponse('surface("triage", update=true)\nroot = Text("t4")\n\nsurface("other3")\nroot = Text("t5")', { state, wrapped: false })); console.log('control block accepted'); } catch (e) { console.log('control rejected:', e.message.slice(0, 90)); }
console.log('after control: surfaces =', ids(), '| triage texts =', texts('triage'), '| other3 =', texts('other3'));
// Runtime (not catalog) failure in part 2: update to an unknown surface after a good update.
try { for (const _ of p('m5:0').parseResponse('surface("triage", update=true)\nroot = Text("t6")\n\nsurface("ghost", update=true)\nroot = Text("t7")', { state, wrapped: false })); console.log('runtime block accepted'); } catch (e) { console.log('runtime block rejected:', e.message.slice(0, 90)); }
console.log('after runtime: surfaces =', ids(), '| triage texts =', texts('triage'));
