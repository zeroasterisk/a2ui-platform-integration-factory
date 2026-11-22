# Generates thread.json (kept as source so fixtures stay reviewable). Run: python3 gen.py
import json, pathlib

def triage(t): return f'surface("triage")\nroot = Column([Text("{t}"), Button(Text("Go"), action=Event("go", {{}}))])'
def update(t): return f'surface("triage", update=true)\nroot = Column([Text("{t}")])'
def b(key, src, author=None):
    d = {"key": key, "source": src}
    if author: d["authorId"] = author
    return d

OWN = "Surface triage belongs to another agent"
cases = [
 {"id": "update-supersedes-earlier", "group": "supersede", "steps": [
   {"sync": [b("m1:0", triage("first")), b("m2:0", update("second"))]},
   {"expect": {"results": {"m2:0": {"ok": True, "surfaceIds": ["triage"]}},
               "live": {"m1:0": [], "m2:0": ["triage"]},
               "texts": {"triage": {"contains": ["second"]}}}}]},
 {"id": "no-surface-gets-own-id", "group": "replay", "steps": [
   {"sync": [b("m1:0", 'root = Text("a")'), b("m2:0", 'root = Text("b")')]},
   {"expect": {"results": {"m1:0": {"ok": True, "surfaceIds": ["a2ui-m1:0"]},
                           "m2:0": {"ok": True, "surfaceIds": ["a2ui-m2:0"]}}}}]},
 {"id": "off-catalog-update-keeps-earlier", "group": "trust.off-catalog", "steps": [
   {"sync": [b("m1:0", triage("first")), b("m2:0", 'surface("triage", update=true)\nroot = Iframe(url="https://x")')]},
   {"expect": {"results": {"m2:0": {"ok": False}}, "live": {"m1:0": ["triage"]},
               "texts": {"triage": {"contains": ["first"]}}}}]},
 {"id": "update-unknown-surface-rejected", "group": "replay", "steps": [
   {"sync": [b("m1:0", update("ghost"))]},
   {"expect": {"results": {"m1:0": {"ok": False}}}}]},
 {"id": "sync-idempotent-then-rebuild-on-edit", "group": "replay", "steps": [
   {"sync": [b("m1:0", triage("first"))]},
   {"mark": True},
   {"sync": [b("m1:0", triage("first"))]},
   {"expect": {"sameSurfaceAsMark": {"triage": True}, "versionSinceMark": 0}},
   {"sync": [b("m1:0", triage("edited"))]},
   {"expect": {"sameSurfaceAsMark": {"triage": False}, "texts": {"triage": {"contains": ["edited"]}}}}]},
 {"id": "rebuild-on-delete", "group": "replay", "steps": [
   {"sync": [b("m1:0", triage("first")), b("m2:0", update("second"))]},
   {"sync": [b("m1:0", triage("first"))]},
   {"expect": {"live": {"m1:0": ["triage"]}, "texts": {"triage": {"contains": ["first"], "excludes": ["second"]}}}}]},
 {"id": "lock-survives-replay-fresh-reply-unlocks", "group": "action-lock", "steps": [
   {"sender": "ok"},
   {"sync": [b("m1:0", triage("first"))]},
   {"dispatch": "triage"},
   {"expect": {"sent": {"triage": "sent"}, "sends": 1, "sendContains": ['"surfaceId":"triage"']}},
   {"sync": [b("m1:0", triage("edited"))]},
   {"expect": {"sent": {"triage": "sent"}}},
   {"sync": [b("m1:0", triage("edited")), b("m2:0", update("second"))]},
   {"expect": {"sent": {"triage": None}}}]},
 {"id": "one-send-per-surface-before-lock", "group": "action-lock", "steps": [
   {"sender": "hold"},
   {"sync": [b("m1:0", triage("first"))]},
   {"dispatch": "triage"}, {"dispatch": "triage"},
   {"expect": {"sent": {"triage": "sending"}}},
   {"release": True},
   {"dispatch": "triage"},
   {"expect": {"sent": {"triage": "sent"}, "sends": 1}}]},
 {"id": "failed-send-marks-failed", "group": "action-lock", "steps": [
   {"sender": "fail"},
   {"sync": [b("m1:0", triage("first"))]},
   {"dispatch": "triage"},
   {"expect": {"sent": {"triage": "failed"}}}]},
 {"id": "recreate-rejected-keeps-first", "group": "trust.hijack", "steps": [
   {"sync": [b("m1:0", triage("mine"), "agent-a"), b("m2:0", triage("hijack"), "agent-b")]},
   {"expect": {"results": {"m2:0": {"ok": False}}, "live": {"m1:0": ["triage"]},
               "texts": {"triage": {"contains": ["mine"], "excludes": ["hijack"]}}}}]},
 {"id": "reply-routes-to-surface-owner", "group": "ownership", "requires": ["ownership"], "steps": [
   {"sender": "ok"},
   {"sync": [b("m1:0", triage("a"), "agent-a"), b("m2:0", 'surface("other")\nroot = Text("b")', "agent-b")]},
   {"dispatch": "triage"},
   {"expect": {"sendAuthors": ["agent-a"]}}]},
 {"id": "cross-agent-update-blocked", "group": "trust.hijack", "requires": ["ownership"], "steps": [
   {"sync": [b("m1:0", triage("mine"), "agent-a"), b("m2:0", update("hijack"), "agent-b")]},
   {"expect": {"results": {"m2:0": {"ok": False, "error": OWN}}, "live": {"m1:0": ["triage"]},
               "texts": {"triage": {"contains": ["mine"], "excludes": ["hijack"]}}}},
   {"sync": [b("m1:0", triage("mine"), "agent-a"), b("m2:0", update("hijack"), "agent-b"), b("m3:0", update("owner"), "agent-a")]},
   {"expect": {"results": {"m3:0": {"ok": True}}, "texts": {"triage": {"contains": ["owner"]}}}}]},
 {"id": "ownership-survives-rebuild", "group": "trust.hijack", "requires": ["ownership"], "steps": [
   {"sync": [b("m1:0", triage("mine"), "agent-a"), b("m2:0", triage("hijack"), "agent-b"), b("m3:0", update("owner"), "agent-a")]},
   {"sync": [b("m1:0", triage("mine2"), "agent-a"), b("m2:0", triage("hijack"), "agent-b"), b("m3:0", update("owner"), "agent-a"), b("m4:0", update("again"), "agent-b")]},
   {"expect": {"results": {"m3:0": {"ok": True}, "m4:0": {"ok": False, "error": OWN}},
               "texts": {"triage": {"contains": ["owner"], "excludes": ["again"]}}}}]},
]
out = {"version": 1, "event": "go", "cases": cases}
p = pathlib.Path(__file__).with_name("thread.json")
p.write_text(json.dumps(out, indent=1) + "\n")
print(len(cases), "cases ->", p)
