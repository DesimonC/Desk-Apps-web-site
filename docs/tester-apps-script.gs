// Replace Code.gs in the script bound to the Testers spreadsheet, then save
// and deploy a NEW VERSION of the existing web-app deployment.
// Keep REGISTRATION_SECRET unchanged (it must match Netlify).
var TESTER_HEADERS = ['Registration timestamp','Name','Email address','Phone number','Device type','Device make and model','Operating system and version','Country','Store invitation email','App to test','Additional notes','Consent'];

function registrationReply(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock;
  try {
    if (!e || !e.postData || !e.postData.contents) return registrationReply({ok:false,error:'Submit the website form to register. Do not run doPost in the editor.'});
    var data = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('REGISTRATION_SECRET');
    if (!data || typeof data !== 'object' || Array.isArray(data) || !secret || data.secret !== secret) throw new Error('Unauthorized');

    // Accept the previous website payload during deployment.
    var legacyNotes = typeof data.notes === 'string' ? data.notes : '';
    function legacyField(label) {
      var prefix = label + ': ';
      var lines = legacyNotes.split('\n');
      for (var i = 0; i < lines.length; i++) if (lines[i].indexOf(prefix) === 0) return lines[i].slice(prefix.length);
      return '';
    }
    var modern = data.registrationVersion === 3;
    var notesMarker = 'Additional notes: ';
    var notesIndex = legacyNotes.indexOf('\n' + notesMarker);
    var values = {
      name:data.name, email:data.email, phone:data.phone,
      deviceType:modern ? data.deviceType : legacyField('Device type'),
      deviceModel:modern ? data.deviceModel : data.device,
      osVersion:modern ? data.osVersion : legacyField('Operating system'),
      country:modern ? data.country : legacyField('Country'),
      storeEmail:modern ? data.storeEmail : legacyField('Store invitation email'),
      app:data.app,
      additionalNotes:modern ? data.additionalNotes : (notesIndex >= 0 ? legacyNotes.slice(notesIndex + 1 + notesMarker.length) : legacyNotes)
    };
    var limits = {name:80,email:160,phone:30,deviceType:80,deviceModel:80,osVersion:60,country:60,storeEmail:160,app:100,additionalNotes:700};
    Object.keys(limits).forEach(function(key) {
      if (typeof values[key] !== 'string') throw new Error('Invalid field');
      values[key] = values[key].trim();
      if (values[key].length > limits[key] || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(values[key])) throw new Error('Invalid field');
    });
    var devices = ['Android phone','Android tablet','iPhone','iPad','Windows laptop/PC','Mac','Chromebook','Other'];
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var needsStore = values.deviceType.indexOf('Android') === 0 || ['iPhone','iPad','Mac'].indexOf(values.deviceType) >= 0;
    if (data.consent !== true || devices.indexOf(values.deviceType) < 0 || !emailPattern.test(values.email)) throw new Error('Invalid registration');
    ['name','phone','deviceModel','osVersion','country','app'].forEach(function(key) { if (!values[key]) throw new Error('Missing field'); });
    if (needsStore && !emailPattern.test(values.storeEmail)) throw new Error('Missing store email');
    if (!needsStore) values.storeEmail = '';

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Testers2');
    if (!sheet) throw new Error('Missing destination');
    lock = LockService.getScriptLock();
    lock.waitLock(10000);
    var headers = sheet.getRange(1,1,1,TESTER_HEADERS.length).getValues()[0];
    if (headers.some(function(value,index) { return value !== TESTER_HEADERS[index]; })) throw new Error('Unexpected headings');
    function safe(value) {
      return /^[=+@\-]/.test(value) ? "'" + value : value;
    }
    sheet.appendRow([new Date(),safe(values.name),safe(values.email),safe(values.phone),safe(values.deviceType),safe(values.deviceModel),safe(values.osVersion),safe(values.country),safe(values.storeEmail),safe(values.app),safe(values.additionalNotes),'Yes']);
    SpreadsheetApp.flush();
    return registrationReply({ok:true,sheet:'Testers2',registrationVersion:3});
  } catch (err) {
    // Do not log registration details, payloads or secrets.
    console.error('Tester registration could not be saved');
    return registrationReply({ok:false,error:'Registration failed'});
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

