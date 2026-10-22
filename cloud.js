/* GitHub Pages storage bridge. Never hard-code a write token. */
(function(root){'use strict';
var TOKEN_KEY='animal_street_gh_token_session';
function token(){try{return sessionStorage.getItem(TOKEN_KEY)||''}catch(e){return ''}}
function setToken(value){try{if(value)sessionStorage.setItem(TOKEN_KEY,String(value).trim());else sessionStorage.removeItem(TOKEN_KEY)}catch(e){}}
function locationRepo(){var host=location.hostname||'',path=location.pathname.split('/').filter(Boolean),owner='',repo='';if(/\.github\.io$/.test(host)){owner=host.split('.')[0];repo=path[0]||owner+'.github.io'}return {owner:owner,repo:repo,branch:'main'}}
var repo=locationRepo();
function setRepo(o){if(!o)return;repo={owner:String(o.owner||repo.owner||'').trim(),repo:String(o.repo||repo.repo||'').trim(),branch:String(o.branch||repo.branch||'main').trim()}}
function getRepo(){return Object.assign({},repo)}
function isConfigured(){return /^[\w.-]+$/.test(repo.owner)&&/^[\w.-]+$/.test(repo.repo)&&/^[\w./-]+$/.test(repo.branch)}
function api(path){return 'https://api.github.com/repos/'+encodeURIComponent(repo.owner)+'/'+encodeURIComponent(repo.repo)+'/contents/'+path.split('/').map(encodeURIComponent).join('/')}
function ghHeaders(){var h={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};if(token())h.Authorization='Bearer '+token();return h}
function decodeBase64Unicode(b64){var binary=atob(b64.replace(/\s/g,'')), bytes=new Uint8Array(binary.length);for(var i=0;i<bytes.length;i++)bytes[i]=binary.charCodeAt(i);return new TextDecoder('utf-8').decode(bytes)}
function encodeBase64Unicode(value){var bytes=new TextEncoder().encode(value),parts=[];for(var i=0;i<bytes.length;i+=8192){parts.push(String.fromCharCode.apply(null,bytes.subarray(i,i+8192)))}return btoa(parts.join(''))}
async function fetchContent(path){if(!isConfigured())throw Error('尚未設定 GitHub 儲存庫');var res=await fetch(api(path)+'?ref='+encodeURIComponent(repo.branch)+'&v='+Date.now(),{headers:ghHeaders(),cache:'no-store'});if(res.status===404)return {exists:false,sha:null,data:null};if(!res.ok)throw Error('GitHub 讀取失敗 HTTP '+res.status);var j=await res.json();return {exists:true,sha:j.sha,data:decodeBase64Unicode(j.content||'')}}
async function readJson(path){var item=await fetchContent(path);return item.exists?JSON.parse(item.data):null}
async function putBase64(path,content,message){if(!token())throw Error('請先輸入具備 Contents 讀寫權限的 GitHub Token');var previous=await fetchContent(path);var body={message:message||'Update '+path,branch:repo.branch,content:content};if(previous.sha)body.sha=previous.sha;var res=await fetch(api(path),{method:'PUT',headers:Object.assign({'Content-Type':'application/json'},ghHeaders()),body:JSON.stringify(body)});if(!res.ok){var j=await res.json().catch(function(){return {}});var detail=(j&&j.message)||res.statusText||'Unknown error';var err=Error('GitHub 寫入失敗 HTTP '+res.status+'：'+detail);err.status=res.status;throw err}return res.json()}
async function putJson(path,data,message){return putBase64(path,encodeBase64Unicode(JSON.stringify(data,null,2)+'\n'),message)}
async function updateJson(path,mutate,message){for(var tryNo=0;tryNo<4;tryNo++){var prev=await fetchContent(path);var current=prev.exists?JSON.parse(prev.data):{};var updated=mutate(current);try{var result=await putBase64WithSha(path,encodeBase64Unicode(JSON.stringify(updated,null,2)+'\n'),message,prev.sha);return {result:result,data:updated}}catch(e){if(e.status!==409&&e.status!==422)throw e;if(tryNo===3)throw Error('有其他人同時修改資料，請重新同步')}}}
async function putBase64WithSha(path,content,message,sha){if(!token())throw Error('缺少 GitHub Token');var body={message:message||'Update '+path,branch:repo.branch,content:content};if(sha)body.sha=sha;var res=await fetch(api(path),{method:'PUT',headers:Object.assign({'Content-Type':'application/json'},ghHeaders()),body:JSON.stringify(body)});if(!res.ok){var err=Error('GitHub 寫入失敗 HTTP '+res.status);err.status=res.status;throw err}return res.json()}
async function loadPagesJson(path){var res=await fetch('./'+path+'?v='+Date.now(),{cache:'no-store'});if(!res.ok)throw Error(path+' 讀取失敗 HTTP '+res.status);return res.json()}
function fileBase64(file){return new Promise(function(resolve,reject){var fr=new FileReader();fr.onload=function(){resolve(String(fr.result).split(',')[1])};fr.onerror=reject;fr.readAsDataURL(file)})}
root.Cloud={token:token,setToken:setToken,setRepo:setRepo,getRepo:getRepo,isConfigured:isConfigured,fetchContent:fetchContent,readJson:readJson,putJson:putJson,updateJson:updateJson,putBase64:putBase64,loadPagesJson:loadPagesJson,fileBase64:fileBase64};
})(window);
