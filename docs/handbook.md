# VisionCanvas AI: Official Engineering Handbook
## Onboarding, Coding Standards & Release Guidelines

---

## 1. Engineering & Architecture Principles

*   **Zero Trust Gating**: Treat every boundary (network client, plugin runtime, internal helper library) as untrusted. Enforce authorization checks at every interface.
*   **Separation of Concerns**: Adhere to Clean Architecture. Never couple database, rendering framework, or network details directly to domain entities.
*   **Accessible by Default**: Verify keyboard focus indices (`tabIndex`) and screen reader attributes (`aria-label`) before submitting code changes.
*   **Deterministic & Reproducible**: Ensure dependencies are locked and build processes are deterministic to avoid version mismatches.

---

## 2. Naming Conventions & Coding Standards

### 2.1 TypeScript Standards
*   **Classes**: UpperCamelCase (e.g., `AuthenticationService`).
*   **Interfaces**: UpperCamelCase, no leading `I` prefix (e.g., `UserIdentity`, NOT `IUserIdentity`).
*   **Functions & Variables**: lowerCamelCase (e.g., `verifyToken()`, `tokenLifetimeSec`).
*   **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_SECURITY_CONFIG`).

### 2.2 Python AI Service Standards
*   **Classes**: UpperCamelCase (e.g., `OneEuroFilter`).
*   **Functions & Methods**: snake_case (e.g., `process_frame()`).
*   **Modules & Files**: snake_case (e.g., `hand_tracking_pipeline.py`).

---

## 3. Git Workflow & Commit Standards

### 3.1 Branching Strategy (Git Flow-based)
*   **`main`**: Production release state. Only merged via approved Pull Requests from release branches.
*   **`develop`**: Primary integration branch for active development.
*   **`feature/*`**: Short-lived feature branches branching from `develop`.
*   **`bugfix/*`**: Hotfixes branched from `main` or `develop`.

### 3.2 Commit Message Format (Conventional Commits)
Commits must follow the format: `<type>(<scope>): <description>`
*   **Types**:
    *   `feat`: A new feature implementation.
    *   `fix`: A bug fix.
    *   `docs`: Documentation modifications.
    *   `test`: Adding or updating tests.
*   **Example**:
    ```bash
    git commit -m "feat(security): implement base64url signed JWT verifyToken method"
    ```

---

## 4. Pull Request & Code Review Checklist

Before opening a Pull Request (PR), ensure:
1.  **Strict Type Checking**: Running local compilation tests returns zero errors.
2.  **Test Coverage**: All package unit tests pass.
3.  **No placeholders**: Verify that no placeholder elements or TODO comments remain in the code.
4.  **Review Checklist**:
    *   Does the implementation follow Clean Architecture interfaces?
    *   Are focus controls and screen reader labels mapped for accessibility?
    *   Are all secrets managed using Vault variables?

---

## 5. Performance Budgets

| Metric | Target Budget | Compliance Enforcement |
| :--- | :--- | :--- |
| **WebGL Render Tick** | < 16ms | Monitored by the geometry pass frame budget scheduler. |
| **Inference Pipeline** | < 10ms | Monitored by the AI Orchestrator scheduler. |
| **WSS CRDT Message** | < 5ms | Checked by the Vector Clock state merger. |

---

## 6. Definition of Ready (DoR) & Definition of Done (DoD)

### 6.1 Definition of Ready (DoR)
A task is ready for development when:
*   The requirements specification is clear.
*   Boundary interface schemas are defined.
*   Performance budgets are set.

### 6.2 Definition of Done (DoD)
A task is done and ready for deployment when:
*   Strict compiler checks pass without warnings.
*   Automated Vitest/Pytest suites pass successfully.
*   The implementation is verified against visual and functional regression checks.
*   Documentation files are updated.
