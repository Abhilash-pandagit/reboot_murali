# FraudShield — Positive Flow Test Plan (`positiveflow.md`)

**Audience:** an automated test agent (API and/or browser). Execute flows top-to-bottom; each flow lists Goal, Preconditions, Steps, and Expected assertions.
**Scope:** positive / designed-behavior flows only (happy paths + guards working as designed). No fuzzing or negative-input testing.
**Verified against source:** 2026-07-28.

---

## 0. Environment & Conventions

### 0.1 Base URLs

| Target | URL |
|---|---|
| Backend REST API | `http://localhost:8080` |
| Frontend UI (dev) | `http://localhost:5173` (Docker nginx: `http://localhost:3000`) |
| ML service (Flask) | `http://localhost:5001` |
| WebSocket | `ws://localhost:8080/ws?userId=<ID>` |

### 0.2 Start the stack

Windows: `.\runme.cmd` or `powershell -ExecutionPolicy Bypass -File .\run_all.ps1` — or `docker compose up`. Wait until `GET /health` returns `{"status":"UP"}` and `GET http://localhost:5001/health` returns `"status":"UP"`.

### 0.3 State & reset

- Seeding is idempotent (`SeedRunner`): runs only when the `users` collection is empty. For a pristine run, drop the Mongo `fraudshield` database (or `docker compose down -v`) and restart the backend.
- **Exact-score flows (PF-10…PF-22) assume a fresh seed** and the deterministic setup in PF-09. If re-running without reset, prefer the "loose" assertions noted per flow.
- Flows mutate state (balances, trustedPayees, beneficiaries). Each flow lists its mutations; Appendix A tracks the expected balance ledger for a full sequential run.

### 0.4 Timing rules (critical)

- Block builder runs every **5 s**; commits a block at **5 APPROVED txns** or a **30 s window**. After any approval, wait **up to 40 s** before asserting `COMMITTED` / balance changes.
- The UI consent prompt counts down **15 s** and auto-declines on expiry — respond to consent-modal steps within ~10 s.
- Beneficiary cool-off is **1 h** (skip with `disableCoolOff: true`); Canton hold TTL is **60 min**.

### 0.5 Determinism caveats (read before asserting scores)

1. **OFF_HOURS:** every transaction initiated between **23:00–06:00 Europe/London** gets **+10** points. Run exact-score flows between 06:00–23:00 London, or add +10 to every expected score.
2. **VELOCITY:** a sender's 3rd+ non-rejected txn within 10 minutes adds +15 (5th+ adds +25). Exact-score flows use senders with <3 sends in the prior 10 minutes — respect the stated preconditions or wait 10 minutes.
3. **Isolation Forest** adds 0–30 variable points → PF-09 disables it for the deterministic section; re-enabled in PF-30.
4. **Cortex AI** with the default placeholder key fails gracefully (0 points, `evaluated=false`). PF-09 disables it explicitly; dummy mode is exercised in PF-33.
5. Canton runs **simulated** locally (`canton.enabled=false`): contract refs look like `#hold-…`, `#approval-…`, `#escrow-…`, `#settlement-…`. Under Docker (real Canton) refs are real contract IDs — assert "non-empty" instead of prefix.

### 0.6 Assertion conventions

- `→ 200` means HTTP 200 with JSON body. `body.x = y` are equality assertions; `~` means approximately / non-strict.
- `<TXN>` = the `txnId` returned by the initiate call of that flow. Record every txnId; later flows reference them.
- All amounts are GBP. All initiate calls are `POST /api/txn/initiate` with `Content-Type: application/json`.

---

## SECTION A — Bootstrap & Seed Verification

### PF-01 · Backend liveness & readiness

- **Steps:** `GET /health`; `GET /ready`; `GET /metrics-lite`.
- **Expected:** `/health` → 200, `status="UP"`, `application="FraudShield"`. `/ready` → 200, `status="READY"`, `mongo="UP"` (canton block present; its status is UP/DISABLED-like, not blocking locally). `/metrics-lite` → 200 with counter fields.

### PF-02 · ML service liveness

- **Steps:** `GET http://localhost:5001/health`.
- **Expected:** 200; `status="UP"`, `service` mentions "Isolation Forest", `isTrained=true`, `modelType="scikit-learn IsolationForest"`, `nEstimators=100`, `contamination=0.1`.

### PF-03 · Chatbot service status

- **Steps:** `GET /api/chat/status`.
- **Expected:** 200; `status="UP"`, `model="nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"`, `configured=true`.

### PF-04 · Canton status & config

- **Steps:** `GET /api/canton/status`; `GET /api/canton/config`.
- **Expected:** both 200. `/status` contains `readiness` and `collections` (counts for 10 canton collections). `/config` contains `enabled` (false locally / true in Docker), `realSubmissionEnabled`, `networkStatus`, `globalSynchronizerParty="GlobalSynchronizer_Party"`.

### PF-05 · Seeded users

