const APP_ORIGIN='http://127.0.0.1:19237';
function appOrigin(value,expected=APP_ORIGIN){try{return new URL(value).origin===expected}catch{return false}}
function allowLocalRequest(headers,expected=APP_ORIGIN){return headers.host===new URL(expected).host&&(!headers.origin||headers.origin===expected)&&(!headers['sec-fetch-site']||['same-origin','none'].includes(headers['sec-fetch-site']));}
function trustedIPC(event,contents,expected=APP_ORIGIN){return event.sender===contents&&event.senderFrame===contents.mainFrame&&appOrigin(event.senderFrame?.url,expected);}
function allowPermission(contents,expected,permission,origin,allowedOrigin=APP_ORIGIN){return contents===expected&&appOrigin(origin,allowedOrigin)&&['notifications','fullscreen','clipboard-sanitized-write'].includes(permission);}
function externalURL(value){try{if(/[\\\u0000-\u0020]/.test(value))return null;const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null}catch{return null}}
module.exports={APP_ORIGIN,appOrigin,allowLocalRequest,trustedIPC,allowPermission,externalURL};
