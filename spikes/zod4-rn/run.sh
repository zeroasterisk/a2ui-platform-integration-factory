#!/bin/bash
# Phase 2b spike runner. Needs: npm i (see package.json), A2UI checkout at ../../../a2ui.
set -e
cd "$(dirname "$0")"
export A2UI_CONFORMANCE=${A2UI_CONFORMANCE:-$(cd ../../../a2ui/conformance && pwd)}
EB=node_modules/.bin/esbuild
mkdir -p out; ln -sfn ../node_modules out/node_modules
$EB harness.mjs --bundle --platform=node --format=esm --external:yaml --outfile=out/h-zod3.mjs --log-level=warning
$EB harness.mjs --bundle --platform=node --format=esm --alias:zod=zod4 --external:yaml --outfile=out/h-zod4.mjs --log-level=warning
echo "== conformance, zod 3 (declared) =="; node out/h-zod3.mjs > out/zod3.json; head -c 4000 out/zod3.json; echo
echo "== conformance, zod 4 aliased (Paseo host zod) =="; node out/h-zod4.mjs > out/zod4.json; head -c 4000 out/zod4.json; echo
for Z in zod3 zod4; do
  AL=""; [ $Z = zod4 ] && AL="--alias:zod=zod4"
  $EB rn-entry.mjs --bundle --platform=neutral --main-fields=react-native,browser,module,main --conditions=react-native,browser \
    --format=esm --minify --external:fs --external:path $AL --metafile=out/rn-$Z.meta.json --outfile=out/rn-$Z.js --log-level=warning
  echo "== RN-shaped bundle ($Z) =="
  node out/rn-$Z.js
  echo "raw bytes: $(wc -c < out/rn-$Z.js)  gzip bytes: $(gzip -9c out/rn-$Z.js | wc -c)"
  echo "lit modules in metafile: $(grep -o '"node_modules/[^"]*lit[^"]*"' out/rn-$Z.meta.json | sort -u | wc -l)"
  echo "DOM refs (window./document./customElements): $(grep -o 'window\.\|document\.\|customElements' out/rn-$Z.js | sort | uniq -c | tr '\n' ' ')"
done
