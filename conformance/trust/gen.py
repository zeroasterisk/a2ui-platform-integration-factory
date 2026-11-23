# Generates trust.json (kept as source so fixtures stay reviewable). Run: python3 gen.py
# Host render fixtures for the trust boundary (Argon 5b close §5): an off-catalog block is blocked
# with its source disclosed, untrusted strings never become markup/URLs, a streaming block shows
# no DSL, and only agent-authored blocks are interactive.
import json, pathlib

FORM = '''surface("triage")
title = Text("Flaky test triage")
go = Button(Text("Apply"), variant="primary", action=Event("apply", {}))
root = Card(Column([title, go]))'''

# Elements no block may ever produce, whatever it says.
FORBIDDEN = ["iframe", "script", "object", "embed", "frame", "form[action]", "a[href^='javascript' i]", "img[src^='javascript' i]", "[onerror]", "[onclick]", "[srcdoc]"]

render = [
 {"id": "valid-form-draws-natively", "source": FORM,
  "expect": {"state": "surface", "textContains": ["Flaky test triage", "Apply"], "textExcludes": ["surface(", "Column("], "present": ["button"]}},
 {"id": "off-catalog-iframe-blocked-with-source", "source": 'surface("bad")\nroot = Iframe(url="https://evil.example")',
  "expect": {"state": "error", "textContains": ["Iframe(", "https://evil.example"], "absent": ["iframe"]}},
 {"id": "off-catalog-script-blocked-with-source", "source": 'surface("bad")\nroot = Script(src="https://evil.example/x.js")',
  "expect": {"state": "error", "textContains": ["Script("], "absent": ["script"]}},
 {"id": "off-catalog-nested-in-valid-tree-blocks-whole-block", "source": 'surface("bad")\nok = Text("fine")\nroot = Column([ok, Html(content="<b>x</b>")])',
  "expect": {"state": "error", "textContains": ["Html("], "absent": ["b"]}},
 {"id": "text-markup-stays-text", "source": 'surface("t")\nroot = Text("<img src=x onerror=alert(1)><script>alert(2)</script>")',
  "expect": {"state": "surface", "textContains": ["<img src=x onerror=alert(1)>"], "absent": ["img"]}},
 {"id": "text-markdown-link-not-a-link", "source": 'surface("t")\nroot = Text("[click](javascript:alert(1))")',
  "expect": {"state": "surface", "textContains": ["javascript:alert(1)"], "absent": ["a"]}},
 {"id": "image-javascript-url-dropped", "source": 'surface("i")\nroot = Image(url="javascript:alert(1)", description="x")',
  "expect": {"state": "surface", "attrNever": {"src": "^\\s*javascript:"}}},
 {"id": "image-protocol-relative-url-dropped", "source": 'surface("i")\nroot = Image(url="//evil.example/p.png", description="x")',
  "expect": {"state": "surface", "attrNever": {"src": "^\\s*//"}}},
 {"id": "image-https-url-kept", "source": 'surface("i")\nroot = Image(url="https://example.com/p.png", description="pic")',
  "expect": {"state": "surface", "present": ["img[src='https://example.com/p.png']"]}},
]

# Whole messages: which authors get an interactive reply, and what a streaming block shows.
messages = [
 {"id": "agent-block-is-interactive", "author": "agent", "text": "Here.\n\n<a2ui>\n" + FORM + "\n</a2ui>",
  "expect": {"interactive": True}},
 {"id": "person-block-stays-plain-text", "requires": ["authorKind"], "author": "person", "text": "Here.\n\n<a2ui>\n" + FORM + "\n</a2ui>",
  "expect": {"interactive": False}},
 {"id": "fenced-block-stays-plain-text", "author": "agent", "text": "Example:\n\n```\n<a2ui>\n" + FORM + "\n</a2ui>\n```",
  "expect": {"interactive": False}},
 {"id": "streaming-block-shows-no-dsl", "author": "agent", "text": "Working…\n\n<a2ui>\nsurface(\"x\")\nroot = Text(\"hi",
  "expect": {"interactive": False, "pending": True, "textExcludes": ["surface(", "root ="]}},
]

out = {"forbidden": FORBIDDEN, "render": render, "messages": messages}
pathlib.Path(__file__).with_name("trust.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
print(f"trust.json: {len(render)} render + {len(messages)} message cases")
