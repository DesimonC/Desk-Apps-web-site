const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {handler} = require('../netlify/functions/register-tester');
const valid = {name:'Test Person',email:'contact@example.test',phone:'07123456789',device:'Android phone',deviceModel:'Samsung Galaxy A54',osVersion:'Android 14',country:'United Kingdom',storeEmail:'play@example.test',app:'Poker Compass',notes:'Available evenings',consent:true};
process.env.TESTER_SCRIPT_URL='https://example.test/registration';
process.env.REGISTRATION_SECRET='test-only-secret';
const submit = data => handler({httpMethod:'POST',body:JSON.stringify(data)});

test('registration is saved through the unchanged Apps Script contract with every required detail', async()=>{
  const rows=[];
  const context={PropertiesService:{getScriptProperties:()=>({getProperty:()=>process.env.REGISTRATION_SECRET})},SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:name=>{assert.equal(name,'Testers');return {appendRow:row=>rows.push(row)}}})},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this}})},console};
  vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../docs/tester-apps-script.gs'),'utf8'),context);
  global.fetch=async(url,options)=>{assert.equal(url,process.env.TESTER_SCRIPT_URL);const saved=context.doPost({postData:{contents:options.body}});return {ok:true,json:async()=>JSON.parse(saved.text)}};
  assert.equal((await submit(valid)).statusCode,200);
  assert.equal(rows.length,1);assert.equal(rows[0].length,8);
  assert.equal(rows[0][1],valid.name);assert.equal(rows[0][2],valid.email);assert.equal(rows[0][3],valid.phone);assert.equal(rows[0][4],valid.deviceModel);assert.equal(rows[0][6],'Yes');assert.equal(rows[0][7],valid.app);
  for(const key of ['device','deviceModel','osVersion','country','storeEmail','notes']) assert.ok(rows[0][5].includes(valid[key]),key);
  assert.ok(rows[0][5].includes('Consent:'));assert.ok(!rows[0].join(' ').includes(process.env.REGISTRATION_SECRET));
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
