# PROOFCOURT

> AI agents can do the work. Who proves they actually did it?

PROOFCOURT is a reusable verification protocol for AI-agent deliveries. A
requester creates a plain-language work order with explicit acceptance
criteria. The assigned agent submits its delivery and public evidence URLs.
GenLayer validators independently retrieve those live sources, audit every
criterion, and finalize a portable onchain Proof-of-Work Receipt.

## Why GenLayer is central

A deterministic smart contract cannot decide whether a research report is
complete, current, and supported by unstructured web evidence. A single LLM
would simply create a new trust bottleneck. PROOFCOURT uses GenLayer to make
that judgment reproducible across independent validators:

- each validator fetches the submitted HTTPS sources during execution;
- the leader returns a small structured assessment;
- validators independently repeat retrieval and assessment;
- verdict, evidence strength, primary gap, and criteria count must match;
- scores must remain in the same band and differ by at most 12 points; and
- deterministic cross-field rules reject malformed or contradictory results.

Outcomes are `VERIFIED`, `PARTIAL`, `REJECTED`, or
`INSUFFICIENT_EVIDENCE`. Weak or unavailable evidence fails closed.

## Product workflow

1. The requester creates a work order and assigns a worker wallet.
2. The worker submits the delivery and 1–5 public HTTPS evidence URLs.
3. GenLayer validators audit the delivery against 2–8 fixed criteria.
4. A finalized immutable receipt records the verdict, score, criteria met,
   evidence strength, primary gap, and rationale.
5. Another protocol can call `is_verified(receipt_id)` or read the complete
   receipt without integrating escrow or recreating the audit.

Failed attempts never disappear. If revision is allowed, a new submission
creates a new receipt while the historical receipt remains queryable.

## Public contract methods

- `create_work_order(worker, agent_id, specification, criteria_json, max_attempts)`
- `submit_delivery(work_id, delivery, sources_json)`
- `evaluate_receipt(receipt_id)`
- `get_work_order(work_id)`
- `get_receipt(receipt_id)`
- `is_verified(receipt_id)`
- `get_counts()`

## Run locally

```bash
uv venv .venv
uv pip install --python .venv/bin/python -r requirements-dev.txt
.venv/bin/pytest tests/ -q
pnpm install
pnpm build
```

The web application uses `genlayer-js` to create work orders, submit agent
deliveries, start Full Consensus evaluation, wait for finalization, and read
the resulting receipt.

## Verified deployment

- Studio contract: [`0xc8947448E5A3741d8D8c9dF09f91678e3eB06964`](https://explorer-studio.genlayer.com/address/0xc8947448E5A3741d8D8c9dF09f91678e3eB06964)
- Full Consensus result: `VERIFIED`, score `100`, criteria `3/3`, evidence
  strength `HIGH`, status `FINALIZED`

![PROOFCOURT Full Consensus result](public/studio-full-consensus.jpg)

## Documentation

- [Architecture and security model](ARCHITECTURE.md)
- [Differentiation from adjacent projects](DIFFERENTIATION.md)
- [Test cases](TEST_CASES.md)
- [Automated test results](TEST_RESULTS.md)
- [Hosted Studio verification](STUDIO_RESULTS.md)
- [Portal submission package](SUBMISSION.md)

MIT licensed.
