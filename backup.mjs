const FORMAT='quiet-bookshelf-backup';
const GLOBAL=new Set(['qb.clientId','qb.preferences','qb.sort']);
const uuid=/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const safeId=x=>typeof x==='string'&&x.length>0&&x.length<=1024&&!['__proto__','constructor','prototype'].includes(x)&&!/[\u0000-\u001f]/u.test(x);
const fail=()=>{throw Error('本棚のバックアップ形式を確認してください。対応していないデータが含まれています。');};
export function backupKey(key){
 if(GLOBAL.has(key))return {type:key.slice(3)};
 const match=/^qb\.(.{1,300})\.(folder|progress|favorites)$/u.exec(key);
 return match&&safeId(match[1])&&!['demo','none'].includes(match[1])?{account:match[1],type:match[2]}:null;
}
function cleanValue(type,value){
 if(type==='clientId'){if(typeof value!=='string'||!uuid.test(value))fail();return value;}
 if(type==='sort'){if(!['name','added','modified','favorites','finished-last','favorites-unread'].includes(value))fail();return value==='favorites-unread'?'favorites':value;}
 if(type==='preferences'){
  if(!plain(value))fail();const clean=Object.create(null);
  if(value.size!==undefined){if(!Number.isInteger(value.size)||value.size<14||value.size>28)fail();clean.size=value.size;}
  const choices={line:['1.7','2','2.3'],font:['serif','sans'],theme:['paper','white','dark'],encoding:['auto','utf-8','shift_jis','utf-16le','utf-16be']};
  for(const [key,allowed] of Object.entries(choices)){if(value[key]!==undefined){if(!allowed.includes(value[key]))fail();clean[key]=value[key];}}
  return clean;
 }
 if(type==='folder'){
  if(!plain(value)||!safeId(value.id)||!safeId(value.driveId))fail();
  const clean={id:value.id,driveId:value.driveId};
  for(const key of ['name','path'])if(value[key]!==undefined){if(typeof value[key]!=='string'||value[key].length>4096)fail();clean[key]=value[key];}
  return clean;
 }
 if(!plain(value)||Object.keys(value).length>50000)fail();
 const clean=Object.create(null);
 for(const [key,entry] of Object.entries(value)){
  if(!safeId(key))fail();
  if(type==='favorites'){
   let tuple;try{tuple=JSON.parse(key);}catch{fail();}
   if(!Array.isArray(tuple)||tuple.length!==2||typeof tuple[0]!=='string'||!safeId(tuple[1])||typeof entry!=='boolean')fail();
   if(entry)clean[key]=true;
  }else if(type==='progress'){
   if(!plain(entry)||!Number.isFinite(entry.ratio)||entry.ratio<0||entry.ratio>1||!Number.isFinite(entry.at)||entry.at<0)fail();
   clean[key]={ratio:entry.ratio,at:entry.at};
  }else fail();
 }
 return clean;
}
export function validateBackup(value){
 if(!plain(value)||value.format!==FORMAT||value.version!==1||!plain(value.entries)||Object.keys(value.entries).length>500)fail();
 const entries=Object.create(null);
 for(const [key,entry] of Object.entries(value.entries)){const info=backupKey(key);if(!info)fail();entries[key]=cleanValue(info.type,entry);}
 return {format:FORMAT,version:1,createdAt:typeof value.createdAt==='string'?value.createdAt:'',sourceOrigin:typeof value.sourceOrigin==='string'?value.sourceOrigin:'',entries};
}
export function createBackup(storage,sourceOrigin=''){
 const entries=Object.create(null);
 for(let i=0;i<storage.length;i++){const key=storage.key(i);if(!backupKey(key))continue;try{entries[key]=JSON.parse(storage.getItem(key));}catch{fail();}}
 return validateBackup({format:FORMAT,version:1,createdAt:new Date().toISOString(),sourceOrigin,entries});
}
export function backupSummary(backup){
 const result={accounts:0,favorites:0,progress:0};const accounts=new Set();
 for(const [key,value] of Object.entries(backup.entries)){const info=backupKey(key);if(info.account)accounts.add(info.account);if(info.type==='favorites')result.favorites+=Object.keys(value).length;if(info.type==='progress')result.progress+=Object.keys(value).length;}
 result.accounts=accounts.size;return result;
}
export function importBackup(storage,value){
 const backup=validateBackup(value),writes=new Map(),before=new Map();
 for(const [key,incoming] of Object.entries(backup.entries)){
  const info=backupKey(key),old=storage.getItem(key);let current=null;
  if(old!==null){try{current=cleanValue(info.type,JSON.parse(old));}catch{throw Error('現在の保存データを安全に読み取れないため、取り込みを中止しました。');}}
  let merged=incoming;
  if(info.type==='progress'&&current){merged=Object.assign(Object.create(null),current);for(const [id,position] of Object.entries(incoming))if(!merged[id]||position.at>merged[id].at)merged[id]=position;}
  if(info.type==='favorites'&&current)merged=Object.assign(Object.create(null),current,incoming);
  if(['folder','clientId'].includes(info.type)&&current!==null)merged=current;
  before.set(key,old);writes.set(key,JSON.stringify(merged));
 }
 try{for(const [key,value] of writes)storage.setItem(key,value);}catch(error){
  let rollbackFailed=false;for(const [key,value] of before){try{if(value===null)storage.removeItem(key);else storage.setItem(key,value);}catch{rollbackFailed=true;}}
  throw Error(rollbackFailed?'保存容量が足りず取り込みを完了できませんでした。元のバックアップを残してください。':'保存に失敗したため、取り込み前の状態に戻しました。');
 }
 return backupSummary(backup);
}
