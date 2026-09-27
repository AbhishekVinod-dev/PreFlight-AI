# Skill: Architecture Pre-Flight Analysis

## When to activate this skill
Use this skill when:
- Running a pre-flight check on a proposed change
- Reviewing whether a new module, dependency, or API change is safe
- Analyzing blast radius of a proposed modification
- Generating a remediation plan for a blocked change

---

## Pre-Flight Analysis Workflow

### Step 1: Understand the proposed change
Ask: "What exactly is the developer proposing to change?"
Extract:
- Affected files or modules
- Any new packages being introduced
- Any interface changes (API endpoints, schemas, events)
- Any database schema changes

### Step 2: Check architecture rules
```
1. Does the change cross any layer boundaries?
   → Check policies/architecture.yaml for layer rules
   → Use the knowledge graph to trace import paths

2. Does the change create circular dependencies?
   → Run cycle detection on proposed import additions

3. Does the change duplicate an existing abstraction?
   → Search the graph for services with similar names/responsibilities
```

### Step 3: Check contract safety
```
1. Does the change modify any API endpoint signatures?
   → Find all consumers of that endpoint in the graph
   → Check if the change is additive-only (safe) or breaking (BLOCK/REVIEW)

2. Does the change modify database schemas?
   → Find all services that read/write those tables
   → Breaking column removal or type change = BLOCK

3. Does the change modify event schemas?
   → Find all subscribers in the graph
```

### Step 4: Check dependency safety
```
1. Is the proposed package in the forbidden list?
   → Check policies/dependencies.yaml → forbidden_packages
   → If yes: BLOCK, suggest internal alternative

2. Is the package deprecated?
   → Check PyPI metadata
   → If yes: BLOCK

3. Does an internal abstraction already exist?
   → Search graph for adapters/services covering the same concern
```

### Step 5: Calculate impact
```
1. Traverse graph from modified symbols using nx.descendants()
2. Count affected files, services, endpoints, tables, test files
3. Record blast_radius in the Impact Finding
4. High blast_radius + undocumented consumers → REVIEW
```

### Step 6: Check security boundaries
```
1. Does the change expose database access to untrusted tiers? → BLOCK
2. Are credentials or secrets hardcoded? → BLOCK
3. Is an auth middleware being bypassed? → BLOCK
```

### Step 7: Aggregate and decide
```
BLOCK  → Any Finding(blocking=True) from steps 2-6
REVIEW → High risk score OR low-confidence heuristic findings
PASS   → No blocks, risk within threshold
```

---

## Evidence Requirements
Every finding generated through this skill must cite:
- File path + line number (e.g., `backend/api/routes.py:42`)
- The specific AST symbol or import involved
- The policy rule ID that was violated (e.g., `ARCH-001`)
- Confidence score (0.0–1.0)

---

## Remediation Templates

### For layer boundary violations (ARCH-001):
```
BLOCK: Direct frontend→database import detected.
Remediation steps:
1. Create or locate the appropriate Service layer class
2. Move the database logic into the Service
3. Have the frontend module import the Service instead
4. Update tests to mock the Service, not the database
```

### For breaking contract changes:
```
BLOCK: Removing required field X from endpoint Y breaks N consumers.
Remediation steps:
1. Mark the field as Optional with a deprecation notice
2. Coordinate with all consuming teams to migrate
3. Set a deprecation timeline (minimum 2 sprint cycles)
4. Only remove after all consumers have migrated
```

### For forbidden dependencies:
```
BLOCK: Package 'requests' is forbidden (use httpx for async-native HTTP).
Remediation steps:
1. Replace: import requests → import httpx
2. Update HTTP calls: requests.get() → await httpx.AsyncClient().get()
3. Wrap in async context manager for connection pooling
```
