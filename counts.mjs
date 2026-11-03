export function characterCount(text){let count=0;for(const character of text)if(!/\s/u.test(character))count++;return count;}
export function firstLine(text){const line=text.replace(/^\uFEFF/u,'').split(/[\r\n]/u,1)[0];const characters=Array.from(line);return characters.length>240?characters.slice(0,240).join('')+'…':line;}
export function countKey(book){return JSON.stringify([book.driveId||'',book.id]);}
export function countRevision(book,encoding){return JSON.stringify([book.eTag||book.lastModifiedDateTime||'',book.size??null,encoding]);}
export function cachedCount(cache,book,encoding){const entry=cache[countKey(book)];return entry?.revision===countRevision(book,encoding)&&Number.isSafeInteger(entry.count)&&entry.count>=0?entry.count:null;}
export function cachedCaption(cache,book,encoding){const entry=cache[countKey(book)];return cachedCount(cache,book,encoding)!==null&&typeof entry.caption==='string'?entry.caption:null;}
export async function scanCounts(books,{cache,encoding,load,isCurrent,onResult}){
 const queue=books.filter(book=>cachedCount(cache,book,encoding)===null||cachedCaption(cache,book,encoding)===null);
 async function worker(){while(isCurrent()&&queue.length){const book=queue.shift();try{const text=await load(book);if(!isCurrent())return;cache[countKey(book)]={revision:countRevision(book,encoding),count:characterCount(text),caption:firstLine(text)};onResult(book,null);}catch(error){if(isCurrent())onResult(book,error);}}}
 await Promise.all([worker(),worker()]);
}
