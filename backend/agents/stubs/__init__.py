"""
backend/agents/stubs/__init__.py

Stub implementations of Pair A's specialist agents.

PURPOSE: Allow Pair B to build and test the orchestrator, decision engine,
         API layer, evidence store, and remediation planner WITHOUT needing
         Pair A's real code.

USAGE: Import these stubs into backend/main.py during development.
       On integration day, swap imports to Pair A's real implementations.

STUB BEHAVIOUR:
  - Return realistic but synthetic Finding objects
  - Cover all three decision paths: PASS, REVIEW, and BLOCK scenarios
  - Are fully async-compatible (same interface as real agents)
  - Never touch the real graph — use the graph argument for structure only

SWAP: In backend/main.py, replace:
    from backend.agents.stubs import StubArchitectureAgent, ...
  with:
    from backend.agents.architecture.agent import ArchitectureAgent, ...
"""

from __future__ import annotations

import uuid
from typing import List

import networkx as nx

from backend.schemas.shared import (
    ChangeRequest,
    Finding,
    FindingCategory,
    FindingSeverity,
    PolicySet,
)


class StubArchitectureAgent:
    """
    Stub for the Architecture Agent.
    Returns no findings by default (PASS scenario).
    Override _scenario to test REVIEW or BLOCK paths.
    """

    def __init__(self, scenario: str = "pass"):
        """
        Args:
            scenario: "pass" | "review" | "block"
                      Controls what kind of findings this stub returns.
        """
        self._scenario = scenario

    async def analyze(
        self,
        change_request: ChangeRequest,
        graph: nx.MultiDiGraph,
        policies: PolicySet,
    ) -> List[Finding]:
        if self._scenario == "pass":
            return []

        if self._scenario == "review":
            return [Finding(
                id=str(uuid.uuid4()),
                change_request_id=change_request.id,
                category=FindingCategory.ARCHITECTURE,
                severity=FindingSeverity.MEDIUM,
                confidence=0.55,
                title="[STUB] Possible duplicate abstraction detected",
                explanation="STUB: A service with similar responsibilities may already exist.",
                evidence=["backend/services/payment_v2.py:1 — similar to PaymentService"],
                affected_files=["backend/services/payment_v2.py"],
                rule_id="ARCH-DUP-001",
                blocking=False,  # Heuristic → never blocking
            )]

        if self._scenario == "block":
            return [Finding(
                id=str(uuid.uuid4()),
                change_request_id=change_request.id,
                category=FindingCategory.ARCHITECTURE,
                severity=FindingSeverity.CRITICAL,
                confidence=1.0,
                title="[STUB] Layer boundary violation: frontend → database",
                explanation="STUB: Direct database import from frontend module.",
                evidence=["frontend/checkout.py:14 → from backend.db.repositories import UserRepository"],
                affected_files=["frontend/checkout.py"],
                rule_id="ARCH-001",
                blocking=True,  # Deterministic → blocking
            )]

        return []


class StubContractAgent:
    """Stub for the Contract Agent."""

    def __init__(self, scenario: str = "pass"):
        self._scenario = scenario

    async def analyze(
        self,
        change_request: ChangeRequest,
        graph: nx.MultiDiGraph,
        policies: PolicySet,
    ) -> List[Finding]:
        if self._scenario == "pass":
            return []

        if self._scenario == "review":
            return [Finding(
                id=str(uuid.uuid4()),
                change_request_id=change_request.id,
                category=FindingCategory.CONTRACT,
                severity=FindingSeverity.HIGH,
                confidence=0.7,
                title="[STUB] Optional field added to REST endpoint",
                explanation="STUB: New optional field added. Existing consumers unaffected but should be notified.",
                evidence=["backend/api/routes/payment.py:88 → response field 'metadata' added"],
                affected_files=["backend/api/routes/payment.py"],
                rule_id=None,
                blocking=False,
            )]

        if self._scenario == "block":
            return [Finding(
                id=str(uuid.uuid4()),
                change_request_id=change_request.id,
                category=FindingCategory.CONTRACT,
                severity=FindingSeverity.CRITICAL,
                confidence=1.0,
                title="[STUB] Breaking change: required field removed from API",
                explanation="STUB: Field 'user_id' removed from POST /api/orders. 3 consumers depend on it.",
                evidence=["backend/api/routes/orders.py:42 → field 'user_id' removed from OrderRequest"],
                affected_files=["backend/api/routes/orders.py"],
                rule_id="CONTRACT-BREAK-001",
                blocking=True,
            )]

        return []


class StubDependencyAgent:
    """Stub for the Dependency Guardian."""

    def __init__(self, scenario: str = "pass"):
        self._scenario = scenario

    async def analyze(
        self,
        change_request: ChangeRequest,
        graph: nx.MultiDiGraph,
        policies: PolicySet,
    ) -> List[Finding]:
        if self._scenario == "pass":
            return []

        if self._scenario == "review":
            return [Finding(
                id=str(uuid.uuid4()),
                change_request_id=change_request.id,
                category=FindingCategory.DEPENDENCY,
                severity=FindingSeverity.LOW,
                confidence=0.8,
                title="[STUB] Internal alternative may already exist",
                explanation="STUB: The proposed package 'boto3' may be covered by internal AWS adapter.",
                evidence=["requirements.txt:12 → boto3==1.26.0 proposed"],
                affected_files=["requirements.txt"],
                blocking=False,
            )]

        if self._scenario == "block":
            return [Finding(
                id=str(uuid.uuid4()),
                change_request_id=change_request.id,
                category=FindingCategory.DEPENDENCY,
                severity=FindingSeverity.CRITICAL,
                confidence=1.0,
                title="[STUB] Forbidden package: 'requests'",
                explanation="STUB: 'requests' is on the forbidden list. Use 'httpx' instead.",
                evidence=["requirements.txt:8 → requests==2.31.0"],
                affected_files=["requirements.txt"],
                rule_id="DEP-FORBIDDEN-001",
                blocking=True,
            )]

        return []


