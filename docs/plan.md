# TISC certificate portal implementation plan

**Goal:** Reuse the supplied login UI to download authorized individual certificates without email sending.
**Architecture:** GitHub iframe wrapper → separate Apps Script HTML app → private Email Send + private Drive. Token-bound downloads; no browser-visible Drive file IDs.
**Tech:** Plain HTML/CSS/JS, Apps Script V8, Node built-in tests; no build dependencies.
**Spec:** docs/design.md

## Tasks
- [ ] Test first: masked roster, correct/incorrect surname, published eligibility, cross-team/token misuse, expiry, rate limits, changed row, file integrity, no Drive IDs in response.
- [ ] Implement apps-script/Code.gs, appsscript.json; run Node service mocks.
- [ ] Adapt supplied App.html styles/banner to certificate UI; implement loading/errors, login, authenticated download, logout, expired session.
- [ ] Build public certificates/index.html + config.js wrapper using a new deployment URL field, fail closed until configured. No participant data in public files.
- [ ] Browser smoke tests on desktop/mobile with mocked google.script.run; run full backend tests and source-data reconciliation.
- [ ] Package installation docs; identify GitHub destination and prepare a reviewable branch/PR when reachable. New deployment remains a manual Google-owner step if no execution tool exists.

Changes stay in certificate-portal; source spreadsheets and the old registration system remain intact. Use inline execution for this already-approved design.
