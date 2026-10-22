# DesK Apps — company website

First working draft of the official DesK Apps website.

## What is included
- Responsive homepage and company introduction
- Nine app listings with detail pop-ups and links to GitHub projects
- About, tester enquiries, feedback and contact sections
- Keyboard-friendly navigation and accessible modal
- No build step: deploy the repository root as a static site on Netlify

## Deploy on Netlify
Choose **Add new project → Import an existing project → GitHub → DesimonC/Desk-Apps-web-site**.
- Branch: `main`
- Build command: leave blank
- Publish directory: `.`

## Approved logo images
The HTML expects the approved individual app icons under:
`assets/birdsong.png`, `assets/plate-a-mate.png`, `assets/chore-n-score.png`, `assets/poker-compass.png`, `assets/find-it.png`, `assets/card-games.png`, `assets/songuplay.png`, `assets/competition-hunter.png`.
Until these PNGs are uploaded, the cards show an emoji fallback instead of a broken image. The Business Rota Builder icon should be uploaded to `assets/business-rota.png`. The homepage currently uses a CSS logo **placeholder**, not the approved official DesK Apps image; replace it with the official PNG when uploaded.

## Forms
Tester and feedback forms launch a prefilled `mailto:` message addressed to `DesK.Apps.DK@gmail.com`. The visitor must send it from their own email application. No form data is stored by the website. A later version could use a consent-aware backend.

## Smoke test checklist
1. Open on phone and desktop, check navigation and mobile menu.
2. Open and close every app detail modal, including keyboard Escape.
3. Check all nine project links.
4. Complete tester form and verify the prepared email.
5. Complete feedback form and verify the prepared email.
6. Check links and page layout after approved PNGs are added.

## Publication notes
Descriptions and development statuses are preliminary and should be reviewed before a public launch. Do not publish internal business forecasts. Add a full privacy notice before enabling database-backed tester registrations or analytics.

## Tester registration backend (Netlify)
The website submits tester registrations to `/.netlify/functions/register-tester`, which forwards them to the Google Apps Script deployment. Configure these environment variables in Netlify (do not put secrets in GitHub):
- `TESTER_SCRIPT_URL`: `https://script.google.com/macros/s/AKfycbxK2dr53S8dvD3soXHzeazHp4AvXViYb5DIxqIlhRHejpVuSwlqhUCK7kEUxCfZHS3oKg/exec`
- `REGISTRATION_SECRET`: the same private value configured in Apps Script Script Properties.

The Apps Script source is in `docs/tester-apps-script.gs`. Deploy its latest version before testing. Tester registrations save to the existing Testers tab; the App field is in column H. Do not consider the registration working until a real end-to-end test succeeds.
