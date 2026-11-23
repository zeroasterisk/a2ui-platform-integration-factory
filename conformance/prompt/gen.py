# Generates prompt.json (kept as source so fixtures stay reviewable). Run: python3 gen.py
# Two-tier agent prompt: a tiny always-on pointer, the full Express rules on demand, and a send
# tool that checks a reply against the thread before posting (Buzz slice 2.2, Argon 5b close §5).
import json, pathlib

def form(sid="triage"): return f'Pick one.\n<a2ui>\nsurface("{sid}")\nroot = Column([Text("Which?"), Button(Text("Go"), action=Event("go", {{}}))])\n</a2ui>'
def upd(sid="triage"): return f'<a2ui>\nsurface("{sid}", update=true)\nroot = Column([Text("Done")])\n</a2ui>'
AGENT, OTHER, PERSON = "a" * 64, "b" * 64, "e" * 64
def msg(i, author, text, kind="agent"): return {"id": i, "authorId": author, "authorKind": kind, "text": text}

pointer = {
  "maxBytes": 1024,
  # Each entry: any one alternative must appear (case-insensitive).
  "mustMention": [["<a2ui>"], ["</a2ui>", "…</a2ui>"], ["update=true"], ["code fence", "fence"], ["basic catalog"], ["a2ui-action"]],
  "mustNotContain": ["```"],
  "mustNameTools": ["rules", "send"],
}
rules = {"minBytes": 4097, "mustContain": ["surface(", "ChoicePicker", "Button", "Event("]}
send = [
  {"id": "valid-form-posts-exact-text", "text": form(), "earlier": [], "expect": {"posted": True}},
  {"id": "no-block-refused", "text": "Just prose.", "earlier": [], "expect": {"posted": False}},
  {"id": "fenced-block-is-not-a-block", "text": "```\n<a2ui>\nroot = Text(\"x\")\n</a2ui>\n```", "earlier": [], "expect": {"posted": False}},
  {"id": "unclosed-block-refused", "text": "<a2ui>\nroot = Text(\"x\")", "earlier": [], "expect": {"posted": False}},
  {"id": "off-catalog-refused", "text": '<a2ui>\nsurface("x")\nroot = Iframe(url="https://example.com")\n</a2ui>', "earlier": [], "expect": {"posted": False}},
  {"id": "update-unknown-surface-refused", "text": upd("nope"), "earlier": [], "expect": {"posted": False}},
  {"id": "recreate-existing-surface-refused", "text": form(), "earlier": [msg("m1", AGENT, form())], "expect": {"posted": False}},
  {"id": "update-own-surface-posts", "text": upd(), "earlier": [msg("m1", AGENT, form())], "expect": {"posted": True}},
  {"id": "update-other-agents-surface-refused", "requires": ["ownership"], "text": upd(), "earlier": [msg("m1", OTHER, form())], "expect": {"posted": False, "errorMatches": "another agent"}},
  {"id": "person-block-claims-no-surface", "requires": ["authorKind"], "text": form(), "earlier": [msg("m1", PERSON, form(), "person")], "expect": {"posted": True}},
  {"id": "person-block-not-updatable", "requires": ["authorKind"], "text": upd(), "earlier": [msg("m1", PERSON, form(), "person")], "expect": {"posted": False}},
]
out = {"agentId": AGENT, "pointer": pointer, "rules": rules, "send": send}
pathlib.Path(__file__).with_name("prompt.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
print(f"prompt.json: pointer + rules + {len(send)} send cases")
