# TISC Certificate portal — accepted design

User selected the existing GitHub Pages + Apps Script iframe model. Reuse the supplied banner, styles and team/name/surname verification. Create a separate certificate page and separate Apps Script project/deployment; never replace the onsite registration deployment.

Private Email Send sheet is authoritative, header row 8. Only DataCheck=VERIFIED_MAPPING, Issue empty, Approved=YES and DriveCheck=PATH_SIZE_MATCH are downloadable. HOLD/REVIEW remain excluded. Do not expose email, full names, file IDs or sheet URLs through public roster endpoints. Team selection uses opaque team keys; name choices show first name and surname initial.

After exact surname verification, issue a short-lived opaque token bound to certificate identity and current row fingerprint. Recheck eligibility and fingerprint at download; verify file name, path, round, track, ancestry and SHA256. Return PNG bytes as base64 to the authorized client, create a browser Blob and offer a user-clicked download. No Drive link or public sharing changes. Persist failed-attempt throttles under a lock, including malformed requests. Expiring sessions and generic failures, no staff dashboard or attendance mutation.

Surname matching preserves the existing last-name-token behavior; it is knowledge-based verification, not strong authentication. Email Send Approved also controls publication: existing YES approvals will allow eligible rows to appear once the portal is enabled. Portal is disabled by default until admin setup/explicit enable. No production publishing until a new /exec URL exists and smoke tests pass.

GitHub Pages cannot hide the Apps Script endpoint. This is accepted. Repository stores code/assets only; participant sheets and certificates stay private. Local files are prepared first; repository discovery must identify a verified destination before proposing a branch/PR.
