import test from 'node:test';
import assert from 'node:assert/strict';
import {ratingValue} from '../ratings.mjs';
import {sorted,normalizeSort} from '../core.mjs';
import {createBackup,importBackup,validateBackup,backupSummary} from '../backup.mjs';

class Storage{
 constructor(entries={}){this.map=new Map(Object.entries(entries).map(([key,value])=>[key,JSON.stringify(value)]));}
 get length(){return this.map.size;} key(i){return Array.from(this.map.keys())[i];}
 getItem(key){return this.map.get(key)??null;} setItem(key,value){this.map.set(key,value);} removeItem(key){this.map.delete(key);}
}
const key=id=>JSON.stringify(['drive',id]);
test('legacy favorites become five stars and explicit zero overrides them',()=>{
 assert.equal(ratingValue(true),5);
 for(const n of [0,1,2,3,4,5])assert.equal(ratingValue(n),n);
 for(const value of [false,null,undefined,6,-1,2.5,'5'])assert.equal(ratingValue(value),0);
 assert.equal(normalizeSort('favorites'),'rating-desc');
 assert.equal(normalizeSort('favorites-unread'),'rating-desc');
});
test('rating sort is numeric, ties use title and unrated books remain last',()=>{
 const books=['4','2','3','1'].map(id=>({id,name:id+'.txt'})),ratings={'1':5,'2':3,'3':0,'4':3};
 const getRating=book=>ratings[book.id];
 assert.deepEqual(sorted(books,'rating-desc',{getRating}).map(b=>b.id),['1','2','4','3']);
 assert.deepEqual(sorted(books,'rating-asc',{getRating}).map(b=>b.id),['2','4','1','3']);
});
test('author sort groups the literal first-line author and updates when metadata arrives',()=>{
 const books=['4','2','3','1'].map(id=>({id,name:id+'.txt'})),authors={'1':'同じ作者','2':'同じ作者','4':'A作者'};
 const getAuthor=book=>authors[book.id];
 assert.deepEqual(sorted(books,'author',{getAuthor}).map(b=>b.id),['4','1','2','3']);
 authors['3']='A作者';
 assert.deepEqual(sorted(books,'author',{getAuthor}).map(b=>b.id),['3','4','1','2']);
});
test('backup round trip keeps numeric ratings, legacy favorites and reading positions without tokens',()=>{
 const source=new Storage({'qb.account.favorites':{[key('old')]:true,[key('three')]:3,[key('cleared')]:0},'qb.account.progress':{old:{ratio:.4,at:1000}},'qb.sort':'author','msal.private':'secret','qb.account.counts':{text:'private'}});
 const backup=createBackup(source,'https://example.test');
 assert.equal(backup.entries['qb.account.favorites'][key('old')],5);
 assert.equal(backupSummary(backup).favorites,2);
 assert.equal(backup.entries['msal.private'],undefined);
 assert.equal(backup.entries['qb.account.counts'],undefined);
 const destination=new Storage();importBackup(destination,backup);
 assert.equal(JSON.parse(destination.getItem('qb.account.favorites'))[key('three')],3);
 assert.equal(JSON.parse(destination.getItem('qb.account.progress')).old.ratio,.4);
 assert.equal(JSON.parse(destination.getItem('qb.sort')),'author');
});
test('old backups cannot overwrite a current lower rating or cleared rating',()=>{
 const current=new Storage({'qb.account.favorites':{[key('changed')]:2,[key('cleared')]:0}});
 const old={format:'quiet-bookshelf-backup',version:1,entries:{'qb.account.favorites':{[key('changed')]:true,[key('cleared')]:true,[key('other')]:true}}};
 importBackup(current,old);
 assert.deepEqual(JSON.parse(current.getItem('qb.account.favorites')),{[key('changed')]:2,[key('cleared')]:0,[key('other')]:5});
});
test('invalid rating is rejected before importing any state',()=>{
 const current=new Storage({'qb.account.favorites':{[key('good')]:4}}),before=current.getItem('qb.account.favorites');
 const bad={format:'quiet-bookshelf-backup',version:1,entries:{'qb.account.favorites':{[key('bad')]:6}}};
 assert.throws(()=>validateBackup(bad));assert.throws(()=>importBackup(current,bad));
 assert.equal(current.getItem('qb.account.favorites'),before);
});