class StubImpactAgent:
    """
    Stub for the Impact Analysis Agent.
    NOTE: This agent NEVER returns blocking=True.
    High impact triggers REVIEW via risk score, not a hard block.
    """

    def __init__(self, scenario: str = "pass"):
        self._scenario = scenario

    async def analyze(
        self,
        change_request: ChangeRequest,
        graph: nx.MultiDiGraph,
        policies: PolicySet,
    ) -> List[Finding]:
        if self._scenario == "pass":
            return [Finding(
                id=str(uuid.uuid4()),
                change_request_id=change_request.id,
                category=FindingCategory.IMPACT,
                severity=FindingSeverity.LOW,
                confidence=0.9,
                title="[STUB] Low blast radius",
                explanation="STUB: Change affects 2 files and 1 downstream service.",
                evidence=["backend/services/payment.py:1 — modified"],
                affected_files=["backend/services/payment.py", "tests/unit/test_payment.py"],
                blast_radius=2,
                blocking=False,  # Impact agent NEVER blocks
            )]

        # For review/block scenarios, return high blast radius (still non-blocking)
        return [Finding(
            id=str(uuid.uuid4()),
            change_request_id=change_request.id,
            category=FindingCategory.IMPACT,
            severity=FindingSeverity.HIGH,
            confidence=0.85,
            title="[STUB] High blast radius — 47 components affected",
            explanation="STUB: Change to PaymentService affects 47 downstream components.",
            evidence=["backend/services/payment.py:1 — modified, 47 descendants in graph"],
            affected_files=["backend/services/payment.py"],
            blast_radius=47,
            blocking=False,  # NEVER blocking — contributes to REVIEW risk score
        )]


class StubSecurityAgent:
    """Stub for the Security Agent."""

    def __init__(self, scenario: str = "pass"):
        self._scenario = scenario

    async def analyze(
        self,
        change_request: ChangeRequest,
        graph: nx.MultiDiGraph,
        policies: PolicySet,
    ) -> List[Finding]:
        if self._scenario == "pass":
            return []

        if self._scenario == "review":
            return [Finding(
                id=str(uuid.uuid4()),
                change_request_id=change_request.id,
                category=FindingCategory.SECURITY,
                severity=FindingSeverity.MEDIUM,
                confidence=0.65,
                title="[STUB] New endpoint missing rate limiting",
                explanation="STUB: POST /api/payments/retry has no rate limit decorator.",
                evidence=["backend/api/routes/payments.py:112 → @router.post('/retry') — no @rate_limit"],
                affected_files=["backend/api/routes/payments.py"],
                blocking=False,
            )]

        if self._scenario == "block":
            return [Finding(
                id=str(uuid.uuid4()),
                change_request_id=change_request.id,
                category=FindingCategory.SECURITY,
                severity=FindingSeverity.CRITICAL,
                confidence=1.0,
                title="[STUB] Authorization bypass: direct DB access from API route",
                explanation="STUB: API route imports UserRepository directly, bypassing auth middleware.",
                evidence=["backend/api/routes/admin.py:8 → from backend.db.repositories import UserRepository"],
                affected_files=["backend/api/routes/admin.py"],
                rule_id="SEC-AUTH-001",
                blocking=True,
            )]

        return []


class StubGraphEngine:
    """
    Stub for Pair A's NetworkX graph engine.
    Returns a minimal synthetic graph so Pair B can test graph-dependent code.
    """

    async def get_or_build(self, project_id: str) -> nx.MultiDiGraph:
        """Return a minimal synthetic graph."""
        G = nx.MultiDiGraph()
        G.add_node("backend.api.routes", type="endpoint", path="backend/api/routes.py")
        G.add_node("backend.services.payment", type="service", path="backend/services/payment.py")
        G.add_node("backend.db.repositories.user", type="table", path="backend/db/repositories/user.py")
        G.add_edge("backend.api.routes", "backend.services.payment",
                   type="calls", evidence="routes.py:42 → PaymentService.process()")
        G.add_edge("backend.services.payment", "backend.db.repositories.user",
                   type="reads", evidence="payment.py:88 → UserRepository.find()")
        return G

    def serialize(self, project_id: str) -> dict:
        """Return a JSON-safe adjacency representation."""
        return {
            "nodes": [
                {"id": "backend.api.routes", "type": "endpoint"},
                {"id": "backend.services.payment", "type": "service"},
                {"id": "backend.db.repositories.user", "type": "table"},
            ],
            "edges": [
                {"source": "backend.api.routes", "target": "backend.services.payment", "type": "calls"},
                {"source": "backend.services.payment", "target": "backend.db.repositories.user", "type": "reads"},
            ],
        }


class StubPolicyLoader:
    """Stub for Pair A's YAML policy loader."""

    def load(self, project_id: str) -> "PolicySet":
        from backend.schemas.shared import ArchitectureRule, FindingSeverity, EnforcementAction, PolicySet
        return PolicySet(
            project_id=project_id,
            architecture_rules=[
                ArchitectureRule(
                    id="ARCH-001",
                    rule_type="layer_boundary",
                    expression="frontend -> database",
                    severity=FindingSeverity.CRITICAL,
                    enforcement=EnforcementAction.BLOCK,
                    description="Frontend modules may not directly import database models",
                )
            ],
            forbidden_packages=["requests", "flask", "django"],
            allowed_licenses=["MIT", "Apache-2.0", "BSD-3-Clause"],
        )