- **Steps:** `GET /api/users/all`.
- **Expected:** 200; **8 users**. U001 Alice Walker £50,000 · U002 Bob Taylor £75,000 · U003 Carlos Rivera £120,000 · U004 Diana Prince £30,000 · U005 Eve Chen £200,000 · U006 Frank Okafor £15,000 · U007 Grace Okonkwo £60,000 · ADMIN (role `ADMIN`, £0). (Balances exact only on fresh seed.)

### PF-06 · Genesis blocks on all 3 chains

- **Steps:** `GET /api/chain/alpha/block/0`; same for `beta`, `gamma`.
- **Expected:** each → 200; `blockNumber=0`, `previousHash` = 64 zeros, `triggerType="GENESIS"`, `signatures=["alpha","beta","gamma"]`, `consensusVerified=true`, empty `transactions`. **Block hash identical across all three chains.**

### PF-07 · Canton party mappings

- **Steps:** `GET /api/canton/party-mappings`; `GET /api/canton/party-mappings/U001`.
- **Expected:** list has **8 entries**. U001/U002→`BankA`/participant `banka`; U003/U004→`BankB`; U005/U006/U007→`BankC`; ADMIN→`Platform`/`synchronizer` with party `GlobalSynchronizer_Party`. U001 mapping: `cantonPartyId="U001_Party"`, `cantonRole="customer"`.

### PF-08 · Mempool status baseline

- **Steps:** `GET /api/mempool/status`.
- **Expected:** 200; fields `pendingCount`, `approvedCount`, `rejectedCount`, `totalCount`, `nextBlockInSeconds=30`, `timestamp`. On fresh seed all counts 0.

### PF-09 · Deterministic setup (run before Section B)

- **Steps:**
  1. `POST /api/isolation-forest/config` body `{"enabled": false}` → expect `enabled=false`.
  2. `POST /api/cortex/config` body `{"enabled": false}` → expect `enabled=false`.
  3. Confirm London time is between 06:00 and 23:00 (else add +10 to every expected score below).
- **Expected:** subsequent risk scores come from deterministic rules only.

---

## SECTION B — Core Payment Flows (deterministic scores)

### PF-10 · Low-risk instant settlement (trusted payee, score 0)

- **Preconditions:** fresh-ish seed; Alice (U001) has <3 sends in last 10 min; Bob (U002) is in Alice's trustedPayees (seeded).
- **Steps:**
  1. Record balances: `GET /api/admin/balance/U001`, `GET /api/admin/balance/U002`.
  2. Initiate: `{"fromUserId":"U001","toUserId":"U002","amount":150,"transactionType":"DOMESTIC"}`.
  3. Wait ≤40 s, then `GET /api/txn/user/U001/pending` and find `<TXN>`.
  4. `GET /api/admin/balance/U001` and `/U002` again.
  5. `GET /api/txn/user/U001/history` and `GET /api/txn/user/U002/history`.
- **Expected:**
  - Initiate → 200: `riskScore=0`, empty `riskBreakdown`, `routingDecision="AUTO_APPROVE"`, `status="APPROVED"`, `txnId` starts `TXN-`, 32-char hex `nonce`, message "Transaction scored and accepted into mempool".
  - After wait: `<TXN>` status `COMMITTED`; Alice −£150, Bob +£150 exactly.
  - History: Alice has an `OUT` record for `<TXN>` (status COMMITTED, `blockNumber ≥ 1`, counterparty Bob); Bob has the matching `IN` record.
  - `GET /api/chain/alpha/blocks` → newest block contains `<TXN>`, `consensusVerified=true`, ≥2 signatures, `triggerType` is `COUNT_TRIGGER` or `TIMER_TRIGGER`.

### PF-11 · Ledger-state timeline for a low-risk txn

- **Preconditions:** PF-10 done.
- **Steps:** `GET /api/chain/ledger-states/<TXN of PF-10>`; `GET /api/canton/contract-refs/<TXN>`.
- **Expected:** ledger states include `TXN_CREATED` (amount 150, riskTier LOW metadata) then `SETTLEMENT_COMPLETED`, chronological order. Contract-refs → 200 with non-empty `settlementContractRef` (locally `#settlement-…`).

### PF-12 · Velocity rule accrues (still auto-approved)

- **Preconditions:** Bob (U002) idle ≥10 min; Alice trusted by Bob (seeded).
- **Steps:** initiate 4× `{"fromUserId":"U002","toUserId":"U001","amount":100}` back-to-back (<2 min apart).
- **Expected:** txns 1–3 → `riskScore=0`. Txn 4 → `riskBreakdown` contains `VELOCITY +15` ("3+ transactions … 10 minutes"), `riskScore=15`, still `AUTO_APPROVE`/`APPROVED`. All 4 commit within ~40 s; net Bob −£400, Alice +£400.

### PF-13 · Medium risk (score 40) → bank hold → admin approve → settle

- **Preconditions:** Alice balance ≥ £30,000 **and** > £42,858 (so RAPID_DRAIN stays off); U004 not in Alice's trustedPayees; Alice <3 sends in last 10 min (run ≥10 min after PF-10/12 or accept +15).
- **Steps:**
  1. Initiate `{"fromUserId":"U001","toUserId":"U004","amount":30000,"bypassSelfLimits":true}`.
  2. `GET /api/admin/queue` — find `<TXN>`.
  3. `GET /api/canton/contract-refs/<TXN>`.
  4. Approve: `POST /api/admin/txn/<TXN>/decide` body `{"approved": true}`.
  5. Wait ≤40 s; check balances + txn status.
