// Replace the current Apps Script Code.gs with this version, then deploy a NEW VERSION.
// Script must be bound to the existing Testers Google spreadsheet.
// Script Properties: REGISTRATION_SECRET = same strong value set in Netlify.
// Sheet row 2 headings: Timestamp | Name | Email | Phone number | Device | Notes | Consent | App
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    const secret = PropertiesService.getScriptProperties().getProperty('REGISTRATION_SECRET');
    if (!secret || data.secret !== secret) throw new Error('Unauthorized');
    if (data.consent !== true || !data.name || !data.email || !data.phone || !data.device || !data.app) throw new Error('Missing fields');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Testers');
    if (!sheet) throw new Error('Testers tab not found');
    function safe(value, max) {
      const s = String(value || '').trim().slice(0, max || 500);
      return /^[=+@\-]/.test(s) ? "'" + s : s;
    }
    sheet.appendRow([new Date(),safe(data.name,80),safe(data.email,160),safe(data.phone,30),safe(data.device,80),safe(data.notes,1500),'Yes',safe(data.app,100)]);
    return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    console.error(err);
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:'Registration failed'})).setMimeType(ContentService.MimeType.JSON);
  }
}
