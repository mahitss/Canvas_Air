# VisionCanvas AI: Enterprise Threat Model
## STRIDE Analysis, Attack Vectors & Incident Response

---

## 1. High-Value Assets

The platform tracks and protects the following high-value assets:
*   **A-1: User Credentials & Session Keys**: Access variables allowing interface modification.
*   **A-2: Collaborative Canvas State Logs**: Core intellectual property stored in CRDT schemas.
*   **A-3: Private Camera Stream Landmarks**: User physical coordinates captured in real-time.
*   **A-4: Decryption Keys & Secrets Vaults**: Symmetric salting credentials used by the database engines.
*   **A-5: Sandboxed Plugin Executable Code**: Extensions loading into the browser runtime.

---

## 2. Trust Boundaries

The architecture maps three distinct Trust Boundaries:
*   **TB-1 (Browser Sandbox to Local OS)**: Separates sandboxed script engines from the local file system.
*   **TB-2 (Client Machine to Cloud Gateway)**: Separates the local workspace from public networks.
*   **TB-3 (API Gateway to Database Infrastructure)**: Separates the public internet from internal microservices.

---

## 3. Attack Tree: Arbitrary Canvas Modification

The following tree maps vectors to execute unauthorized canvas state edits:

```
                  [Modify Target Canvas Without Authorization]
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
[Hijack Peer Session JWT Token]                         [Bypass Plugin Sandbox Gating]
         │                                                       │
  ┌──────┴──────┐                                         ┌──────┴──────┐
  ▼             ▼                                         ▼             ▼
[Brute Force] [Man-in-the-Middle]                   [Aria Leak]   [Context Escape]
```

---

## 4. STRIDE Analysis

| Threat Category | Description | Target Asset | Severity | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | Adversary injects mock device identifiers. | Session Registry | High | Enforce trusted device signature verification. |
| **Tampering** | User modifies history logs offline. | CRDT Event Logs | High | Verify local updates using DJB2 integrity checks. |
| **Repudiation** | User denies performing database edits. | Audit Trail | Medium | Sign all logs in a SHA256 cryptographic chain. |
| **Info Leak** | Malicious plugin reads coordinates. | Video Landmarks | Critical | Proxied Web Worker context sandboxing. |
| **DoS** | Malicious socket sends stream commands. | WebSocket Port | High | Apply rate limit constraints per socket. |
| **Elevation** | Guest session executes host commands. | Policy Engine | Critical | Enforce strict ABAC checks with Deny-Overrides. |

---

## 5. Specific Threat Scenarios & Mitigations

### 5.1 AI & Prompt Injection Risks
*   **Scenario**: User inputs malicious sketches or metadata designed to compromise the layout analyzer.
*   **Mitigation**: Run inputs through a validation wrapper before passing them to the translation model.

### 5.2 Supply Chain Risks
*   **Scenario**: Dependency contamination of workspace npm packages.
*   **Mitigation**: Enforce package lock files and run security scanning during builds.

### 5.3 Offline Synchronization Risks
*   **Scenario**: Hijacking the offline buffer to replay actions upon reconnection.
*   **Mitigation**: Check client clock offsets and vector clock sequences before applying updates.

---

## 6. Incident Response Hooks

*   **IR-Hook-1 (Emergency Session Rejection)**: Immediate revocation of all session tokens matching a compromised user ID.
*   **IR-Hook-2 (Secret Key Rotation)**: Instantly invalidates current vault secrets and re-encrypts values with a new salt key.
*   **IR-Hook-3 (Safe Mode Isolation)**: Instantly disables all active plugins if a runtime crash is detected.
