import http from 'k6/http';
import {check,sleep,fail} from 'k6';
const vus=Number(__ENV.STAGING_VUS||10);
if(!Number.isInteger(vus)||vus<1||vus>100)throw Error('Bounded local test requires 1–100 users');
const base='http://app:3380'; // Compose-internal DNS; never configurable to production.
export const options={stages:[{duration:'10s',target:vus},{duration:__ENV.STAGING_DURATION||'90s',target:vus},{duration:'10s',target:0}],thresholds:{http_req_failed:['rate<0.01'],http_req_duration:['p(95)<500','p(99)<1500'],checks:['rate>0.99']},summaryTrendStats:['avg','min','med','max','p(95)','p(99)'],discardResponseBodies:false};
export function setup(){const r=http.get(base+'/__staging');if(r.status!==200||r.json().isolated!==true||r.json().providersDisabled!==true)fail('Isolation handshake failed');}
export default function(){
 const user='fixture-user-'+__VU,headers={Cookie:'staging_user='+user,'Content-Type':'application/json'};
 const r=http.get(base+'/api/social?userId='+user+'&filter=all',{headers,tags:{endpoint:'feed'}});
 const data=r.status===200?r.json():{};
 check(r,{'feed loads':x=>x.status===200,'feed bounded':()=>Array.isArray(data.posts)&&data.posts.length<=12});
 if(data.nextCursor){const next=http.get(base+'/api/social?userId='+user+'&cursor='+encodeURIComponent(data.nextCursor),{headers,tags:{endpoint:'cursor'}});check(next,{'next page loads':x=>x.status===200,'cursor advances':x=>x.status===200&&!x.json().posts.some(p=>data.posts.some(old=>old.id===p.id))});}
 if(data.posts?.length&&__ITER%3===0){const post=data.posts[__VU%data.posts.length];const action=__ITER%2===0?'like':'save';const result=http.post(base+'/api/social',JSON.stringify({userId:user,action,postId:post.id,liked:true,saved:true}),{headers,tags:{endpoint:'write'}});check(result,{'write loads':x=>x.status===200});}
 if(__ITER%5===0){const stories=http.get(base+'/api/social?userId='+user+'&view=stories',{headers,tags:{endpoint:'stories'}});check(stories,{'stories load':x=>x.status===200});}
 sleep(3+Math.random()*2);
}
export function handleSummary(data){return{['/results/load-'+vus+'.json']:JSON.stringify(data,null,2),stdout:JSON.stringify({vus,requests:data.metrics.http_reqs.values.count,p95:data.metrics.http_req_duration.values['p(95)'],p99:data.metrics.http_req_duration.values['p(99)'],errorRate:data.metrics.http_req_failed.values.rate,checks:data.metrics.checks.values.rate})+'\n'};}
