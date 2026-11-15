# ADR & RFC Architecture Decision Governance Kit (`adr-rfc-governance-kit`)

Deterministic **MADR 3.0 Architecture Decision Record (ADR)** and **System Design Request for Comments (RFC)** governance plugin for **Obsidian v1.5.0+**, paired with a turnkey **Pro Engineering Starter Vault**.

## Why Engineering Teams & Architects Use This Kit

- **Strict YAML Frontmatter Schema Linter**: Validates `adr_id`, `status`, `date`, `deciders`, `supersedes`, `cost_impact`, and `security_review` across every ADR and RFC in your vault.
- **Deterministic Lifecycle Transition Engine**: Enforces clean state transitions (`Proposed` -> `Accepted` -> `Deprecated` -> `Superseded by ADR-XXXX`) and prevents invalid backward transitions.
- **Superseding-Chain Integrity Auditor**: Detects duplicate ADR/RFC IDs, self-superseding records, orphan `supersedes` links, and unupdated superseded targets in `< 50 ms`.
- **1-Click Architecture Decision Matrix Generator**: Automatically compiles a clean, sortable Markdown index table (`Architecture-Decision-Matrix.md`) across all vault decisions.
- **100% Local-First & Privacy-Preserving**: Zero external telemetry, zero cloud lock-in, and zero code obfuscation.

## Installation

### Option A: Obsidian Community Plugins / Manual Install (Free MIT Core Plugin)
1. Download `main.js`, `manifest.json`, and `styles.css` from the latest GitHub Release.
2. Copy them into `<YourVault>/.obsidian/plugins/adr-rfc-governance-kit/`.
3. Reload Obsidian and enable **ADR & RFC Architecture Decision Governance Kit** under **Settings -> Community plugins**.

### Option B: Turnkey Commercial Pro Engineering Vault (`$19` / `$39` Team)
1. Download the **Pro Engineering Vault & License Kit** from our official store (`fundingUrl`: <https://b2apps.lemonsqueezy.com/buy/adr-rfc-governance-kit>).
2. Extract `vault-pro/` and open it directly as a ready-to-run Obsidian Vault containing pre-configured MADR 3.0 & RFC templates, the Executive Architecture Governance Dashboard, and production reference decisions (`ADR-0001`, `RFC-0001`).

## Commands Reference (Command Palette)

- **`ADR & RFC Governance: Create New ADR`** — Scaffolds a new MADR 3.0 decision record with valid governance frontmatter.
- **`ADR & RFC Governance: Audit Vault ADRs & RFCs`** — Lints all ADR and RFC Markdown files for schema completeness, duplicate IDs, and superseding-chain consistency.
- **`ADR & RFC Governance: Generate Architecture Decision Matrix`** — Builds the Markdown Architecture Decision Matrix table from your vault's records.

## Pro Vault Features & Transparent Optional Payment Disclosure

- **Free & Open-Source (MIT Plugin)**: All core plugin commands (`Create New ADR`, `Audit Vault ADRs & RFCs`, `Generate Architecture Decision Matrix`), the frontmatter schema linter, and the lifecycle validator are **100% free and MIT-licensed** with zero feature paywalls in `main.js`.
- **Optional Paid Pro Starter Vault (`$19` Indie / `$39` Engineering Team via LemonSqueezy)**: Provides the turnkey `vault-pro/` engineering governance workspace (`00-Architecture-Governance-Dashboard.md`, `Templates/ADR-MADR-Template.md`, `Templates/RFC-System-Design-Template.md`, and reference Zero-Trust & Multi-Region failover architecture records) to save staff engineers and CTOs 15+ hours of vault architecture setup.

## Disclaimer

*Educational & engineering governance workflow tool only; not legal, financial, or formal regulatory compliance certification advice.*
