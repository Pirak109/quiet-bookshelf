import test from 'node:test';
import assert from 'node:assert/strict';
import {captionLines,cachedCaption,countKey,countRevision,scanCounts} from '../counts.mjs';

test('caption keeps the first two physical lines separate across line endings',()=>{
 for(const newline of ['\n','\r\n','\r'])assert.deepEqual(captionLines('\uFEFF一行目'+newline+'二行目'+newline+'本文は表示しない'),{first:'一行目',second:'二行目'});
 assert.deepEqual(captionLines('一行目\n\n本文'),{first:'一行目',second:''});
 assert.deepEqual(captionLines('\n二行目'),{first:'',second:'二行目'});
 assert.deepEqual(captionLines(''),{first:'',second:''});
 assert.deepEqual(captionLines('一行だけ'),{first:'一行だけ',second:''});
});

test('old one-line cache is refreshed, without resetting count or reading state',async()=>{
 const book={id:'fixture',driveId:'drive',eTag:'same-file',size:20},encoding='auto';
 const cache={[countKey(book)]:{revision:countRevision(book,encoding),count:20,caption:'古い一行'}};
 assert.equal(cachedCaption(cache,book,encoding),null);
 let loads=0;
 const options={cache,encoding,isCurrent:()=>true,load:async()=>{loads++;return '新しい一行\r\n二行目\r\n本文';},onResult:(_,error)=>assert.equal(error,null)};
 await scanCounts([book],options);
 assert.deepEqual(cachedCaption(cache,book,encoding),{first:'新しい一行',second:'二行目'});
 await scanCounts([book],options);
 assert.equal(loads,1);
});