- **Expected:**
  - Initiate → `riskScore=40` with breakdown exactly: `LARGE_AMOUNT +20` (>£25k), `NEW_PAYEE +15`, `ROUND_AMOUNT +5`; `routingDecision="ADMIN_REVIEW"`; final returned `status="PENDING_BANK_APPROVAL"` (Canton hold raised: intermediate HOLD_ACTIVE).
  - Queue contains `<TXN>`; contract-refs show non-empty `holdContractRef` and `approvalContractRef`.
  - Decide → 200, `status="APPROVED"`, message mentions hold release.
  - After wait: status `COMMITTED`; Alice −£30,000, Diana +£30,000.
  - `GET /api/chain/ledger-states/<TXN>` includes `ADMIN_HOLD_CREATED`, `ADMIN_APPROVAL_GRANTED`, `HOLDS_RELEASED`, `SETTLEMENT_COMPLETED`.

### PF-14 · High risk (score 80) → user consent APPROVE → settle

- **Preconditions:** Carlos (U003) balance ≥ £110,000 and < £157,142; U002 not in Carlos's trustedPayees; Carlos idle 10 min.
- **Steps:**
  1. Initiate `{"fromUserId":"U003","toUserId":"U002","amount":110000,"bypassSelfLimits":true}`.
  2. Consent approve: `POST /api/txn/<TXN>/user-consent` body `{"approved": true}`.
  3. Wait ≤40 s; verify status and balances.
- **Expected:**
  - Initiate → `riskScore=80`: `LARGE_AMOUNT +35` (>£100k), `NEW_PAYEE +15`, `ROUND_AMOUNT +5`, `RAPID_DRAIN +25` (110k > 70% of 120k); `routingDecision="CONSENT_REQUIRED"`; returned status `PENDING_BANK_APPROVAL` (hold + bank-approval contracts raised).
  - Consent → 200; returned txn `status="APPROVED"`; ledger gains `USER_CONSENT_RECEIVED`.
  - After wait: `COMMITTED`; Carlos −£110,000, Bob +£110,000.

### PF-15 · High risk → user consent DECLINE → escalation → admin approve

- **Preconditions:** Eve (U005) balance ≥ £150,000 and < £214,285; U002 not trusted by Eve; Eve idle 10 min.
- **Steps:**
  1. Initiate `{"fromUserId":"U005","toUserId":"U002","amount":150000,"bypassSelfLimits":true}` → expect `riskScore=80` (35+15+5+25).
  2. Decline: `POST /api/txn/<TXN>/user-consent` body `{"approved": false}`.
  3. `GET /api/admin/queue` — `<TXN>` present with status `PENDING_ADMIN`.
  4. `POST /api/admin/txn/<TXN>/decide` `{"approved": true}`; wait ≤40 s.
- **Expected:** decline → 200, txn `status="PENDING_ADMIN"`; ledger gains `USER_CONSENT_DECLINED` (+ fresh `ADMIN_HOLD_CREATED`). After admin approval: `COMMITTED`, Eve −£150,000, Bob +£150,000. This escalation path is designed behavior.

### PF-16 · Bank hold → admin REJECT (designed rejection path)

- **Preconditions:** Frank (U006) balance ≥ £14,000 and < £20,000 (fresh seed: £15,000); U003 not trusted by Frank.
- **Steps:**
  1. Record Frank balance.
  2. Initiate `{"fromUserId":"U006","toUserId":"U003","amount":14000,"bypassSelfLimits":true}` → expect `riskScore=40` (`NEW_PAYEE +15`, `RAPID_DRAIN +25`), status `PENDING_BANK_APPROVAL`.
  3. Reject: `POST /api/admin/txn/<TXN>/decide` body `{"approved": false}`.
  4. `GET /api/admin/suspicious`; `GET /api/txn/user/U006/pending`; `GET /api/admin/balance/U006`.
- **Expected:**
  - Reject → 200, `status="REJECTED"`, txn `routingDecision="REJECTED_BY_ADMIN"`.
  - Suspicious list gains an entry: reason `HIGH_RISK_REJECTION_REVERSED`, sourceTrigger `BANK_ADMIN_REJECT`, reviewStatus `PENDING_REVIEW`, containing `<TXN>`.
  - Ledger states gain `REJECTION_RECORDED` and `FRAUD_ALERT_CREATED`. Carlos's balance unchanged.
  - ⚠ **As-implemented:** Frank's balance **increases by £14,000** (refund is credited even though debit only happens at block commit — record actual value; flag to devs if product intends net-zero).

### PF-17 · Escrow opt-in (low risk) → admin settles escrow

