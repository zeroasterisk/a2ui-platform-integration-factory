// 2a store preconditions: default surfaceId of a block without surface(); failed block leaves state unchanged.
import { ExpressFormat, RendererState } from '@a2ui/agent';
import { MessageProcessor } from '@a2ui/web_core';
import { basicCatalog } from '@a2ui/web_core/v1_0';
const proc = new MessageProcessor([basicCatalog], () => {});
const state = RendererState.of(proc);
const ids = () => [...proc.model.surfacesMap.keys()].join(',');
const def = new ExpressFormat([basicCatalog]).createParser();
def.parseResponse('root = Text("a")', { state, wrapped: false });
console.log('default id after bare block:', ids());
try { def.parseResponse('root = Text("b")', { state, wrapped: false }); console.log('2nd bare block: ok', ids()); } catch (e) { console.log('2nd bare block rejected:', e.message.slice(0, 80)); }
const p = (sid) => new ExpressFormat([basicCatalog], { surfaceId: sid }).createParser();
p('m1:0').parseResponse('surface("triage")\nroot = Column([Text("t1"), Button(Text("go"), action=Event("go", {}))])', { state, wrapped: false });
console.log('after triage:', ids());
try { p('m2:0').parseResponse('surface("triage", update=true)\nroot = Column([Text("t2"), Iframe(url="x")])', { state, wrapped: false }); console.log('bad update accepted?!'); } catch (e) { console.log('bad update rejected:', e.message.slice(0, 80)); }
const s = proc.model.surfacesMap.get('triage');
console.log("triage texts after failed update:", JSON.stringify(s, (k, v) => v instanceof Map ? Object.fromEntries(v) : v).match(/"t[12]"/g));
try { p('m3:0').parseResponse('surface("ghost", update=true)\nroot = Text("x")', { state, wrapped: false }); } catch (e) { console.log('unknown update:', e.message.slice(0, 80)); }
console.log('final:', ids());
