// RN-shaped entry: exactly what a host chat renderer needs (parse + process), no fs.
import {ExpressFormat} from '@a2ui/agent';
import {MessageProcessor} from '@a2ui/web_core';
import {Catalog} from '@a2ui/web_core/catalog';
import json from './node_modules/@a2ui/web_core/src/v1_0/schemas/catalogs/basic/catalog.json' with {type: 'json'};
const cat = Catalog.fromJson(json);
const r = await new ExpressFormat([cat]).createParser()
  .parseResponse('hi\n<a2ui>\nroot = Column([Text("hi")])\n</a2ui>');
const msgs = r.flatMap(p => p.a2ui ?? []);
const mp = new MessageProcessor([cat]);
const errs = mp.processMessagesWithErrors(msgs);
console.log(JSON.stringify({parts: r.length, msgs: msgs.length, errs: errs.length, surfaces: mp.getSurfaces().size}));
