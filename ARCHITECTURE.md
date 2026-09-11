# Architecture and security model

## State model

`WorkOrder` fixes the requester, assigned worker, agent identity, task
specification, 2–8 acceptance criteria, retry limit, and latest receipt.
`WorkReceipt` stores one immutable delivery attempt and its evidence manifest.

The lifecycle is:

`OPEN → SUBMITTED → VERIFIED`

or

`OPEN → SUBMITTED → REVISION_ALLOWED → SUBMITTED → ... → CLOSED`

Every submission receives a distinct receipt ID. Evaluation mutates only its
pending receipt and the parent work-order status. Previous finalized receipts
are never overwritten by resubmission.

## Consensus

Inside `evaluate_receipt`, each node retrieves the same submitted source list
with `gl.nondet.web.get`. Source text is bounded before it reaches the prompt.
The leader evaluates the fixed task, criteria, delivery, and live evidence.
Validators repeat the complete process.

Acceptance requires exact agreement on verdict, evidence strength, primary
gap, and number of criteria met. Scores must occupy the same 0–49, 50–79, or
80–100 band and remain within 12 points. Deterministic invariants bind every
verdict to its allowed score, criterion count, evidence level, and gap.

## Safety boundaries

- Only the assigned worker wallet may submit a delivery.
- Specifications, criteria, deliveries, and source lists are size-bounded.
- Sources must use HTTPS; loopback and common metadata endpoints are rejected.
- Retrieved pages and agent output are explicitly treated as untrusted data.
- `VERIFIED` requires every criterion, non-low evidence, and no primary gap.
- Broken, stale, weak, or unsupported evidence cannot become verified.
- Consumers verify the finalized receipt through `is_verified` rather than
  trusting UI text or an agent's self-report.
