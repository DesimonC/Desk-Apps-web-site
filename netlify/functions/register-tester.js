exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return {statusCode:405,body:JSON.stringify({ok:false,error:'Method not allowed'})};
  const endpoint = process.env.TESTER_SCRIPT_URL;
  const secret = process.env.REGISTRATION_SECRET;
  if (!endpoint || !secret) return {statusCode:503,body:JSON.stringify({ok:false,error:'Registration is not configured yet'})};
  try {
    if ((event.body || '').length > 10000) return {statusCode:413,body:JSON.stringify({ok:false,error:'Message too large'})};
    const data = JSON.parse(event.body || '{}');
    const clean = key => String(data[key] || '').trim();
    if (data.consent !== true || !clean('name') || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(clean('email')) || !clean('phone') || !clean('device') || !clean('app')) return {statusCode:400,body:JSON.stringify({ok:false,error:'Please complete all required fields'})};
    const payload = {name:clean('name').slice(0,80),email:clean('email').slice(0,160),phone:clean('phone').slice(0,30),device:clean('device').slice(0,80),app:clean('app').slice(0,100),notes:clean('notes').slice(0,1500),consent:true,secret};
    const response = await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),redirect:'follow'});
    const body = await response.text();
    let result;try{result=JSON.parse(body)}catch{throw new Error('Unexpected registration service response')}
    if (!response.ok || !result.ok) throw new Error('Registration service rejected request');
    return {statusCode:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({ok:true})};
  }catch(error){console.error('Tester registration failed:',error.message);return {statusCode:502,headers:{'Content-Type':'application/json'},body:JSON.stringify({ok:false,error:'Registration service unavailable. Please try later.'})}}
};
