# Test cases

## Automated Direct Mode

1. Create a work order and store a pending receipt.
2. Reject a delivery from any wallet other than the assigned worker.
3. Reject non-HTTPS, loopback, and metadata-style evidence URLs.
4. Finalize a fully supported delivery as `VERIFIED`.
5. Turn a partial result into `REVISION_ALLOWED`.
6. Fail closed to `INSUFFICIENT_EVIDENCE` when sources are unusable.
7. Preserve the first finalized receipt after a later resubmission.
8. Reject a validator that returns a conflicting verdict.

## Hosted Full Consensus demonstrations

- Correct IANA research: the official IANA page supports all three criteria.
- Incomplete IANA research: one required domain is intentionally omitted.
- Unverifiable delivery: the submitted evidence cannot support the claims.

The first scenario is the primary juror demo because it uses an authoritative,
stable public source, has an unambiguous specification, and can be checked live.
