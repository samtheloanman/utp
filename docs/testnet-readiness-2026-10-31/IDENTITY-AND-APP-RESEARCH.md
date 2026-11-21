# Wallet-first identity and AI application research

Date: 2026-10-31. User direction: phone, authenticator and camera credential validation in tiers; data stored locally in the user's wallet; AI-first everything-app direction. This updates the product target, not the status of implemented features. No packages, skills or services installed.

## Recommended architecture (proposal)

Keep UTP's civic/DAO application. Add a local encrypted personal vault and credential wallet, then an AI interface with narrow, revocable capabilities. Evaluate native/mobile wallet support before assuming a browser-only implementation can meet key-protection and camera-proofing requirements. A blockchain asset wallet does not automatically provide encrypted document storage or verifiable credentials.

Separate authentication (control of an enrolled authenticator), identity proofing (who an issuer verified), eligibility (jurisdiction/age/membership), and transaction authorization (approval of a particular action). Product tiers below are not NIST assurance-level certifications and are not automatically additive factors.

| Tier | Proposed evidence | Allowed use / limitation |
|---|---|---|
| Guest | None | Search/read public material; local drafts |
| Phone contact | Phone number possession, if SMS/voice used | Low-assurance contact badge/rate controls; not uniqueness, residency or sole high-risk recovery |
| Protected account | WebAuthn/passkey with required user verification; authenticator TOTP as explicitly lower-assurance alternative | Account control; fresh step-up for sensitive operations; device-bound vs synced passkeys disclosed |
| Proofed identity | Camera document capture/authenticity checks plus live holder matching when required by selected proofing method; trusted issuer validates evidence | Signed identity credential in local wallet; selfie alone does not prove identity; independent fallback for accessibility/failures |
| Eligible participant | Issuer-attested, scoped, expiring jurisdiction/age/membership claims and uniqueness policy | Only the specific eligibility established by evidence; not automatically citizenship, voter registration or one-human uniqueness |
| Sensitive action | Appropriate eligible credential plus fresh authenticator confirmation bound to exact action | Binding vote, credential recovery, transfer or admin action according to policy; AI cannot approve for user |

Phone + authenticator + camera on one compromised handset is not three independent trust domains. Camera proofing differs from OS face unlock: device biometrics should activate the authenticator locally; a document/liveness verification process needs its own issuer, retention, injection-attack and false-rejection model. NIST treats PSTN-based out-of-band authentication as restricted and biometrics as part of an authenticator-based multifactor process, not an identity guarantee [S1].

## Local wallet data model

- Local encrypted vault: signed credentials, private drafts, user-selected documents/preferences and private AI memory. Protect encryption keys with platform secure storage where supported; verify target-device behavior rather than promise hardware protection for every key type.
- Asset signing keys, credential keys and vault encryption keys have separate purposes and recovery policies. Passkey authentication does not automatically encrypt the vault or sign Bitcoin transactions.
- Optional user-controlled end-to-end encrypted backup/sync; opt-in metadata disclosure. Test recovery from device loss and corruption. Local-only mode honestly warns that no backup means permanent loss can occur.
- Public data: published legislative requests and intentionally public discussion must be distributed to servers/peers; they cannot remain exclusively local and simultaneously be publicly available.
- Server: minimal necessary public keys, session/abuse state, issuer trust/status information and public content. Do not put raw IDs, face images, phone numbers, private documents or stable cross-service identity hashes on chain.
- Proofing provider may process identity evidence; select and disclose its data flow/retention. Do not promise that all proofing is on-device before verifying it. Prefer short-lived processing and retaining a credential rather than raw images where feasible.
- Present scoped claims through challenge/domain-bound presentations with expiry and revocation checks. Selective disclosure is not automatically unlinkability, ZK voting or post-quantum security. Evaluate exact credential suites and issuer keys against the broader PQ goal.
- Private ballots require a separate issuance/nullifier/tally construction. Authentication session logs, IPs, timestamps and public token addresses must not silently relink the ballot. Contact verification is never the anti-Sybil proof.

## AI permission boundary

AI may search public legislation, query user-approved local documents, explain claims and draft requests. Give it typed operations and minimal results, not unrestricted wallet storage, OTP secrets, recovery material or signing keys. Keep untrusted retrieved text outside the authorization plane.

Signing and credential presentation occur through a wallet-controlled approval surface with the exact recipient/domain, action, disclosed attributes and expiry. Default to local inference for private content; any cloud inference requires explicit data scope and consent. 'Local storage' alone does not mean 'local processing'.

## Projects researched

