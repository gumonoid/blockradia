import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

export class BotStore{
 constructor(path){
  if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});
  this.db=new DatabaseSync(path);
  this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  this.read=this.db.prepare('SELECT value FROM state WHERE key=?');
  this.write=this.db.prepare('INSERT INTO state(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  this.remove=this.db.prepare('DELETE FROM state WHERE key=?');
 }
 get(key,fallback=null){
  const row=this.read.get(key);
  return row?JSON.parse(row.value):fallback;
 }
 set(key,value){this.write.run(key,JSON.stringify(value));}
 delete(key){this.remove.run(key);}
 entries(prefix){
  return this.db.prepare('SELECT key,value FROM state WHERE substr(key,1,?)=?').all(prefix.length,prefix).map(row=>[row.key,JSON.parse(row.value)]);
 }
 watches(){
  return this.db.prepare("SELECT key,value FROM state WHERE key GLOB 'user:*:watches'").all().map(row=>[row.key,JSON.parse(row.value)]);
 }
 pruneSessions(now){
  this.db.prepare("DELETE FROM state WHERE key LIKE 'session:%' AND json_extract(value,'$.created') < ?").run(now-86400000);
  this.db.exec("DELETE FROM state WHERE key LIKE 'session:%' AND rowid NOT IN (SELECT rowid FROM state WHERE key LIKE 'session:%' ORDER BY rowid DESC LIMIT 200)");
 }
 deleteUserSessions(owner){
  this.db.prepare("DELETE FROM state WHERE key LIKE 'session:%' AND json_extract(value,'$.owner') = ?").run(owner);
 }
 close(){this.db.close();}
}
