#!/usr/bin/env python3
"""One-shot Gemini 4 Argon (Vertex, global) review: argon.py PROMPT_FILE [CONTEXT_FILES...] > out.md"""
import json, subprocess, sys, urllib.request

prompt = open(sys.argv[1]).read()
for p in sys.argv[2:]:
    prompt += f"\n\n===== FILE: {p} =====\n" + open(p, errors="replace").read()
tok = subprocess.check_output(["gcloud", "auth", "print-access-token"], text=True).strip()
proj = subprocess.check_output(["gcloud", "config", "get-value", "project"], text=True).strip()
url = f"https://aiplatform.googleapis.com/v1/projects/{proj}/locations/global/publishers/google/models/gemini-4-argon:generateContent"
body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}], "generationConfig": {"maxOutputTokens": 32000}}
req = urllib.request.Request(url, json.dumps(body).encode(), {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"})
r = json.load(urllib.request.urlopen(req, timeout=900))
print("".join(p.get("text", "") for p in r["candidates"][0]["content"]["parts"] if not p.get("thought")))