GitHub API/readme/license checks were performed on 2026-10-31. All six repositories below were non-archived and showed recent pushes; that does not establish quality, security, mobile compatibility or deploy readiness. No runtime evaluations performed. Fit rankings are engineering judgments, not measured results.

| Project | Confirmed scope/license | Potential reuse | Important boundary |
|---|---|---|---|
| [Puter](https://github.com/HeyPuter/puter) | Self-hostable internet-computer/app platform; AI, storage and app SDK; AGPL-3.0 except identified components | Closest broad app-platform reference | Not a proven local credential wallet or Bitcoin/ZK platform; hosted/cloud behavior must be inventoried |
| [Goose](https://github.com/aaif-goose/goose) | Extensible AI agent; Apache-2.0 | Candidate AI execution/tool runtime | Not a consumer identity wallet; evaluate mobile/server boundary and containment |
| [OpenClaw](https://github.com/openclaw/openclaw) | Personal AI assistant across channels/platforms; MIT | Assistant UX and capability patterns | Broad tool access is inappropriate for a wallet without separate capability enforcement |
| [LobeHub](https://github.com/lobehub/lobehub) | Agent workspace; custom Community License | UI/product reference | License requires commercial licensing for developing/distributing commercial derivatives; not an unrestricted open-source fork candidate |
| [Credo](https://github.com/openwallet-foundation/credo-ts) | TypeScript identity framework; Node/React Native; credential/OpenID4VC support; Apache-2.0 | First credential SDK to evaluate because of UTP TypeScript stack | Not an AI app or complete secure wallet UX; exact credential versions and browser compatibility need testing |
| [walt.id](https://github.com/walt-id/waltid-identity) | Identity issuer/holder/verifier toolkit; Apache-2.0 Community Stack | Alternative issuance/verifier service stack | Server wallet deployments do not meet local-custody requirements by default; verify storage architecture |

No reviewed project establishes the entire requested combination of AI app, local credential custody, camera proofing, private voting, Bitcoin L2 and PQ security. Reuse components rather than replacing UTP wholesale. Start with a Credo-based feasibility spike and compare walt.id for issuer/verifier services; evaluate Goose for scoped AI tools. Puter supplies product/platform ideas, not a required migration.

## New acceptance gates before civic testnet sign-off

1. Record accepted issuers, supported credentials, exact tier-to-action rules, privacy policy, recovery rules and mobile/browser target matrix. No 'verified' badge without a defined assertion.
2. Test passkey origin/RP challenge binding, user verification, expired/replayed challenges, TOTP replay/rate controls and session step-up. Phone-only recovery cannot regain higher-tier privileges.
3. Camera proofing: recorded/injected video, document tampering, stolen documents, failed liveness/matching, accessibility fallback and deletion checks. No accuracy/fairness claims without representative evaluation and stated error rates.
4. Present credentials with nonce/audience/holder binding; reject expired, revoked, forged and wrong-jurisdiction claims. Test issuer-key compromise/rotation and unavailable status service under defined fail-closed policy.
5. Vault: offline unlock/read, device theft, logout, browser XSS threat model, backup restore, lost device, corrupted backup and key rotation. Verify no plaintext credentials/keys in logs, telemetry, network traces or AI prompts.
6. AI: malicious document/tool output cannot trigger disclosure, signing, transfer or recovery. User approval binds exact action bytes/attributes; no silent substitution between preview and signature.
7. Test private eligibility proof separately from login; verify no unintended ballot linkage and no double voting after recovery or credential reissuance.
8. Existing conventional passkeys, credential suites and signatures are not labeled post-quantum. Quantum migration must include issuer, holder, recovery and action-signing paths; preserve the separate full-L2 gate.

## Primary references

- S1: https://pages.nist.gov/800-63-4/sp800-63b/authenticators/ — authenticator, biometric and restricted PSTN guidance.
- S2: https://www.w3.org/TR/vc-data-model/ — issuer/holder/verifier model; selecting a data model does not select a secure cryptographic suite.
- S3: Repository links in the comparison table, including current license files.
- S4: https://github.com/lobehub/lobehub/blob/main/LICENSE — commercial derivative restriction checked directly.

## Immediate implementation sequence

After acceptance of the revised spec: define tier/action policy and threat model; synthetic local credential issuance -> encrypted wallet storage -> passkey-authenticated presentation -> eligibility-gated civic action; adversarial tests; only then integrate a camera-proofing provider under separate approval. Keep real ID images out of research artifacts, Brain and general-purpose models. Expand the AI shell after its wallet capabilities are isolated.
