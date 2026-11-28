# feat: unify civic authentication, database integrity, and DAO governance

Consolidates Supabase session authentication, wallet challenge/linking, sourced legislation, civic proposals/voting, and the modular database schema. Adds GovernorStorage, AppConfig, four-role testnet distribution, and the DAO reader/UI, including Next.js route-export fixes.

Supersedes the older implementation bundle in PR #22 once this branch passes Forgejo CI and Hermes review. This draft is local; it is not an opened GitHub PR.

Validation at 28c73e8: lint/typecheck, 127 web tests, 181 contract tests, 31 disposable PostgreSQL tests, and Next.js production build passed. Dedicated Supabase UTP project provisioned and all eight migrations applied with catalog read-back. Application environment wiring and live browser acceptance remain pending. Rootstock testnet deployment remains blocked on funded keys and distinct role addresses. No private-voting or quantum-security completion claim.
