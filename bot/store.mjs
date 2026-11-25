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
 adminDirectory(section,offset,limit){
  const users = "SELECT DISTINCT CAST(substr(key,6,instr(substr(key,6),':')-1) AS INTEGER) AS id FROM state WHERE key GLOB 'user:*:*' ORDER BY id LIMIT ? OFFSET ?";
  const groups = "SELECT CAST(substr(key,7,length(key)-11) AS INTEGER) AS id, (value='true') AS enabled FROM state WHERE key GLOB 'group:*:auto' ORDER BY id LIMIT ? OFFSET ?";
  return this.db.prepare(section==='users'?users:groups).all(limit,offset);
 }
 adminStats(){
  return this.db.prepare(`SELECT
   COUNT(DISTINCT CASE WHEN key GLOB 'user:*:*' THEN substr(key,6,instr(substr(key,6),':')-1) END) AS users,
   COUNT(CASE WHEN key GLOB 'group:*:auto' THEN 1 END) AS groups,
   COUNT(CASE WHEN key GLOB 'session:*' THEN 1 END) AS sessions,
   COALESCE(SUM(CASE WHEN key GLOB 'user:*:watches' THEN json_array_length(value) END),0) AS watches
   FROM state`).get();
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
