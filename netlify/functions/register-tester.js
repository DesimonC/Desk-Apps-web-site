const reply = (statusCode, data) => ({statusCode, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}, body: JSON.stringify(data)});
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const devices = ['Android phone', 'Android tablet', 'iPhone', 'iPad', 'Windows laptop/PC', 'Mac', 'Chromebook', 'Other'];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return reply(405, {ok:false,error:'Method not allowed'});
  if ((event.body || '').length > 10000) return reply(413, {ok:false,error:'Message too large'});
  let data;
  try { data = JSON.parse(event.body || '{}'); } catch { return reply(400, {ok:false,error:'Invalid registration data'}); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return reply(400, {ok:false,error:'Invalid registration data'});
  const limits = {name:80,email:160,phone:30,device:80,deviceModel:80,osVersion:60,country:60,storeEmail:160,app:100,notes:700};
  const clean = {};
  for (const [key, max] of Object.entries(limits)) {
    if (data[key] !== undefined && typeof data[key] !== 'string') return reply(400, {ok:false,error:'Invalid registration data'});
    clean[key] = (data[key] || '').trim();
    if (clean[key].length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(clean[key])) return reply(400, {ok:false,error:'Please check the length and format of your details'});
  }
  const needsStore = clean.device.startsWith('Android') || ['iPhone','iPad','Mac'].includes(clean.device);
  if (data.consent !== true || !['name','email','phone','device','deviceModel','osVersion','country','app'].every(key=>clean[key]) || !devices.includes(clean.device) || !emailPattern.test(clean.email) || (needsStore && !emailPattern.test(clean.storeEmail))) return reply(400, {ok:false,error:'Please complete all required fields, including your store invitation email where shown'});
  const endpoint = process.env.TESTER_SCRIPT_URL;
  const secret = process.env.REGISTRATION_SECRET;
  if (!endpoint || !secret) return reply(503, {ok:false,error:'Registration is not configured yet'});
  // Preserve the existing eight-column Apps Script contract. All added details
  // are included in Notes so the current deployed script saves them immediately.
  const notes = [
    'Source: DesK Apps website',
    `Device type: ${clean.device}`,
    `Device model: ${clean.deviceModel}`,
    `Operating system: ${clean.osVersion}`,
    `Country: ${clean.country}`,
    `Store invitation email: ${needsStore ? clean.storeEmail : 'Not applicable'}`,
    'Consent: store registration and contact about app testing (website v2)',
    `Additional notes: ${clean.notes || 'None'}`
  ].join('\n');
  // The existing Apps Script limits Notes to 1500 characters; reject instead of
  // silently losing the end of a tester's notes.
  if (notes.length > 1500) return reply(400, {ok:false,error:'Please shorten your additional notes so all registration details can be saved'});
  const payload = {name:clean.name,email:clean.email,phone:clean.phone,device:clean.deviceModel,app:clean.app,notes,consent:true,secret};
  try {
    const response = await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),redirect:'follow',signal:AbortSignal.timeout(20000)});
    const result = await response.json();
    if (!response.ok || result.ok !== true) throw new Error('Registration not confirmed');
    return reply(200, {ok:true});
  } catch {
    // Never log the payload, secret or personal details.
    console.error('Tester registration could not be confirmed');
    return reply(502, {ok:false,error:'Registration service unavailable. Please try later.'});
  }
};
