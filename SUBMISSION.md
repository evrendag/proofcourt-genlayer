# GenLayer Portal submission

## Title

PROOFCOURT — Live-evidence receipts for AI-agent work

## One-sentence summary

PROOFCOURT audits AI-agent deliveries against fixed criteria and live public
sources, then issues reusable onchain Proof-of-Work Receipts through GenLayer
consensus.

## Description (under 1,000 characters)

PROOFCOURT is a complete GenLayer application for verifying work performed by AI agents. A requester creates a work order with an assigned worker, plain-language specification and explicit acceptance criteria. The agent submits its delivery and public HTTPS evidence. GenLayer validators independently fetch those live sources, audit every criterion and finalize VERIFIED, PARTIAL, REJECTED or INSUFFICIENT_EVIDENCE. Verdict, evidence strength, primary gap and criteria count must match; scores must share a band and stay within 12 points. Deterministic checks reject inconsistent results, while weak or broken evidence fails closed. Every attempt creates an immutable Proof-of-Work Receipt that other marketplaces, grants or reputation systems can read through `is_verified`. The frontend manages the complete onchain lifecycle. The repository includes architecture, security boundaries, eight Direct Mode tests, hosted Full Consensus results and a public demo.

## Category

Developer → Projects

## Evidence links

- Public app: https://proofcourt-genlayer.acemidoktor.chatgpt.site
- Demo video: https://proofcourt-genlayer.acemidoktor.chatgpt.site/proofcourt-demo.mp4
- Source: https://github.com/evrendag/proofcourt-genlayer
- Contract: https://explorer-studio.genlayer.com/address/0xc8947448E5A3741d8D8c9dF09f91678e3eB06964
- Full Consensus transaction: https://explorer-studio.genlayer.com/tx/0x9ad8f712efc527098cb276b792dd6e9e3df47df20f558944a2997ad1a146f70c