- **Preconditions:** Alice balance ≥ £200; Bob trusted (no consent path).
- **Steps:**
  1. Initiate `{"fromUserId":"U001","toUserId":"U002","amount":200,"escrowOptIn":true}`.
  2. `GET /api/admin/queue` — `<TXN>` present (status `ESCROW_ACTIVE`).
  3. `GET /api/canton/contract-refs/<TXN>`.
  4. `POST /api/admin/txn/<TXN>/decide` `{"approved": true}`; wait ≤40 s.
- **Expected:**
  - Initiate → `riskScore=0`, `escrowOptIn=true`, returned `status="ESCROW_ACTIVE"` (escrow is additive; low-risk APPROVED transitions to ESCROW_ACTIVE).
  - Contract-refs include non-empty `escrowContractRef` (locally `#escrow-…`); ledger has `ESCROW_HOLD_CREATED`.
  - After approve + wait: `COMMITTED`; Alice −£200, Bob +£200; ledger gains `ESCROW_RELEASED` and `SETTLEMENT_COMPLETED`.

### PF-18 · Admin queue reflects all held work

- **Preconditions:** run mid-Section B while ≥1 txn is held.
- **Steps:** `GET /api/admin/queue`.
- **Expected:** 200; array sorted by `createdAt` ascending; only statuses from {PENDING_ADMIN, PENDING_CONSENT, HOLD_ACTIVE, PENDING_BANK_APPROVAL, PENDING_USER_APPROVAL, ESCROW_ACTIVE}; each entry carries `riskScore` + full `riskBreakdown`.

---

## SECTION C — Limits, Toggles, Beneficiaries

### PF-19 · Self-limits: read → update → reset

- **Steps (user U006):**
  1. `GET /api/users/U006/self-limits`.
  2. `PUT /api/users/U006/self-limits` body `{"dailyTransactionLimit":20000,"weeklyTransactionLimit":60000,"maxBeneficiaryAmount":12000}`.
  3. `POST /api/users/U006/self-limits/reset`.
- **Expected:**
  1. Defaults: daily 15000, weekly 50000, maxBeneficiaryAmount 10000, domestic+international enabled, numeric `todaySpent`/`weekSpent`, recommended values 15000/50000, `riskIndicator="MEDIUM"`.
  2. → 200 echoing new values; `riskIndicator="MEDIUM"` (daily ≤30k).
  3. → 200 back to defaults.

### PF-20 · Self-limit guard blocks, bypass succeeds (guard working as designed)

- **Preconditions:** Grace (U007) at default limits; U001 IS in Grace's trustedPayees; Grace balance > £42,858.
- **Steps:**
  1. Initiate `{"fromUserId":"U007","toUserId":"U001","amount":12000}` (no bypass).
  2. Initiate same with `"bypassSelfLimits": true`.
- **Expected:**
  1. → **400** with message "Amount exceeds your maximum beneficiary amount of £10000.0" (designed enforcement — PASS when blocked).
  2. → 200; `riskScore=0` (trusted payee, no rules fire), `AUTO_APPROVE`; commits; Grace −£12,000, Alice +£12,000.

### PF-21 · Per-user rule toggles change scoring

- **Preconditions:** Grace idle 10 min (<3 sends); U004 NOT in Grace's trustedPayees.
- **Steps:**
  1. `GET /api/users/U007/rule-settings` → all 8 rules true (`LARGE_AMOUNT, NEW_PAYEE, VELOCITY, ROUND_AMOUNT, OFF_HOURS, RAPID_DRAIN, CORTEX_AI, ISOLATION_FOREST`).
  2. `PUT /api/users/U007/rule-settings` body `{"NEW_PAYEE": false}`.
  3. Initiate `{"fromUserId":"U007","toUserId":"U004","amount":200}` → expect **no** NEW_PAYEE item, `riskScore=0`.
  4. `PUT /api/users/U007/rule-settings` body `{"NEW_PAYEE": true}`.
  5. Initiate same again → expect `NEW_PAYEE +15`, `riskScore=15`, still AUTO_APPROVE.
- **Expected:** as inline. Both txns commit (£200 each Grace→Diana).

### PF-22 · Beneficiary lifecycle: add (instant) → trust discount → remove

- **Preconditions:** Diana (U004) balance ≥ £26,000; U006 not yet Diana's beneficiary; Diana <3 sends in 10 min.
- **Steps:**
  1. `POST /api/users/U004/beneficiaries` body `{"recipientUserId":"U006","disableCoolOff":true}`.
  2. `GET /api/users/U004/beneficiaries`.
  3. Initiate `{"fromUserId":"U004","toUserId":"U006","amount":26000,"bypassSelfLimits":true}`.
  4. `DELETE /api/users/U004/beneficiaries/U006`.
  5. `GET /api/users/U004/beneficiaries`.
- **Expected:**
  1. → 200: `status="ACTIVE"` immediately, `coolOffBypassed=true`, id `U004:U006`.
  2. List contains the ACTIVE beneficiary; U006 now in Diana's trustedPayees.
  3. Breakdown: `LARGE_AMOUNT +20`, **no NEW_PAYEE**, `BENEFICIARY_TRUST_DISCOUNT −5` (tier NEW, <24 h); `riskScore=15`; response `beneficiaryTrustTier="NEW"`, `beneficiaryTrustDiscount=5`; AUTO_APPROVE → commits (Diana −£26,000, Frank +£26,000).
  4. → 200/204; 5. list empty and U006 removed from trustedPayees.

