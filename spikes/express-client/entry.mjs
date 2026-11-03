import { ExpressFormat } from '@a2ui/agent';
import { Catalog } from '@a2ui/web_core/catalog';
import json from './node_modules/@a2ui/web_core/src/v1_0/schemas/catalogs/basic/catalog.json' with {type:'json'};
const p = new ExpressFormat([Catalog.fromJson(json)]).createParser();
const r = await p.parseResponse('x\n<a2ui>\nroot = Column([Text("hi")])\n</a2ui>');
globalThis.__out = JSON.stringify(r);
console.log(globalThis.__out.slice(0,200));
