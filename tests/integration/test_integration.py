"""
tests/integration/test_integration.py

Integration test suite — runs AFTER both pairs merge their work.

HOW TO RUN (integration day):
  1. Ensure Pair A's real agents are wired in backend/main.py
  2. Run: pytest tests/integration/ -v

WHAT THIS TESTS:
  - Real agents conform to SpecialistAgent Protocol
  - Real agents return valid Finding objects (Pydantic will catch schema issues)
  - Orchestrator correctly dispatches to all 5 real agents
  - Decision engine correctly classifies PASS/REVIEW/BLOCK
  - No heuristic findings incorrectly set blocking=True
  - API routes return valid PreflightResponse

All tests here use REAL Pair A agents — no stubs.
"""

from __future__ import annotations

import asyncio
from typing import List

import networkx as nx
import pytest

from backend.agents.protocols import SpecialistAgent, GraphEngine
from backend.schemas.shared import (
    ChangeRequest, Finding, FindingCategory, PolicySet, PreflightStatus
)


# ── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture
def sample_change_request() -> ChangeRequest:
    """A realistic change request for integration testing."""
    import uuid
    return ChangeRequest(
        id=str(uuid.uuid4()),
        project_id="test-project",
        raw_intent="Add a Redis cache layer to the PaymentService to reduce DB calls",
        changed_files=["backend/services/payment.py", "backend/cache/redis_adapter.py"],
        proposed_packages=["redis==5.0.1"],
        branch="feature/payment-cache",
    )


@pytest.fixture
def sample_policies() -> PolicySet:
    """Load the real policy set for integration testing."""
    from backend.agents.protocols import PolicyLoader
    # This will use Pair A's real PolicyLoader when wired in
    # For now, import the stub for structure validation
    from backend.agents.stubs import StubPolicyLoader
    return StubPolicyLoader().load("test-project")


# ── Protocol Conformance Tests (Pair A) ─────────────────────────────────────

class TestAgentProtocolConformance:
    """Verify that all 5 real Pair A agents implement SpecialistAgent correctly."""

    @pytest.mark.parametrize("agent_class_path", [
        "backend.agents.architecture.agent.ArchitectureAgent",
        "backend.agents.contracts.agent.ContractAgent",
        "backend.agents.dependencies.agent.DependencyAgent",
        "backend.agents.impact.agent.ImpactAgent",
        "backend.agents.security.agent.SecurityAgent",
    ])
    def test_agent_implements_protocol(self, agent_class_path: str):
        """Each agent class must satisfy the SpecialistAgent Protocol."""
        import importlib
        module_path, class_name = agent_class_path.rsplit(".", 1)
        module = importlib.import_module(module_path)
        agent_class = getattr(module, class_name)
        agent = agent_class()
        assert isinstance(agent, SpecialistAgent), (
            f"{class_name} does not implement the SpecialistAgent protocol. "
            f"Ensure it has: async def analyze(change_request, graph, policies) -> List[Finding]"
        )

    @pytest.mark.asyncio
    @pytest.mark.parametrize("agent_class_path", [
        "backend.agents.architecture.agent.ArchitectureAgent",
        "backend.agents.contracts.agent.ContractAgent",
        "backend.agents.dependencies.agent.DependencyAgent",
        "backend.agents.impact.agent.ImpactAgent",
        "backend.agents.security.agent.SecurityAgent",
    ])
    async def test_agent_returns_valid_findings(
        self, agent_class_path: str, sample_change_request, sample_policies
    ):
        """Each agent must return a list of valid Finding objects."""
        import importlib
        module_path, class_name = agent_class_path.rsplit(".", 1)
        module = importlib.import_module(module_path)
        agent_class = getattr(module, class_name)
        agent = agent_class()

        # Use a minimal graph
        graph = nx.MultiDiGraph()
        graph.add_node("test.module", type="service", path="backend/services/test.py")

        findings = await agent.analyze(sample_change_request, graph, sample_policies)

        assert isinstance(findings, list), f"{class_name}.analyze() must return List[Finding]"
        for f in findings:
            assert isinstance(f, Finding), f"{class_name} returned non-Finding object: {type(f)}"
            assert f.evidence, f"{class_name} returned Finding with empty evidence: {f.title}"
            assert f.affected_files, f"{class_name} returned Finding with empty affected_files: {f.title}"
            assert 0.0 <= f.confidence <= 1.0, f"{class_name} returned invalid confidence: {f.confidence}"


# ── No Heuristic Blocks Test ─────────────────────────────────────────────────

