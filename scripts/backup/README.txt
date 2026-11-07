Ricomates local encrypted backups

Run run-encrypted.ps1 with a local ConfigPath outside the repository. The collector
reads a consistent server-only snapshot of application records and social counters,
downloads the private social photos named by that snapshot, and includes migration
source. It does not write plaintext customer data or credentials to disk.

setup-local-key.ps1 accepts the existing Supabase service_role key in a hidden
prompt and protects it with Windows DPAPI. Only the same Windows user profile can
decrypt the key and backups. Preserve that profile; these copies cannot recover
from loss of this PC. Do not commit config files, keys, receipts or backups.

Snapshots are encrypted, round-trip verified and written atomically. Fourteen
verified successful snapshots are retained. A failed run leaves earlier backups
intact. The collector stops above 64 MiB rather than producing a partial success.
A photo removed during collection causes the run to fail and retain earlier copies.

verify-encrypted.ps1 decrypts in memory and checks the archive and every photo hash.
Restore into an isolated project first, using the schema/migrations in the archive.
Never automatically restore over production. Schema/settings, Clerk identities,
external voice provider assets and PC meeting models need separate recovery plans.
Transient database limits/leases are deliberately excluded.

The local scheduling mechanism and status are recorded in the task report. The PC
must be available, and the scheduler plus Windows user session must be running.
No paid AI or image service is called by backup scripts.

Lint migration: Oxlint replaces the legacy ESLint plugin dependency tree. React
hooks, JSX structural errors, key Next.js rules and unsafe eval are blocking checks.
Other correctness checks are warnings, including newly introduced React Compiler
rules: this application does not use React Compiler. Next's duplicate-document-Head
rule applies only to pages/_document.js, matching its upstream purpose. Existing
page-level conditional next/head components are valid. Lint warnings remain visible;
zero dependency advisories is not a claim that every code-quality warning is fixed.