### PF-23 · Beneficiary cool-off variant (pending → activate)

- **Steps (owner U002, recipient U005):**
  1. `POST /api/users/U002/beneficiaries` body `{"recipientUserId":"U005"}` (no disableCoolOff).
  2. `POST /api/users/U002/beneficiaries/U005/activate`.
  3. Cleanup: `DELETE /api/users/U002/beneficiaries/U005`.
- **Expected:** step 1 → `status="PENDING_ACTIVE"`, `activeAt` ≈ now +1 h, `coolOffBypassed=false`. Step 2 → `status="ACTIVE"`, `coolOffBypassed=true`, U005 added to Bob's trustedPayees. Cleanup succeeds.

### PF-24 · Global beneficiary limit forces admin review

- **Preconditions:** Eve balance ≥ £6,000; U006 trusted by Eve (seeded).
- **Steps:**
  1. `GET /api/admin/beneficiary-limit` → `limitAmount=null` initially.
  2. `PUT /api/admin/beneficiary-limit` body `{"limitAmount": 5000}`.
  3. Initiate `{"fromUserId":"U005","toUserId":"U006","amount":6000}`.
  4. `POST /api/admin/txn/<TXN>/decide` `{"approved": true}`; wait ≤40 s.
  5. Cleanup: `PUT /api/admin/beneficiary-limit` body `{"limitAmount": null}` → `limitAmount=null`.
- **Expected:** step 3 → rules score 0 **but** `routingDecision="ADMIN_REVIEW"` (forced), breakdown contains `BENEFICIARY_GLOBAL_LIMIT_REVIEW` with **0 points** and reason naming the £5000 limit; status `PENDING_BANK_APPROVAL`. Step 4 → settles; Eve −£6,000, Frank +£6,000.

### PF-25 · Admin balance tools

- **Steps:**
  1. `GET /api/admin/balance/U006` → note `balance`.
  2. `POST /api/admin/balance/U006/add?amount=5000` → `newBalance = oldBalance + 5000`, message "(DEMO ONLY)".
  3. `POST /api/admin/balance/U006/set?amount=15000` → `newBalance=15000`.
- **Expected:** as inline; amounts are **query params**, not JSON.

---

## SECTION D — AI / ML Flows

### PF-26 · ML direct scoring — anomalous payload

- **Steps:** `POST http://localhost:5001/score` body `{"amount":95000,"senderBalance":100000,"isNewPayee":true,"hourOfDay":2,"velocity10m":6}`.
- **Expected:** 200; `evaluated=true`; `anomalyScore` in [0,1] and high (typically >0.6); `isAnomaly=true` (typically); `points` in [0,30] and >0; `reasons[]` non-empty (magnitude / unverified payee / velocity / off-hours / drain); `modelVersion="v1.0.0-isolation-forest"`. (Model-dependent — assert ranges, not exact values.)

### PF-27 · ML direct scoring — benign payload

- **Steps:** `POST http://localhost:5001/score` body `{"amount":45,"senderBalance":8000,"isNewPayee":false,"hourOfDay":14,"velocity10m":0}`.
- **Expected:** 200; `evaluated=true`; low `anomalyScore` (typically <0.4) and `points=0` (typically); `reasons` empty when not anomalous.

### PF-28 · ML retraining (direct + via backend proxy)

- **Steps:** `POST http://localhost:5001/train` (empty body); then `POST /api/isolation-forest/train`.
- **Expected:** both 200; `status="SUCCESS"`, message "Successfully retrained…", `samplesCount ≥ 10` (400 on empty DB = synthetic baseline), `trainedAt` ISO timestamp. `GET :5001/health` then shows `isTrained=true` with updated `lastTrainedAt`.

### PF-29 · Isolation Forest backend health proxy & config

- **Steps:** `GET /api/isolation-forest/health`; `GET /api/isolation-forest/config`.
- **Expected:** health → `enabled` (false right now, per PF-09), `serviceStatus="UP"`, `isTrained=true`. Config reflects the toggle state.

### PF-30 · Re-enable ML and see it in the unified score

- **Steps:**
  1. `POST /api/isolation-forest/config` `{"enabled": true}`.
  2. Initiate `{"fromUserId":"U005","toUserId":"U002","amount":40000,"bypassSelfLimits":true}` (Eve→Bob; untrusted; expect rules 20+15+5=40 ± velocity).
- **Expected:** breakdown now **contains an `ISOLATION_FOREST` item** (0–30 pts, ML-dependent) with reason text; `riskScore` = rules + ML points (≤100). Routing per the total (ADMIN_REVIEW at 40–69, CONSENT_REQUIRED at 70+). Then approve/settle via the matching PF-13/14 pattern to clean up.

### PF-31 · Disable ML again for remaining deterministic flows

- **Steps:** `POST /api/isolation-forest/config` `{"enabled": false}` → `enabled=false`.

### PF-32 · Cortex config surface

