/** Deploy as a NEW standalone certificate web app; execute as owner. */
const PORTAL = Object.freeze({sheetName:'Email Send',headerRow:8,sessionSeconds:600,maxAttempts:5,lockSeconds:600,maxBytes:8*1024*1024});
const PORTAL_HEADERS = ['CertificateId','RecipientName','RecipientEmail','Team','Round','Track','CertificatePath','DataCheck','Issue','Approved','DriveFileId','DriveCheck','FileSHA256'];

function doGet(){return HtmlService.createHtmlOutputFromFile('App').setTitle('TISC 2026 | Certificates').addMetaTag('viewport','width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
function props_(){return PropertiesService.getScriptProperties();}
function enabled_(){return props_().getProperty('PORTAL_ENABLED')==='YES';}
function norm_(v){return String(v||'').normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\s+/g,' ').trim().toLowerCase();}
function hash_(value){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');}
function settings_(){const p=props_(),sheetId=p.getProperty('CERTIFICATE_SHEET_ID'),rootId=p.getProperty('CERTIFICATE_ROOT_ID');if(!sheetId||!rootId)throw new Error('Portal configuration incomplete');return{sheetId,rootId};}
function rows_(){
  const s=SpreadsheetApp.openById(settings_().sheetId).getSheetByName(PORTAL.sheetName);if(!s)throw new Error('Certificate sheet missing');
  const width=s.getLastColumn(),last=s.getLastRow();if(last<PORTAL.headerRow)return[];
  const headers=s.getRange(PORTAL.headerRow,1,1,width).getDisplayValues()[0],index={};
  headers.forEach((h,i)=>{if(h){if(index[h]!==undefined)throw new Error('Duplicate header');index[h]=i;}});
  PORTAL_HEADERS.forEach(h=>{if(index[h]===undefined)throw new Error('Required header missing: '+h);});
  if(last===PORTAL.headerRow)return[];
  const data=s.getRange(PORTAL.headerRow+1,1,last-PORTAL.headerRow,width).getDisplayValues();
  const seen=new Set(),files=new Set();return data.filter(v=>v.some(Boolean)).map(v=>{
    const r={};PORTAL_HEADERS.forEach(h=>r[h]=String(v[index[h]]||'').trim());
    if(!/^TISC26-CERT-\d{4}$/.test(r.CertificateId)||seen.has(r.CertificateId))throw new Error('Duplicate or invalid certificate ID');seen.add(r.CertificateId);
    if(r.DriveFileId){if(files.has(r.DriveFileId))throw new Error('Duplicate file mapping');files.add(r.DriveFileId);}return r;
  });
}
function eligible_(r){return r&&r.DataCheck==='VERIFIED_MAPPING'&&!r.Issue&&r.Approved==='YES'&&r.DriveCheck==='PATH_SIZE_MATCH'&&
  ['RecipientName','RecipientEmail','Team','Round','Track','CertificatePath','DriveFileId'].every(h=>!!r[h])&&/^[a-f0-9]{64}$/i.test(r.FileSHA256)&&!!surname_(r.RecipientName);}
function surname_(name){const parts=String(name||'').trim().split(/\s+/);return parts.length>1?parts[parts.length-1]:'';}
function publicName_(name){const p=String(name).trim().split(/\s+/);return p[0]+' '+surname_(name).charAt(0).toUpperCase()+'.';}
function teamKey_(r){return hash_(JSON.stringify([r.Team,r.Track]));}
function fingerprint_(r){return hash_(JSON.stringify(PORTAL_HEADERS.map(h=>[h,r[h]])));}
function fail_(){return{ok:false,message:'Unable to verify your details or this certificate is not available. Please check your information or contact the organizing team.'};}
function locked_(fn){const l=LockService.getScriptLock();if(!l.tryLock(5000))throw new Error('Busy. Please try again.');try{return fn();}finally{l.releaseLock();}}

function getTeams(){
  if(!enabled_())return[];const byKey=new Map();rows_().filter(eligible_).forEach(r=>byKey.set(teamKey_(r),{id:teamKey_(r),name:r.Team,track:r.Track}));
  return [...byKey.values()].sort((a,b)=>a.name.localeCompare(b.name,'en')||a.track.localeCompare(b.track));
}
function getParticipants(team){
  if(!enabled_()||typeof team!=='string'||!/^[a-f0-9]{64}$/.test(team))return[];
  return rows_().filter(r=>eligible_(r)&&teamKey_(r)===team).map(r=>({id:r.CertificateId,name:publicName_(r.RecipientName)}));
}

function verifyParticipant(team,id,surname){
  if(!enabled_())return fail_();
  return locked_(()=>{
    const validId=typeof id==='string'&&/^TISC26-CERT-\d{4}$/.test(id);
    const throttleKey='certificate_attempt_'+(validId?id:'invalid');
    let counter;try{counter=JSON.parse(props_().getProperty(throttleKey)||'null');}catch(e){counter=null;}
    const now=Date.now();if(!counter||counter.until<=now)counter={count:0,until:now+PORTAL.lockSeconds*1000};
    if(counter.count>=PORTAL.maxAttempts)return fail_();
    const correctShape=validId&&typeof team==='string'&&/^[a-f0-9]{64}$/.test(team)&&typeof surname==='string'&&surname.length<=100&&norm_(surname);
    const matches=correctShape?rows_().filter(r=>r.CertificateId===id&&teamKey_(r)===team&&eligible_(r)):[];
    const person=matches.length===1?matches[0]:null;
    if(!person||norm_(surname_(person.RecipientName))!==norm_(surname)){
      counter.count++;props_().setProperty(throttleKey,JSON.stringify(counter));return fail_();
    }
    props_().deleteProperty(throttleKey);
    const token=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
    const expiresAt=now+PORTAL.sessionSeconds*1000;
    CacheService.getScriptCache().put('certificate_session_'+hash_(token),JSON.stringify({id:person.CertificateId,fingerprint:fingerprint_(person),expiresAt}),PORTAL.sessionSeconds);
    return{ok:true,token,expiresAt,name:person.RecipientName,team:person.Team,track:person.Track,round:person.Round};
  });
}

function session_(token){
  if(!enabled_()||typeof token!=='string'||!/^[a-f0-9]{64}$/i.test(token))return null;
  const raw=CacheService.getScriptCache().get('certificate_session_'+hash_(token));if(!raw)return null;
  let session;try{session=JSON.parse(raw);}catch(e){return null;}
  if(!session||session.expiresAt<=Date.now())return null;
  const found=rows_().filter(r=>r.CertificateId===session.id&&eligible_(r));
  if(found.length!==1||fingerprint_(found[0])!==session.fingerprint)return null;
  return{session,person:found[0]};
}
function onlyParent_(item){const it=item.getParents();if(!it.hasNext())throw new Error('Missing parent');const p=it.next();if(it.hasNext())throw new Error('Ambiguous parent');return p;}
function certificateBlob_(r){
  const file=DriveApp.getFileById(r.DriveFileId);if(file.isTrashed()||file.getMimeType()!=='image/png'||file.getSize()>PORTAL.maxBytes)throw new Error('Unavailable file');
  const p=r.CertificatePath.split('/');if(p.length!==4||p[0]!=='TISC Certificate'||norm_(file.getName())!==norm_(p[3])||norm_(file.getName().replace(/\.png$/i,''))!==norm_(r.RecipientName))throw new Error('Name mismatch');
  const parent=onlyParent_(file),category=onlyParent_(parent),root=onlyParent_(category);
  if(parent.getName()!==p[2]||category.getName()!==p[1]||root.getId()!==settings_().rootId)throw new Error('Path mismatch');
  const rounds={'WINNER':'Winner','FIRST RUNNER-UP':'1st Runner-Up','SECOND RUNNER-UP':'2nd Runner-Up','HONORABLE MENTION':'Honorable','Finalist':'Finalist','Semifinal':'Semi-Final','Qualification':'Qualify','Participant':'Participant'};
  if(rounds[r.Round]!==p[1]||r.Track!=='Track '+p[2].charAt(0))throw new Error('Round/track mismatch');
  const bytes=file.getBlob().getBytes();if(bytes.length>PORTAL.maxBytes||hash_(bytes)!==r.FileSHA256.toLowerCase())throw new Error('Integrity mismatch');
  return{bytes,fileName:file.getName()};
}
function downloadCertificate(token){
  const authorized=session_(token);if(!authorized)return fail_();
  try{
    const key='certificate_download_'+hash_(token),cache=CacheService.getScriptCache();
    const limited=locked_(()=>{const count=Number(cache.get(key)||0);if(count>=5)return true;cache.put(key,String(count+1),PORTAL.sessionSeconds);return false;});
    if(limited)return{ok:false,message:'Download limit reached. Please sign in again.'};
    const file=certificateBlob_(authorized.person);
    if(!session_(token))return fail_();
    return{ok:true,fileName:file.fileName,mimeType:'image/png',base64:Utilities.base64Encode(file.bytes)};
  }catch(e){console.error('Certificate download failed for '+authorized.person.CertificateId);return{ok:false,message:'Your certificate could not be loaded. Please try again or contact the organizing team.'};}
}
function logout(token){if(typeof token==='string'&&/^[a-f0-9]{64}$/i.test(token))CacheService.getScriptCache().remove('certificate_session_'+hash_(token));return{ok:true};}

function owner_(){const active=Session.getActiveUser().getEmail(),effective=Session.getEffectiveUser().getEmail();if(!active||active!==effective)throw new Error('Only the owner can change portal settings in the editor');}
function enablePortal(){owner_();settings_();const available=rows_().filter(eligible_);if(!available.length)throw new Error('No approved certificates');props_().setProperty('PORTAL_ENABLED','YES');console.log('Portal enabled: '+available.length+' certificates');}
function disablePortal(){owner_();props_().deleteProperty('PORTAL_ENABLED');console.log('Portal disabled');}
