const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {handler} = require('../netlify/functions/register-tester');
const valid = {name:'Test Person',email:'contact@example.test',phone:'07123456789',device:'Android phone',deviceModel:'Samsung Galaxy A54',osVersion:'Android 14',country:'United Kingdom',storeEmail:'play@example.test',app:'Poker Compass',notes:'Available evenings',consent:true};
process.env.TESTER_SCRIPT_URL='https://example.test/registration';
process.env.REGISTRATION_SECRET='test-only-secret';
const submit = data => handler({httpMethod:'POST',body:JSON.stringify(data)});

test('registration saves every field in the matching Testers2 column', async()=>{
  const rows=[];
  const context={LockService:{getScriptLock:()=>({waitLock(){},hasLock:()=>true,releaseLock(){}})},PropertiesService:{getScriptProperties:()=>({getProperty:()=>process.env.REGISTRATION_SECRET})},SpreadsheetApp:{flush(){},getActiveSpreadsheet:()=>({getSheetByName:name=>{assert.equal(name,'Testers2');return {getRange:()=>({getValues:()=>[Array.from(context.TESTER_HEADERS)]}),appendRow:row=>rows.push(row)}}})},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this}})},console};
  vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../docs/tester-apps-script.gs'),'utf8'),context);
  global.fetch=async(url,options)=>{assert.equal(url,process.env.TESTER_SCRIPT_URL);const saved=context.doPost({postData:{contents:options.body}});return {ok:true,json:async()=>JSON.parse(saved.text)}};
  assert.equal((await submit(valid)).statusCode,200);
  assert.equal(rows.length,1);assert.equal(rows[0].length,12);
  assert.deepEqual(Array.from(rows[0]).slice(1),[valid.name,valid.email,valid.phone,valid.device,valid.deviceModel,valid.osVersion,valid.country,valid.storeEmail,valid.app,valid.notes,'Yes']);
  assert.ok(!rows[0].join(' ').includes(process.env.REGISTRATION_SECRET));
  const rawFetch=global.fetch;
  global.fetch=async(url,options)=>{const payload=JSON.parse(options.body);for(const key of ['registrationVersion','deviceType','deviceModel','osVersion','country','storeEmail','additionalNotes'])delete payload[key];return rawFetch(url,{...options,body:JSON.stringify(payload)})};
  assert.equal((await submit(valid)).statusCode,200);
  assert.deepEqual(Array.from(rows[1]).slice(1),Array.from(rows[0]).slice(1));
  assert.equal(JSON.parse(context.doPost().text).ok,false);
  assert.equal(JSON.parse(context.doPost({postData:{contents:'{'}}).text).ok,false);
  global.fetch=rawFetch;
  assert.equal((await submit({...valid,phone:'+44123456789',notes:'=IMPORTXML("bad")'})).statusCode,200);
  assert.equal(rows[2][3],"'+44123456789");assert.equal(rows[2][10],"'=IMPORTXML(\"bad\")");
  assert.equal((await submit({...valid,device:'Chromebook',storeEmail:''})).statusCode,200);
  assert.equal(rows[3][8],'');
  const post = payload => JSON.parse(context.doPost({postData:{contents:JSON.stringify(payload)}}).text);
  const modern = {...valid,registrationVersion:3,deviceType:valid.device,additionalNotes:valid.notes,secret:process.env.REGISTRATION_SECRET};
  for (const bad of [{...modern,secret:'wrong'},{...modern,consent:false},{...modern,deviceType:'unknown'},{...modern,storeEmail:''}]) assert.equal(post(bad).ok,false);
  assert.equal(rows.length,4);
  const getSheet=context.SpreadsheetApp.getActiveSpreadsheet;
  context.SpreadsheetApp.getActiveSpreadsheet=()=>({getSheetByName:()=>({getRange:()=>({getValues:()=>[['Wrong headings']]}),appendRow(){throw Error('must not write')}})});
  assert.equal(post(modern).ok,false);
  context.SpreadsheetApp.getActiveSpreadsheet=getSheet;

});
test('required fields, consent, types and store email are validated before storage',async()=>{
  global.fetch=async()=>{throw Error('must not send invalid data')};
  for(const key of ['name','email','phone','device','deviceModel','osVersion','country','app','storeEmail'])assert.equal((await submit({...valid,[key]:''})).statusCode,400,key);
  for(const data of [{...valid,consent:false},{...valid,email:'invalid'},{...valid,storeEmail:'invalid'},{...valid,deviceModel:{}},{...valid,notes:'x'.repeat(1501)},null,[]])assert.equal((await submit(data)).statusCode,400);
  assert.equal((await handler({httpMethod:'POST',body:'{'})).statusCode,400);
  assert.equal((await handler({httpMethod:'GET'})).statusCode,405);
});
test('desktop registration does not require a store email',async()=>{
  global.fetch=async()=>({ok:true,json:async()=>({ok:true})});
  assert.equal((await submit({...valid,device:'Chromebook',storeEmail:''})).statusCode,200);
});
test('upstream failure or non-boolean acknowledgement never reports success',async()=>{
  for(const result of [{ok:false},{ok:'true'},{}]){
    global.fetch=async()=>({ok:true,json:async()=>result});assert.equal((await submit(valid)).statusCode,502);
  }
  global.fetch=async()=>{throw Error('network unavailable')};assert.equal((await submit(valid)).statusCode,502);
});

