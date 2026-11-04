const APP_ORIGIN='http://127.0.0.1:19237';
function appOrigin(value){try{return new URL(value).origin===APP_ORIGIN}catch{return false}}
function allowLocalRequest(headers){return headers.host==='127.0.0.1:19237'&&(!headers.origin||headers.origin===APP_ORIGIN)&&(!headers['sec-fetch-site']||['same-origin','none'].includes(headers['sec-fetch-site']));}
function trustedIPC(event,contents){return event.sender===contents&&event.senderFrame===contents.mainFrame&&appOrigin(event.senderFrame?.url);}
function allowPermission(contents,expected,permission,origin){return contents===expected&&appOrigin(origin)&&['notifications','fullscreen','clipboard-sanitized-write'].includes(permission);}
function externalURL(value){try{if(/[\\\u0000-\u0020]/.test(value))return null;const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null}catch{return null}}
module.exports={APP_ORIGIN,appOrigin,allowLocalRequest,trustedIPC,allowPermission,externalURL};
