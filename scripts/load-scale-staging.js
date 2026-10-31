// k6: run against a dedicated staging deployment with synthetic accounts only.
// Never accepts ricomates.si or an unrestricted production target.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const base = (__ENV.STAGING_ORIGIN || '').replace(/\/$/, '');
if (!/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(base) && !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base)) throw new Error('Use an explicit staging vercel.app or localhost origin');
if (__ENV.CONFIRM_ISOLATED_STAGING !== 'yes') throw new Error('Confirm this deployment uses a separate fixture database and disabled paid providers');
const identities = new SharedArray('synthetic accounts', () => JSON.parse(open(__ENV.STAGING_IDENTITIES_FILE)));
const vus = Math.min(100, Math.max(1, Number(__ENV.STAGING_VUS || 10)));
if (identities.length < vus || identities.some(i => !i.userId || !i.cookie)) throw new Error('Provide a unique staging userId and Clerk cookie for each virtual user');
export const options = {
  stages: [{ duration: '30s', target: vus }, { duration: '2m', target: vus }, { duration: '30s', target: 0 }],
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<500','p(99)<1500'], checks: ['rate>0.99'] },
};
export default function () {
  const account=identities[(__VU-1)%identities.length];
  const headers={Cookie:account.cookie};
  const response=http.get(`${base}/api/social?userId=${encodeURIComponent(account.userId)}&filter=all`,{headers,tags:{endpoint:'social-feed'}});
  const data=response.status===200?response.json():null;
  check(response,{'feed loads':r=>r.status===200,'page is bounded':()=>Array.isArray(data?.posts)&&data.posts.length<=12});
  if (data?.nextCursor) {
    const next=http.get(`${base}/api/social?userId=${encodeURIComponent(account.userId)}&filter=all&cursor=${encodeURIComponent(data.nextCursor)}`,{headers,tags:{endpoint:'social-next-page'}});
    check(next,{'cursor loads':r=>r.status===200});
  }
  sleep(2+Math.random()*2);
}
