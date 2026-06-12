# Screen-Reader Audit Protocol — Monthly (Layer 4 of Task #54)

Cadence: **1st Monday of every month** · ~60 min · Auditor: founder
(handover: Prasanth after 15 Jul) · Findings feed **Task #75**.

Automation (Layers 1–3) proves structure on every PR. Roughly half of
real barriers — announcement _quality_, flow _comprehension_, focus
_feel_ — are only findable by a human driving real assistive tech.
This script makes that hour repeatable, comparable month-over-month,
and impossible to skip silently.

## Setup (once)

1. Windows + Chrome (the dominant patient pairing) + **NVDA**
   (free, nvaccess.org) — latest stable.
2. NVDA: Speech viewer ON (NVDA menu → Tools) so announcements can be
   screenshotted into findings.
3. Audit the **production build**: `pnpm turbo run build --filter=web`
   → `pnpm --filter web start` → http://localhost:3000. Dev mode
   announces differently; we audit what patients get.
4. Quarterly extra (Mar/Jun/Sep/Dec): repeat journeys 1–4 on iPhone
   Safari + **VoiceOver** — the second-most-common patient pairing.

## The 9 journeys (run in order, eyes OFF the screen for 1–6)

Mark each: ✅ smooth · ⚠️ confusing-but-possible · ❌ blocked.

1. **Cold land + orient** — load `/`. Within 15 s of listening only:
   what is this site, what can I do? Skip-link is first Tab and works.
2. **Language switch** — find the Language button by Tab, open with
   Enter, pick हिन्दी with arrows + Enter. Page announces in Hindi;
   pronunciation flips (lang attr doing its job). Escape-test the
   menu: focus returns to the trigger.
3. **Theme** — find the theme toggle; its announced label is in the
   CURRENT page language and states the ACTION (switch to dark), not
   the state.
4. **Sign-up by ear** — `/signup`: complete every field guided only by
   announcements. Labels announce on focus; the password field accepts
   a paste; errors (submit empty) are announced, not just painted red.
5. **Sign-in, phone tab** — `/login`: switch to the Phone tab with
   arrow keys (it's a tablist), confirm the tab change is announced
   and the tel field self-describes.
6. **Legal reading flow** — `/privacy` → navigate by headings (H key):
   does the H1→H2 outline make sense as a table of contents? Jump to
   `/terms` via the tab nav — route change is announced (title).
7. **Visual checks, eyes ON** — 200% browser zoom on `/` and `/login`:
   no horizontal scroll, nothing clipped. Then 400%: still usable.
8. **Reduced motion** — OS setting ON → reload `/`: entrance
   animations gone, nothing depends on them.
9. **Statement honesty** — read `/accessibility` §4 Known Limitations:
   is every line still true? Anything fixed → update the page; any new
   gap found today → it goes IN (the ledger stays honest).

## Recording findings

One issue = one row in `docs/accessibility/audit-log.md` (create on
first run):

```md
| Date | Journey | Severity | What happened (quote the announcement) | Owner | Task/PR |
```

Severity rubric — **P0** journey blocked (fix-now, same as a medical
bug) · **P1** completable but genuinely confusing (this sprint) ·
**P2** polish (backlog, batched into #75).

## Exit ritual

5-line summary to the founder WhatsApp (8796 number): date, ✅/⚠️/❌
per journey, P0 count. No P0s for 3 consecutive months on a stable
surface → that surface graduates to quarterly-only (the automation
layers keep the daily watch).