- **Steps:** `GET /api/cortex/config`.
- **Expected:** 200 with `enabled` (false per PF-09), dummy-mode flag, and API-key presence flag (`hasApiKey=false` with placeholder key).

### PF-33 · Cortex dummy mode contributes CORTEX_AI points

- **Preconditions:** ML disabled; Grace idle ≥10 min (<3 sends in window); Grace balance ≥ £30,000 and > £42,858; U003 not trusted by Grace.
- **Steps:**
  1. `POST /api/cortex/config` `{"enabled": true}` then `{"dummyMode": true}` (or one call with both if supported).
  2. Initiate `{"fromUserId":"U007","toUserId":"U003","amount":30000,"bypassSelfLimits":true}`.
  3. `GET /api/cortex/review/user/U007`; `GET /api/cortex/review/txn/<TXN>`.
  4. Approve `<TXN>` via `POST /api/admin/txn/<TXN>/decide` `{"approved":true}` (cleanup, settles Grace→Carlos £30,000).
  5. Reset: `POST /api/cortex/config` `{"dummyMode": false}` then `{"enabled": false}`.
- **Expected:**
  - Step 2 → breakdown: `LARGE_AMOUNT +20`, `NEW_PAYEE +15`, `ROUND_AMOUNT +5`, **`CORTEX_AI +20`** (dummy raw 65 → SUSPICIOUS → 65×0.3 clamped to [8,20]); reasons include "Simulated Cortex review (dummy mode…)"; `riskScore=60` → `ADMIN_REVIEW` → `PENDING_BANK_APPROVAL`.
  - Step 3 → both 200 with `verdict="CLEAR"`, `riskLevel="LOW"`, `model="dummy-simulator"`, `transactionsAnalyzed ≥ 1`.

### PF-34 · Chatbot end-to-end

- **Steps:**
  1. `POST /api/chat` body `{"message":"Explain FraudShield's 3-tier risk routing","history":[]}`.
  2. `POST /api/chat` body `{"message":"What is the current status of users and mempool?","history":[]}`.
- **Expected:** both 200 with `success=true`, non-empty `response`, `provider` ∈ {"Local Ollama (Gemma 2)", "NVIDIA NIM Cloud API", "Offline Precision Index"}. If provider is the offline index, response begins with the "Offline Live Demo Mode" banner and a matched `### Q<n>` entry. Answer content should be consistent with `DEMO_KNOWLEDGE_BASE.md` (tiers 0–39/40–69/70–100).

---

## SECTION E — Ledger Integrity & Audit

### PF-35 · Chain explorer reads & replica equality

- **Steps:** `GET /api/chain/alpha/blocks?limit=20`, same for beta and gamma; compare newest block.
- **Expected:** all 200; newest block identical across chains (blockNumber, blockHash, merkleRoot, nonce); each block's `previousHash` equals the prior block's `blockHash` (walk 2–3 links); `signatures` ⊆ {alpha,beta,gamma} with ≥2 entries.

### PF-36 · Replica resync endpoint

- **Steps:** `POST /api/chain/sync`.
- **Expected:** 200; `status="SYNCED"`, `alphaBlocks=betaBlocks=gammaBlocks` (>0).

### PF-37 · Tamper → verify → auto-repair (flagship demo)

- **Preconditions:** `<TXN>` = PF-10's committed £150 transaction (has `TXN_CREATED` ledger state with amount).
- **Steps:**
  1. `POST /api/chain/tamper` body `{"txnId":"<TXN>","tamperedAmount":99999}`.
  2. `GET /api/chain/verify/<TXN>`.
  3. `GET /api/chain/verify/<TXN>` again.
  4. `GET /api/admin/alerts`; `GET /api/admin/suspicious`; `GET /api/chain/ledger-states/<TXN>`.
- **Expected:**
  1. → 200: `status="TAMPERED_OPERATIONAL_DATA"`, `originalAmount=150`, `tamperedAmount=99999`.
  2. → 200: `tamperDetected=true`, `status="TAMPER_ALERT_CREATED"`, `repaired=true`, discrepancy text compares £99999 vs £150, `originalAmount=150`.
  3. → `status="VERIFIED"`, `tamperDetected=false` (amount was auto-reverted to 150).
  4. Alerts gain `TAMPER_DETECTED` severity `CRITICAL` (unresolved); suspicious gains `TAMPER_ATTEMPT_DETECTED` (reviewStatus `ESCALATED`); ledger states gain `TAMPER_ALERT_CREATED`.

### PF-38 · Forced consensus failure quarantines the batch (run LAST in this section)

- **Preconditions:** `GET /api/mempool/status` shows no lingering APPROVED txns about to batch (wait one block cycle if needed) — the armed failure hits the **next** candidate block.
- **Steps:**
  1. `POST /api/chain/force-consensus-failure` → `status="ARMED"`.
  2. Initiate low-risk `{"fromUserId":"U001","toUserId":"U002","amount":50}`.
  3. Wait ≤40 s. `GET /api/txn/user/U001/pending`; `GET /api/admin/suspicious`; `GET /api/admin/alerts`.