class TestNoDeterministicViolationOfBlockingRules:
    """
    Critical: verify that no agent sets blocking=True on a heuristic finding.
    Blocking findings must have confidence == 1.0 (deterministic).
    """

    @pytest.mark.asyncio
    async def test_no_heuristic_blocks(self, sample_change_request, sample_policies):
        """blocking=True must only appear with confidence=1.0 findings."""
        import importlib

        agent_paths = [
            "backend.agents.architecture.agent.ArchitectureAgent",
            "backend.agents.contracts.agent.ContractAgent",
            "backend.agents.dependencies.agent.DependencyAgent",
            "backend.agents.impact.agent.ImpactAgent",
            "backend.agents.security.agent.SecurityAgent",
        ]

        graph = nx.MultiDiGraph()
        graph.add_node("test.module", type="service", path="backend/services/test.py")

        for agent_path in agent_paths:
            module_path, class_name = agent_path.rsplit(".", 1)
            module = importlib.import_module(module_path)
            agent = getattr(module, class_name)()
            findings = await agent.analyze(sample_change_request, graph, sample_policies)

            for f in findings:
                if f.blocking:
                    assert f.confidence == 1.0, (
                        f"VIOLATION: {class_name} set blocking=True with confidence={f.confidence} "
                        f"on finding '{f.title}'. "
                        f"Hard blocks must be deterministic (confidence=1.0). "
                        f"Use blocking=False for heuristic findings — they contribute to REVIEW."
                    )

    @pytest.mark.asyncio
    async def test_impact_agent_never_blocks(self, sample_change_request, sample_policies):
        """Impact Agent must never return blocking=True — it only scores risk."""
        import importlib
        module = importlib.import_module("backend.agents.impact.agent")
        agent = module.ImpactAgent()

        graph = nx.MultiDiGraph()
        findings = await agent.analyze(sample_change_request, graph, sample_policies)

        blocking = [f for f in findings if f.blocking]
        assert not blocking, (
            f"Impact Agent returned {len(blocking)} blocking finding(s). "
            f"Impact Agent must NEVER set blocking=True. "
            f"High blast radius should contribute to REVIEW via risk score only."
        )


# ── Graph Engine Protocol Test ───────────────────────────────────────────────

class TestGraphEngineProtocol:
    """Verify that Pair A's GraphEngine implements the protocol correctly."""

    def test_graph_engine_implements_protocol(self):
        from backend.graph.engine import GraphEngine as RealGraphEngine
        engine = RealGraphEngine()
        assert isinstance(engine, GraphEngine)

    @pytest.mark.asyncio
    async def test_graph_engine_returns_multidigraph(self):
        from backend.graph.engine import GraphEngine as RealGraphEngine
        engine = RealGraphEngine()
        graph = await engine.get_or_build("test-project")
        assert isinstance(graph, nx.MultiDiGraph), (
            "GraphEngine.get_or_build() must return nx.MultiDiGraph"
        )

    def test_graph_engine_serialize_returns_dict(self):
        from backend.graph.engine import GraphEngine as RealGraphEngine
        engine = RealGraphEngine()
        result = engine.serialize("test-project")
        assert isinstance(result, dict)
        assert "nodes" in result
        assert "edges" in result


# ── End-to-End Pre-Flight Test ───────────────────────────────────────────────

class TestEndToEndPreflight:
    """Full pipeline test: intent → orchestrator → agents → decision → response."""

    @pytest.mark.asyncio
    async def test_clean_change_returns_pass(self):
        """A safe, low-impact change should return PASS."""
        from backend.agents.orchestrator import Orchestrator
        from backend.graph.engine import GraphEngine as RealGraphEngine
        from backend.decision.engine import DecisionEngine
        from backend.evidence.store import EvidenceStore
        from backend.agents.architecture.agent import ArchitectureAgent
        from backend.agents.contracts.agent import ContractAgent
        from backend.agents.dependencies.agent import DependencyAgent
        from backend.agents.impact.agent import ImpactAgent
        from backend.agents.security.agent import SecurityAgent
        from backend.api.routes.preflight import PreflightRequest

        orchestrator = Orchestrator(
            agents=[ArchitectureAgent(), ContractAgent(), DependencyAgent(),
                    ImpactAgent(), SecurityAgent()],
            graph_engine=RealGraphEngine(),
            decision_engine=DecisionEngine(),
            evidence_store=EvidenceStore(),
        )

        request = PreflightRequest(
            project_id="test-project",
            change="Add a docstring to the PaymentService.process() method",
            branch="feature/docs",
        )

        response = await orchestrator.run_preflight(request)
        assert response.status == PreflightStatus.PASS, (
            f"Expected PASS for a documentation-only change, got {response.status}. "
            f"Findings: {[f.title for f in response.findings if f.blocking]}"
        )

    @pytest.mark.asyncio
    async def test_forbidden_dependency_returns_block(self):
        """Proposing a forbidden package must return BLOCK."""
        from backend.agents.orchestrator import Orchestrator
        from backend.graph.engine import GraphEngine as RealGraphEngine
        from backend.decision.engine import DecisionEngine
        from backend.evidence.store import EvidenceStore
        from backend.agents.architecture.agent import ArchitectureAgent
        from backend.agents.contracts.agent import ContractAgent
        from backend.agents.dependencies.agent import DependencyAgent
        from backend.agents.impact.agent import ImpactAgent
        from backend.agents.security.agent import SecurityAgent
        from backend.api.routes.preflight import PreflightRequest

        orchestrator = Orchestrator(
            agents=[ArchitectureAgent(), ContractAgent(), DependencyAgent(),
                    ImpactAgent(), SecurityAgent()],
            graph_engine=RealGraphEngine(),
            decision_engine=DecisionEngine(),
            evidence_store=EvidenceStore(),
        )

        request = PreflightRequest(
            project_id="test-project",
            change="Add requests library for HTTP calls",
            branch="feature/http",
            changed_files=["requirements.txt"],
        )

        response = await orchestrator.run_preflight(request)
        assert response.status == PreflightStatus.BLOCK, (
            f"Expected BLOCK for forbidden 'requests' package, got {response.status}"
        )
