"""
backend/schemas/shared.py

Shared Pydantic v2 contracts agreed upon by BOTH Pair A and Pair B.
This file is the team boundary. Neither pair may change it unilaterally.
Changes require sign-off from both pairs before merging.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class FindingCategory(str, Enum):
    ARCHITECTURE = "architecture"
    CONTRACT = "contract"
    DEPENDENCY = "dependency"
    SECURITY = "security"
    IMPACT = "impact"


class FindingSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RelationshipType(str, Enum):
    IMPORTS = "imports"
    CALLS = "calls"
    DEPENDS_ON = "depends_on"
    CONSUMES = "consumes"
    PROVIDES = "provides"
    WRITES = "writes"
    READS = "reads"
    PUBLISHES = "publishes"
    SUBSCRIBES = "subscribes"


class PreflightStatus(str, Enum):
    PASS = "PASS"
    REVIEW = "REVIEW"
    BLOCK = "BLOCK"


class EnforcementAction(str, Enum):
    BLOCK = "block"
    REVIEW = "review"
    WARN = "warn"


# ---------------------------------------------------------------------------
# Pair A produces / Pair B consumes: Finding
# The core handoff type between the two pairs.
# ---------------------------------------------------------------------------

class Finding(BaseModel):
    """
    Produced by Pair A's specialist agents.
    Consumed by Pair B's DecisionEngine and EvidenceStore.

    IMPORTANT: Every Finding must include non-empty `evidence` and `affected_files`.
    The `blocking` flag is set ONLY by deterministic rule violations — never by
    probabilistic AI inference (those must set blocking=False).
    """
    id: str = Field(..., description="Unique finding identifier (UUID)")
    change_request_id: str = Field(..., description="ID of the ChangeRequest that triggered this finding")
    category: FindingCategory
    severity: FindingSeverity
    confidence: float = Field(..., ge=0.0, le=1.0, description="Agent confidence in this finding (0.0 = uncertain, 1.0 = certain)")
    title: str = Field(..., description="Short human-readable title (max 80 chars)")
    explanation: str = Field(..., description="Detailed explanation of the finding")
    evidence: List[str] = Field(
        default_factory=list,
        description="Concrete citations: ['backend/api/routes.py:42 → direct DB call', ...]"
    )
    affected_files: List[str] = Field(
        default_factory=list,
        description="List of affected file paths relative to repo root"
    )
    rule_id: Optional[str] = Field(
        default=None,
        description="YAML policy rule that triggered this finding (e.g. 'ARCH-001')"
    )
    remediation: Optional[str] = Field(
        default=None,
        description="Short remediation hint from the agent"
    )
    blocking: bool = Field(
        default=False,
        description="True ONLY for deterministic policy violations. Causes BLOCK status in DecisionEngine."
    )
    blast_radius: Optional[int] = Field(
        default=None,
        description="Number of affected components (set by Impact Agent only)"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Shared: ChangeRequest
# Produced by Pair B's orchestrator after parsing natural language intent.
# Read by Pair A's agents during analysis.
# ---------------------------------------------------------------------------

class ChangeRequest(BaseModel):
    """
    Structured representation of the proposed change.
    Pair B's orchestrator creates this from the natural-language `change` string.
    Pair A's agents read it as their primary input.
    """
    id: str = Field(..., description="Unique change request ID (UUID)")
    project_id: str
    raw_intent: str = Field(..., description="Original natural-language description from the developer")
    changed_files: List[str] = Field(default_factory=list, description="Files the developer intends to modify")
    proposed_packages: List[str] = Field(default_factory=list, description="New packages the change plans to introduce")
    branch: str = Field(default="main")
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Shared: PolicySet
# Loaded from policies/ YAML files by Pair B's orchestrator.
# Passed read-only to Pair A's agents for evaluation.
# ---------------------------------------------------------------------------

class ArchitectureRule(BaseModel):
    id: str = Field(..., description="Rule ID e.g. ARCH-001")
    rule_type: str = Field(..., description="layer_boundary | forbidden_dependency | circular_dependency | contract_compatibility")
    expression: str = Field(..., description="e.g. 'frontend -> database'")
    severity: FindingSeverity = FindingSeverity.HIGH
    enforcement: EnforcementAction = EnforcementAction.BLOCK
    description: Optional[str] = None


class PolicySet(BaseModel):
    """
    Compiled view of all YAML policies for a project.
    Authored by Pair A (policies/*.yaml), loaded by Pair B's orchestrator.
    """
    project_id: str
    architecture_rules: List[ArchitectureRule] = Field(default_factory=list)
    forbidden_packages: List[str] = Field(default_factory=list)
    allowed_licenses: List[str] = Field(default_factory=list)
    contract_breaking_threshold: float = Field(
        default=0.0,
        description="Minimum confidence to treat a contract change as breaking (0.0 = always block)"
    )
    loaded_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Pair B produces: PreflightResponse
# The final output returned to the API caller.
# ---------------------------------------------------------------------------

class RemediationPlan(BaseModel):
    finding_id: str
    steps: List[str] = Field(default_factory=list, description="Ordered, actionable refactoring steps")
    compliant_alternative: Optional[str] = Field(default=None, description="Existing internal alternative to use instead")
    estimated_effort: str = Field(default="MEDIUM", description="LOW | MEDIUM | HIGH")
    references: List[str] = Field(default_factory=list, description="ADR links, policy rule IDs, internal docs")


class PreflightResponse(BaseModel):
    """
    Produced by Pair B's DecisionEngine.
    Returned by Pair B's FastAPI routes.
    """
    request_id: str
    status: PreflightStatus
    risk: str = Field(..., description="LOW | MEDIUM | HIGH | CRITICAL")
    findings: List[Finding]
    affected_files_count: int
    recommendation: Optional[str] = None
    remediation_available: bool = False
    evaluated_at: datetime = Field(default_factory=datetime.utcnow)
