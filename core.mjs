export function titleOf(item){return item.name.replace(/\.txt$/i,'');}
export function txtFiles(items){return items.filter(x=>x.file&&/\.txt$/i.test(x.name));}
export function normalizeSort(order){return ['favorites','favorites-unread'].includes(order)?'rating-desc':['name','added','modified','rating-desc','rating-asc','author','finished-last'].includes(order)?order:'name';}
export function sorted(items,order,{progress={},isFavorite=()=>false,getRating=book=>isFavorite(book)?5:0,getAuthor=()=>''}={}){
 order=normalizeSort(order);
 const byName=(a,b)=>a.name.localeCompare(b.name,'ja',{numeric:true});
 const finished=book=>(progress[book.id]?.ratio??0)>=.995;
 return [...items].sort((a,b)=>{
  if(order==='finished-last'){
   const rank=Number(finished(a))-Number(finished(b));if(rank)return rank;
  }
  if(order==='rating-desc'||order==='rating-asc'){
   const left=getRating(a)||0,right=getRating(b)||0;
   const unrated=Number(left===0)-Number(right===0);if(unrated)return unrated;
   const rank=order==='rating-desc'?right-left:left-right;if(rank)return rank;
  }
  if(order==='author'){
   const left=String(getAuthor(a)||'').trim(),right=String(getAuthor(b)||'').trim();
   const missing=Number(!left)-Number(!right);if(missing)return missing;
   const rank=left.localeCompare(right,'ja',{numeric:true});if(rank)return rank;
  }
  if(order==='added'||order==='modified'){
   const field=order==='added'?'createdDateTime':'lastModifiedDateTime';
   const rank=(Date.parse(b[field])||0)-(Date.parse(a[field])||0);if(rank)return rank;
  }
  return byName(a,b);
 });
}
export function decodeText(buffer,encoding='auto'){const b=new Uint8Array(buffer);if(encoding!=='auto')return new TextDecoder(encoding).decode(b);if(b[0]===255&&b[1]===254)return new TextDecoder('utf-16le').decode(b);if(b[0]===254&&b[1]===255)return new TextDecoder('utf-16be').decode(b);try{return new TextDecoder('utf-8',{fatal:true}).decode(b);}catch{return new TextDecoder('shift_jis').decode(b);}}
export function ratio(scroll,height,viewport){return height<=viewport?1:Math.max(0,Math.min(1,scroll/(height-viewport)));}
export async function allPages(first,request){const items=[];let next=first;const seen=new Set();while(next){if(seen.has(next))throw Error('フォルダ一覧の取得を再試行してください。');seen.add(next);const page=await request(next);if(!Array.isArray(page.value))throw Error('フォルダ一覧を取得できませんでした。');items.push(...page.value);next=page['@odata.nextLink'];}return items;}
