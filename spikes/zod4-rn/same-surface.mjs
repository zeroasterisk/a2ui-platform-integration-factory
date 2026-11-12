// Slice-2 precondition spike: can turn 2 update turn 1's surface by surfaceId, through one
// thread-scoped MessageProcessor + RendererState.of(processor)? And is it rejected without state?
import { ExpressFormat, RendererState } from '@a2ui/agent';
import { MessageProcessor } from '@a2ui/web_core';
import { basicCatalog } from '@a2ui/web_core/v1_0';

const parser = new ExpressFormat([basicCatalog]).createParser();
const turn1 = `<a2ui>
surface("triage")
$/note = ""
root = Column([Text("PR 415: typecheck red"), TextField("Note", value=$/note), Button(Text("Apply"), action=Event("apply", {note: $/note}))])
</a2ui>`;
const turn2 = `<a2ui>
surface("triage", update=true)
root = Column([Text("PR 415: reverted, CI green")])
</a2ui>`;

const log = (k, v) => console.log(k.padEnd(34), v);
const proc = new MessageProcessor([basicCatalog], () => {});
const state = RendererState.of(proc);
const apply = () => {}; // RendererState.of(proc) applies parsed messages to proc itself
try {
  apply(parser.parseResponse(turn1, { state }));
  log('turn1 surfaces', [...proc.model.surfacesMap.keys()].join(','));
  const before = proc.model.surfacesMap.get('triage');
  const parts2 = parser.parseResponse(turn2.replace(/<\/?a2ui>/g, ""), { state, wrapped: false });
  log('turn2 message kinds', parts2.filter((p) => p.type === 'a2ui').flatMap((p) => p.a2ui.map((m) => Object.keys(m).filter((k) => k !== 'version')[0])).join(','));
  apply(parts2);
  const after = proc.model.surfacesMap.get('triage');
  log('turn2 surfaces', [...proc.model.surfacesMap.keys()].join(','));
  log('same SurfaceModel object', before === after);
  const texts = JSON.stringify(after, (k, v) => (v instanceof Map ? Object.fromEntries(v) : v)).match(/PR 415:[^"]*/g);
  log('texts on surface after turn2', JSON.stringify([...new Set(texts)]));
} catch (e) { log('stateful ERROR', e.message.slice(0, 200)); }

try {
  parser.parseResponse(turn2, {});
  log('turn2 without state', 'accepted (creates new surface)');
} catch (e) { log('turn2 without state', 'rejected: ' + e.message.slice(0, 120)); }