- **Expected:** txn becomes `REJECTED` (never committed; **balances unchanged**); suspicious gains reason `CONSENSUS_FAILURE` (reviewStatus `PENDING_REVIEW`) listing the txnId; alerts gain `CONSENSUS_FAILURE` severity `WARNING`; no new block contains the txn. Subsequent blocks commit normally (arm flag auto-resets).

### PF-39 · Full data export

- **Steps:** `GET /api/chain/export-mongo-data`.
- **Expected:** 200; keys `timestamp, ledger_state, audit_trail, mempool, txn_history, alerts, suspicious_txns` — all arrays populated consistently with prior flows (e.g., PF-10 txn in `txn_history` twice: OUT + IN).

### PF-40 · Audit trail mirrors ledger states

- **Steps:** compare `GET /api/chain/ledger-states/<TXN of PF-13>` with the `audit_trail` entries for the same txn from PF-39.
- **Expected:** every ledger state has a matching audit event (`eventType` = state, `fromState`→`toState` chain is contiguous, actorId populated).

---

## SECTION F — WebSocket Live Updates

### PF-41 · Balance & status push on commit

- **Steps:**
  1. Open WS `ws://localhost:8080/ws?userId=U001` and `ws://localhost:8080/ws?userId=U002`; keep open.
  2. Initiate low-risk `{"fromUserId":"U001","toUserId":"U002","amount":25}`.
  3. Wait ≤40 s for the block commit.
- **Expected:** U001 socket receives `{"type":"txn_status_update","txnId":"<TXN>","status":"COMMITTED"}` and `{"type":"balance_update","balance":<new>}`; U002 socket receives its own status + balance messages. (Loose score assertion — velocity may add points but stays AUTO_APPROVE.)

### PF-42 · Admin queue push

- **Steps:** open WS as `userId=ADMIN`; commit any block (e.g., rerun PF-41 step 2).
- **Expected:** ADMIN socket receives `{"type":"admin:queue"}` when the block builder commits.

---

## SECTION G — Frontend UI Journeys (browser agent)

> UI base: `http://localhost:5173`. These mirror the recorded e2e demos (`e2e/*.spec.ts`).

### PF-43 · Home & system status

- **Steps:** open the app → Home.
- **Expected:** hero "Decentralized Fraud Defense"; System Status card shows green "Backend Connected" with status/app/time from `/health`; sidebar shows Home, User Portal, Admin Console, Chain Explorer, Suspicious Txns; the NVIDIA AI Advisor floating button is visible bottom-right.

### PF-44 · Account selection

- **Steps:** sidebar → User Portal.
- **Expected:** "Select Your Account" with 7 user cards (U001–U007) showing name, bank label (Stellar Bank, Nova Finance, Prime Banking, Apex Trust, Quantum Pay, Gold Standard, Liberty Banking) and **live** balances; grid/table view toggle works; clicking a card opens that user's portal.

### PF-45 · UI low-risk transfer (demo 01)

- **Steps:** portal as Alice (U001) → recipient Bob Taylor → amount **150** → submit.
- **Expected:** success banner "✅ Transaction auto-approved and accepted into mempool!"; risk panel shows score 0 (or small velocity points on reruns); pending list gains the txn; within ~40 s status flips to COMMITTED and the balance card updates (WebSocket).

### PF-46 · UI risky transfer & risk breakdown (demo 02 pattern)

- **Steps:** portal as Alice → recipient Carlos → amount **4500** → acknowledge the self-limit warning modal if shown → submit.
- **Expected:** transaction accepted; the risk breakdown card lists each triggered rule with points (and ML reasons when the ML service is enabled); status message matches the tier (auto-approved, hold, or fraud-team review). No exact-score assertion (ML variability).

### PF-47 · UI consent modal (15-second window)

- **Preconditions:** a transaction whose returned status is consent-pending (`PENDING_CONSENT`-family). Note: with the Canton simulation active, high-risk txns usually return `PENDING_BANK_APPROVAL` instead and the modal will NOT appear — in that case verify the "🏦 … Awaiting bank approval via Canton contract" banner and PASS this via the API consent flow (PF-14).
- **Steps:** when the modal appears: verify countdown starts at **15 s**, txnId/recipient/amount/risk score shown; click Approve within 10 s.
- **Expected:** modal closes; banner "✅ Consent verified! Payment settled directly on Canton ledger."

### PF-48 · UI Admin Console approve

- **Steps:** create a held txn (PF-13 pattern) → sidebar Admin Console.
- **Expected:** pending queue lists the txn with risk score + per-rule breakdown; clicking **Approve** removes it from the queue with a success state; balances update after the next block.

### PF-49 · UI Chain Explorer & block modal (demo 04)

- **Steps:** sidebar Chain Explorer → wait for feeds → click the newest block card.
- **Expected:** three parallel columns (alpha/beta/gamma) with identical newest-block hashes; modal shows block number, SHA-256 block hash, previous hash, Merkle root, nonce, validator signatures, txn list, consensus status "verified"; closing the modal returns to the feed.

### PF-50 · UI Suspicious Txns page

