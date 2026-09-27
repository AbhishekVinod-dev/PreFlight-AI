"""
backend/agents/protocols.py

Formal protocol definitions that BOTH pairs must conform to.

Pair A: implement these protocols in your real agents.
Pair B: code against these protocols — never against concrete Pair A classes.

This file is OWNED BY BOTH PAIRS. Changes require sign-off from both.
"""

from __future__ import annotations

from typing import List, Protocol, runtime_checkable

import networkx as nx

from backend.schemas.shared import (
    ChangeRequest,
    Finding,
    PolicySet,
    PreflightResponse,
)


@runtime_checkable
class SpecialistAgent(Protocol):
    """
    The interface every Pair A specialist agent must implement.
    Pair B's orchestrator only ever sees this Protocol — never concrete agents.

    Implementation rules (Pair A):
    - analyze() must be async
    - Return List[Finding] — never raise exceptions for domain findings
    - Set Finding.blocking=True ONLY for deterministic rule violations
    - Every Finding must have non-empty evidence and affected_files
    - Never mutate the graph argument

    Usage in orchestrator (Pair B):
    - Inject as List[SpecialistAgent] via constructor
    - Call via: await asyncio.gather(*[a.analyze(cr, g, p) for a in agents])
    """

    async def analyze(
        self,
        change_request: ChangeRequest,
        graph: nx.MultiDiGraph,
        policies: PolicySet,
    ) -> List[Finding]:
        """
        Analyze the proposed change against this agent's domain.

        Args:
            change_request: Structured representation of what the developer
                            wants to change. Read-only.
            graph:          Repository knowledge graph. READ-ONLY — never mutate.
            policies:       Compiled YAML policy rules. Read-only.

        Returns:
            List of findings. Empty list = no issues found in this domain.
        """
        ...


@runtime_checkable
class GraphEngine(Protocol):
    """
    The interface for Pair A's NetworkX knowledge graph engine.
    Pair B's orchestrator and remediation planner use this Protocol.

    Implementation rules (Pair A):
    - get_or_build() must be async (may trigger re-indexing)
    - serialize() must be synchronous and return JSON-safe dict
    - The returned MultiDiGraph is READ-ONLY for Pair B consumers

    Usage:
    - Orchestrator: graph = await graph_engine.get_or_build(project_id)
    - API route:    data  = graph_engine.serialize(project_id)
    """

    async def get_or_build(self, project_id: str) -> nx.MultiDiGraph:
        """
        Return the cached graph for a project, or build it fresh.
        The returned graph must not be mutated by callers.
        """
        ...

    def serialize(self, project_id: str) -> dict:
        """
        Return the graph as a JSON-serializable adjacency dict for the API.
        """
        ...


@runtime_checkable
class PolicyLoader(Protocol):
    """
    The interface for loading compiled PolicySets.
    Pair A authors the YAML. Pair B's orchestrator calls this to load them.
    """

    def load(self, project_id: str) -> PolicySet:
        """Load and compile the PolicySet for a given project."""
        ...
