# Generates visual.json (kept as source so fixtures stay reviewable). Run: python3 gen.py
# Visual gates (Argon 5b close §5): a reply fits a 360/412 column, also at 150% text; the field
# stands off its card in light and dark; a sent reply is inert and visibly dimmed with its values kept.
import json, pathlib

FORM = '''surface("triage")
title = Text("Flaky test triage")
pick = ChoicePicker(label="Next step", options=[{label: "Retry", value: "retry"}, {label: "Revert", value: "revert"}, {label: "Quarantine", value: "quarantine"}], value=$/choice, variant="mutuallyExclusive")
note = TextField(label="Note for the team", value=$/note)
notify = CheckBox(label="Tell #release", value=$/notify)
go = Button(Text("Apply"), variant="primary", action=Event("apply", {choice: $/choice, note: $/note, notify: $/notify}))
root = Card(Column([title, pick, note, notify, go]))
$/choice = ["retry"]
$/note = ""
$/notify = false'''

# Long unbroken tokens and a wide row: the usual ways an agent's reply breaks a narrow column.
WIDE = '''surface("wide")
title = Text("Run b7f3c1e9d2a4f6081357924680acebdf1234567890abcdef failed on ci-linux-x64-large-runner-pool")
r = Row([Button(Text("Retry all"), action=Event("a", {})), Button(Text("Revert merge"), action=Event("b", {})), Button(Text("Quarantine"), action=Event("c", {})), Button(Text("Open logs"), action=Event("d", {}))])
root = Card(Column([title, r]))'''

CONTROLS = "button, input, textarea, [role='radio'], [role='checkbox'], [role='switch'], [data-slot='toggle']"

cases = [
 {"id": f"fits-{w}{'-text150' if s > 1 else ''}-{n}", "source": src, "viewport": [w, 800], "textScale": s,
  "expect": {"fits": True}}
 for n, src in (("form", FORM), ("wide", WIDE)) for w in (360, 412) for s in (1, 1.5)
] + [
 {"id": f"field-off-card-{t}", "source": FORM, "theme": t, "expect": {"fieldOffCard": True}} for t in ("light", "dark")
] + [
 {"id": "theme-follows-host", "source": FORM, "expect": {"themeChanges": True}},
 {"id": "sent-reply-inert-dimmed-values-kept", "source": FORM,
  "expect": {"lock": {"fill": "Quarantining until #415 lands", "press": "Apply"}}},
]

out = {"controls": CONTROLS, "cases": cases}
pathlib.Path(__file__).with_name("visual.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
print(f"visual.json: {len(cases)} cases")
