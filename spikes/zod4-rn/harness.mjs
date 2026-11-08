// Phase 2b spike: run upstream A2UI Express conformance cases through
// ExpressParser.compile -> MessageProcessor. Bundled twice by run.sh:
// once with the declared zod 3, once with `zod` aliased to zod 4 (Paseo's host zod).
import {readFileSync} from 'fs';
import {resolve, dirname} from 'path';
import YAML from 'yaml';
import {ExpressParser, InMemoryCatalogProvider} from '@a2ui/agent';
import {MessageProcessor} from '@a2ui/web_core';
import * as z from 'zod';

const ROOT = process.env.A2UI_CONFORMANCE;
const load = (p) => YAML.parse(readFileSync(resolve(ROOT, p), 'utf8'));
const catalogCache = new Map();
function catalogFor(arg) {
  if (typeof arg === 'string') {
    if (!catalogCache.has(arg)) {
      const doc = JSON.parse(readFileSync(resolve(ROOT, arg), 'utf8'));
      catalogCache.set(arg, new InMemoryCatalogProvider(doc).load());
    }
    return catalogCache.get(arg);
  }
  return new InMemoryCatalogProvider(arg).load();
}
const canon = (v) => Array.isArray(v) ? v.map(canon)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
const eq = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

const res = {zodVersion: ('toJSONSchema' in z) ? '4' : '3', compile: {pass: 0, fail: 0, skip: 0, failures: []},
  processor: {surfaces: 0, cases: 0, errors: 0, throws: 0, errSamples: []}};
for (const c of load('agent/express/compiler.yaml')) {
  if (c.action !== 'compile' || c.args?.format !== 'express') { res.compile.skip++; continue; }
  let msgs, err;
  try { msgs = new ExpressParser(catalogFor(c.args.catalog), 'default_surface').compile(c.input, true); }
  catch (e) { err = e; }
  let ok;
  if (c.expect_error) ok = !!err && (err.constructor?.name || '').includes(c.expect_error.category.replace('Error', ''));
  else if (err) ok = false;
  else if (c.expect) ok = eq(msgs, c.expect);
  else ok = true;
  if (ok) res.compile.pass++; else { res.compile.fail++; res.compile.failures.push(c.name + (err ? ` [${err.constructor?.name}: ${String(err.message).slice(0, 120)}]` : '')); }
  // Same case through the full render-site path (unwrap + compile + renderer-state topology).
  if (!err && !c.expect_error) {
    res.parse = res.parse || {pass: 0, fail: 0, samples: []};
    try {
      new ExpressParser(catalogFor(c.args.catalog), 'default_surface').parseResponse('x\n<a2ui>\n' + c.input + '\n</a2ui>');
      res.parse.pass++;
    } catch (e) { res.parse.fail++; if (res.parse.samples.length < 4) res.parse.samples.push(c.name + ': ' + String(e.message).slice(0, 140)); }
  }
  // Feed successful createSurface outputs into a renderer-side MessageProcessor.
  if (!err && msgs?.some(m => m.createSurface)) {
    res.processor.cases++;
    try {
      const mp = new MessageProcessor([catalogFor(c.args.catalog)]);
      const errs = mp.processMessagesWithErrors(msgs);
      if (errs.length) { res.processor.errors++; if (res.processor.errSamples.length < 5) res.processor.errSamples.push(c.name + ': ' + JSON.stringify(errs[0]).slice(0, 200)); }
      res.processor.surfaces += mp.getSurfaces().size;
    } catch (e) { res.processor.throws++; if (res.processor.errSamples.length < 5) res.processor.errSamples.push(c.name + ' THROW ' + String(e.message).slice(0, 160)); }
  }
}
console.log(JSON.stringify(res, null, 1));
