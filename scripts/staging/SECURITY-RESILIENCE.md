# Free local security and resilience checks

These tests use the `ricomates-staging` Docker Compose project, an internal-only
network, synthetic identities and records, and disabled AI providers. They do not
load test ricomates.si. Docker Desktop must be running.

From the repository directory, with Node 24 and Docker on PATH:

```powershell
npm test
node scripts/staging/verify-private-tables.cjs
node scripts/staging/verify-social-lookup.cjs
docker compose -f scripts/staging/compose.yaml restart app
docker compose -f scripts/staging/compose.yaml exec -T app node /app/scripts/staging/verify.cjs
$env:STAGING_DURATION='300s'
node scripts/staging/run-load.cjs 100
node scripts/staging/verify-recovery.cjs
docker compose -f scripts/staging/compose.yaml stop app rest db
```

For a fresh local database run `npm run test:staging:setup` first. Existing data
volumes are retained when services stop. The permission check reproduces legacy
public-read policies inside a transaction and rolls back all test schema changes.
The social lookup check applies its idempotent local migration and rolls back
its synthetic save records. Its before/after timings compare the *currently*
installed function, so repeat runs no longer measure the original baseline.

The recovery drill stops only local PostgREST, checks that 100 requests fail
closed, then restarts it in a finally block. Twenty subsequent requests must
succeed without restarting the application. Do not run it during a load test.

The database gate permits eight running requests and sixteen queued requests
per Node process. Queue waits are capped at two seconds and running database
requests at fifteen seconds. Five capacity/transport failures open a five-second
circuit, after which only one recovery probe runs. Writes are never retried.
These limits complement shared SQL rate limits; they are not a distributed
connection pool or a guarantee of hosted capacity.

Production migrations are separate reviewed operations. The private-table
migration revokes direct browser access to legacy tables, preserves server
access, and changes no customer records. The social lookup migration adds
partial indexes and replaces a server-only function. Do not run the fixture
scripts against production or copy production credentials into this harness.

Known limits: local synthetic authentication does not test Clerk infrastructure;
free-tier quotas, object storage throughput, paid AI/voice/meeting providers,
multi-region traffic and full offsite disaster recovery need separate evidence.
The five-minute test is a bounded soak, not a multi-day endurance test.
