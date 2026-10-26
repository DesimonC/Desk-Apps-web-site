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
Tester registrations submit directly to the Netlify function and save to the private Testers Google spreadsheet. Feedback opens a prepared email for the visitor to send.

Registration requires name, contact email, phone, device type, make/model, OS version, country, app preference and consent. Android and Apple testers also provide their store invitation email. Optional notes are supported.

New registrations go to `Testers2`, with row 1 headings in this exact order:
Registration timestamp | Name | Email address | Phone number | Device type | Device make and model | Operating system and version | Country | Store invitation email | App to test | Additional notes | Consent

The original Testers tab and its records remain untouched. The Netlify function sends structured fields plus legacy fields during rollout. The new Apps Script accepts either payload and saves the twelve separate columns to Testers2.
## Smoke test checklist
1. Open on phone and desktop, check navigation and mobile menu.
2. Open and close every app detail modal, including keyboard Escape.
3. Check all nine project links.
4. Complete tester form and verify the saved spreadsheet row, including invitation email and device details.
5. Complete feedback form and verify the prepared email.
6. Check links and page layout after approved PNGs are added.

## Publication notes
Descriptions and development statuses are preliminary and should be reviewed before a public launch. Do not publish internal business forecasts. Keep the privacy notice aligned with registration storage and any future analytics.

## Tester registration backend (Netlify)
The website submits tester registrations to `/.netlify/functions/register-tester`, which forwards them to the Google Apps Script deployment. The current public deployment URL is pinned in `netlify/functions/register-tester.js`. Configure the secret in Netlify (do not put secrets in GitHub):
- Current Apps Script deployment: `https://script.google.com/macros/s/AKfycbzWFM1IGW0BEw7D5QWpGzU89KyO_mYFx8H1jMapzzM8sCwMSIFqBs1FnPLpBIC2zpYwBw/exec`. The previous `TESTER_SCRIPT_URL` environment variable is no longer used.
- `REGISTRATION_SECRET`: the same private value configured in Apps Script Script Properties.

The Apps Script source is in `docs/tester-apps-script.gs`. Deploy its latest version before testing. Tester registrations save to Testers2; the App field is in column J. Do not consider the registration working until a real end-to-end test succeeds.

## Registration checks
Run `node --test tests/register-tester.test.js`. These checks use a mocked Apps Script sheet and service; they do not add synthetic people to the live spreadsheet. After deployment, confirm a genuine registration appears in Testers2 before treating the live connection as verified.


## Activate the Testers2 script
1. Open the Testers spreadsheet, then Extensions → Apps Script.
2. Replace the registration Code.gs contents with `docs/tester-apps-script.gs` and save. Keep the existing REGISTRATION_SECRET Script Property unchanged.
3. Select Deploy → Manage deployments → Edit (pencil) on the existing web-app deployment → Version: New version → Deploy. Keep its existing execution and access settings.
4. Updating the existing deployment preserves its /exec URL. If creating a different deployment, update the public endpoint in `netlify/functions/register-tester.js` and its test fixture to match.
5. Submit the website form and confirm the row appears under the twelve headings in Testers2. Do not test by pressing Run on doPost; the editor supplies no form event.
