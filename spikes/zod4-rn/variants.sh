#!/bin/bash
# Extra variants: zod4 via its bundled zod/v3 compat layer, and the
# `@a2ui/web_core/processing` subpath (to keep lit out of a RN bundle).
cd "$(dirname "$0")"
export A2UI_CONFORMANCE=${A2UI_CONFORMANCE:-$(cd ../../../a2ui/conformance && pwd)}
EB=node_modules/.bin/esbuild
mkdir -p out shims/zod4v3/v3
echo '{"type":"module"}' > out/package.json
ln -sfn ../node_modules out/node_modules
echo "export * from 'zod4/v3'; export { default } from 'zod4/v3';" > shims/zod4v3/index.mjs
cp shims/zod4v3/index.mjs shims/zod4v3/v3/index.mjs
echo '{"name":"zod4v3","type":"module","exports":{".":"./index.mjs","./v3":"./v3/index.mjs"}}' > shims/zod4v3/package.json
sed "s#from '@a2ui/web_core';#from '@a2ui/web_core/processing';#" rn-entry.mjs > rn-entry-sub.mjs

rn() { # name entry extra-args
  local name=$1 entry=$2; shift 2
  $EB $entry --bundle --platform=neutral --main-fields=react-native,browser,module,main \
    --conditions=react-native,browser --format=esm --minify --external:fs --external:path "$@" \
    --metafile=out/rn-$name.meta.json --outfile=out/rn-$name.js --log-level=error || { echo "== $name: BUILD FAIL"; return; }
  local res; res=$(node out/rn-$name.js 2>&1 | grep -v '^\s*at ' | grep -v '^$' | tail -1 | cut -c1-200)
  local lit; lit=$(grep -o '"node_modules/[^"]*\(/lit/\|@lit/\|lit-element\|lit-html\)[^"]*"' out/rn-$name.meta.json | sort -u | wc -l)
  local ce; ce=$(grep -o 'customElements' out/rn-$name.js | wc -l)
  echo "== $name: $res | raw=$(wc -c < out/rn-$name.js) gz=$(gzip -9c out/rn-$name.js | wc -c) lit_modules=$lit customElements_refs=$ce"
}
rn root-zod3 rn-entry.mjs
rn root-zod4 rn-entry.mjs --alias:zod=zod4
rn root-zod4v3 rn-entry.mjs --alias:zod=zod4v3
rn sub-zod3 rn-entry-sub.mjs
rn sub-zod4 rn-entry-sub.mjs --alias:zod=zod4
rn sub-zod4v3 rn-entry-sub.mjs --alias:zod=zod4v3

$EB harness.mjs --bundle --platform=node --format=esm --external:yaml --alias:zod=zod4v3 --outfile=out/h-zod4v3.mjs --log-level=error
node out/h-zod4v3.mjs > out/zod4v3.json
echo "== conformance zod4 via zod/v3 compat: $(grep -v '^   "' out/zod4v3.json | tr -d '\n ')"
