import json


SPEC = (
    "Research the current purpose of the IANA example domains and provide a "
    "short report supported by the official IANA page."
)
CRITERIA = json.dumps([
    "The report identifies the example domains maintained by IANA.",
    "The report explains that the domains are reserved for documentation.",
    "Every factual claim is supported by the submitted official source.",
])
DELIVERY = (
    "IANA maintains example.com, example.net and example.org for illustrative "
    "use in documentation. They may be used without prior coordination."
)
SOURCES = json.dumps(["https://www.iana.org/help/example-domains"])
VERIFIED = json.dumps({
    "verdict": "VERIFIED", "score": 94, "criteria_met": 3,
    "evidence_strength": "HIGH", "primary_gap": "NONE",
    "rationale": "The official IANA source directly supports the delivery and all three acceptance criteria."
})
PARTIAL = json.dumps({
    "verdict": "PARTIAL", "score": 67, "criteria_met": 2,
    "evidence_strength": "HIGH", "primary_gap": "MISSING_SCOPE",
    "rationale": "The delivery explains the reservation purpose but omits one required domain from the report."
})
INSUFFICIENT = json.dumps({
    "verdict": "INSUFFICIENT_EVIDENCE", "score": 35, "criteria_met": 0,
    "evidence_strength": "LOW", "primary_gap": "BROKEN_SOURCE",
    "rationale": "The submitted source is unavailable, so none of the factual criteria can be safely verified."
})


def deploy(direct_deploy):
    return direct_deploy("contract.py", sdk_version="v0.2.12")


def mock_web(direct_vm):
    direct_vm.mock_web(r".*iana\.org.*", {
        "status": 200,
        "body": "IANA-managed Reserved Domains: example.com, example.net, and example.org are maintained for documentation purposes and may be used without prior coordination."
    })


def create_and_submit(contract, direct_vm, worker):
    contract.create_work_order(type(contract.owner)(worker), "Research Agent #18", SPEC, CRITERIA, 2)
    with direct_vm.prank(worker):
        contract.submit_delivery(0, DELIVERY, SOURCES)


def test_create_and_submit(direct_vm, direct_deploy, direct_bob):
    contract = deploy(direct_deploy)
    create_and_submit(contract, direct_vm, direct_bob)
    assert contract.get_work_order(0).status == "SUBMITTED"
    assert contract.get_receipt(0).status == "PENDING"
    assert list(contract.get_counts()) == [1, 1]


def test_only_assigned_worker_submits(direct_vm, direct_deploy, direct_bob):
    contract = deploy(direct_deploy)
    contract.create_work_order(type(contract.owner)(direct_bob), "Research Agent #18", SPEC, CRITERIA, 2)
    with direct_vm.expect_revert("Only the assigned worker"):
        contract.submit_delivery(0, DELIVERY, SOURCES)


def test_rejects_unsafe_sources(direct_vm, direct_deploy, direct_bob):
    contract = deploy(direct_deploy)
    contract.create_work_order(type(contract.owner)(direct_bob), "Research Agent #18", SPEC, CRITERIA, 2)
    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("safe public HTTPS"):
            contract.submit_delivery(0, DELIVERY, json.dumps(["http://127.0.0.1/private"]))


def test_verified_receipt(direct_vm, direct_deploy, direct_bob):
    mock_web(direct_vm)
    direct_vm.mock_llm(r".*", VERIFIED)
    contract = deploy(direct_deploy)
    create_and_submit(contract, direct_vm, direct_bob)
    contract.evaluate_receipt(0)
    receipt = contract.get_receipt(0)
    assert receipt.status == "FINALIZED"
    assert receipt.verdict == "VERIFIED"
    assert contract.is_verified(0) is True
    assert direct_vm.run_validator() is True


def test_partial_allows_revision(direct_vm, direct_deploy, direct_bob):
    mock_web(direct_vm)
    direct_vm.mock_llm(r".*", PARTIAL)
    contract = deploy(direct_deploy)
    create_and_submit(contract, direct_vm, direct_bob)
    contract.evaluate_receipt(0)
    assert contract.get_work_order(0).status == "REVISION_ALLOWED"
    assert contract.is_verified(0) is False


def test_insufficient_evidence_fails_closed(direct_vm, direct_deploy, direct_bob):
    mock_web(direct_vm)
    direct_vm.mock_llm(r".*", INSUFFICIENT)
    contract = deploy(direct_deploy)
    create_and_submit(contract, direct_vm, direct_bob)
    contract.evaluate_receipt(0)
    assert contract.get_receipt(0).verdict == "INSUFFICIENT_EVIDENCE"


def test_historical_receipt_is_immutable(direct_vm, direct_deploy, direct_bob):
    mock_web(direct_vm)
    direct_vm.mock_llm(r".*", PARTIAL)
    contract = deploy(direct_deploy)
    create_and_submit(contract, direct_vm, direct_bob)
    contract.evaluate_receipt(0)
    with direct_vm.prank(direct_bob):
        contract.submit_delivery(0, DELIVERY + " The complete list is included.", SOURCES)
    assert contract.get_receipt(0).verdict == "PARTIAL"
    assert contract.get_receipt(1).status == "PENDING"


def test_validator_rejects_conflicting_verdict(direct_vm, direct_deploy, direct_bob):
    mock_web(direct_vm)
    direct_vm.mock_llm(r".*", VERIFIED)
    contract = deploy(direct_deploy)
    create_and_submit(contract, direct_vm, direct_bob)
    contract.evaluate_receipt(0)
    direct_vm.clear_mocks()
    mock_web(direct_vm)
    direct_vm.mock_llm(r".*", PARTIAL)
    assert direct_vm.run_validator() is False