- **Preconditions:** PF-16 and/or PF-38 executed.
- **Steps:** sidebar Suspicious Txns.
- **Expected:** entries for `HIGH_RISK_REJECTION_REVERSED` / `CONSENSUS_FAILURE` / `TAMPER_ATTEMPT_DETECTED` with reasons, source triggers, review statuses, and linked txnIds.

### PF-51 · UI chatbot widget (demo 03)

- **Steps:** click the floating "NVIDIA AI Advisor" button → click preset chip "🛡️ 3-Tier Risk Routing" → wait for reply → type "How does the Isolation Forest scoring work?" → send.
- **Expected:** widget opens with welcome message and 4 preset chips; both replies render formatted (headings/bold/code) non-empty content consistent with the knowledge base; a loading indicator ("NVIDIA Nemotron is reasoning…") appears while waiting; provider label/model visible in the header.

### PF-52 · UI self-limits, rule toggles & beneficiaries panels

- **Steps:** in a user portal: adjust the daily-limit slider and save; toggle a fraud rule off/on; add a beneficiary (instant option) and remove it.
- **Expected:** each action persists (re-fetch shows the new value), matching the API behavior of PF-19 / PF-21 / PF-22; UI shows updated trusted-payee/beneficiary lists.

---

## Appendix A — Expected balance ledger (fresh seed, full sequential run)

Informative — verify cumulative balances if all flows PASS in order. Skip if any core flow failed.

| After flow | U001 Alice | U002 Bob | U003 Carlos | U004 Diana | U005 Eve | U006 Frank | U007 Grace |
|---|---|---|---|---|---|---|---|
| Seed | 50,000 | 75,000 | 120,000 | 30,000 | 200,000 | 15,000 | 60,000 |
| PF-10 (A→B 150) | 49,850 | 75,150 | — | — | — | — | — |
| PF-12 (B→A 4×100) | 50,250 | 74,750 | — | — | — | — | — |
| PF-13 (A→D 30,000) | 20,250 | — | — | 60,000 | — | — | — |
| PF-14 (C→B 110,000) | — | 184,750 | 10,000 | — | — | — | — |
| PF-15 (E→B 150,000) | — | 334,750 | — | — | 50,000 | — | — |
| PF-16 (F reject; as-implemented credit) | — | — | — | — | — | 29,000 ⚠ | — |
| PF-17 (A→B 200) | 20,050 | 334,950 | — | — | — | — | — |
| PF-20 (G→A 12,000) | 32,050 | — | — | — | — | — | 48,000 |
| PF-21 (G→D 2×200) | — | — | — | 60,400 | — | — | 47,600 |
| PF-22 (D→F 26,000) | — | — | — | 34,400 | — | 55,000 ⚠ | — |
| PF-24 (E→F 6,000) | — | — | — | — | 44,000 | 61,000 ⚠ | — |

⚠ Frank's figures include the as-implemented PF-16 refund credit and are further changed by PF-25 (admin add/set → final £15,000). PF-30/PF-33 settle additional Eve/Grace transfers — recompute from responses at run time.

---

## Appendix B — Result recording template

| Flow | Name | Status (PASS/FAIL/SKIP) | Evidence (txnId / response snippet) | Notes |
|---|---|---|---|---|
| PF-01 | Backend health | | | |
| PF-02 | ML health | | | |
| PF-03 | Chat status | | | |
| PF-04 | Canton status | | | |
| PF-05 | Seeded users | | | |
| PF-06 | Genesis blocks | | | |
| PF-07 | Party mappings | | | |
| PF-08 | Mempool baseline | | | |
| PF-09 | Determinism setup | | | |
| PF-10 | Low-risk settlement | | | |
| PF-11 | Ledger timeline | | | |
| PF-12 | Velocity rule | | | |
| PF-13 | Medium → admin approve | | | |
| PF-14 | High → consent approve | | | |
| PF-15 | Consent decline → escalate | | | |
| PF-16 | Admin reject | | | |
| PF-17 | Escrow flow | | | |
| PF-18 | Admin queue | | | |
| PF-19 | Self-limits CRUD | | | |
| PF-20 | Limit guard + bypass | | | |
| PF-21 | Rule toggles | | | |
| PF-22 | Beneficiary lifecycle | | | |
| PF-23 | Cool-off variant | | | |
| PF-24 | Global limit | | | |
| PF-25 | Admin balance tools | | | |
| PF-26 | ML anomalous score | | | |
| PF-27 | ML benign score | | | |
| PF-28 | ML retrain | | | |
| PF-29 | IF health proxy | | | |
| PF-30 | ML in unified score | | | |
| PF-31 | ML off again | | | |
| PF-32 | Cortex config | | | |
| PF-33 | Cortex dummy scoring | | | |
| PF-34 | Chatbot | | | |
| PF-35 | Explorer reads | | | |
| PF-36 | Chain sync | | | |
| PF-37 | Tamper/verify/repair | | | |
| PF-38 | Consensus failure | | | |
| PF-39 | Data export | | | |
| PF-40 | Audit trail | | | |
| PF-41 | WS user events | | | |
| PF-42 | WS admin event | | | |
| PF-43–PF-52 | UI journeys | | | |
