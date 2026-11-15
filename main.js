/**
 * ADR & RFC Architecture Decision Governance Kit — Obsidian Community Plugin Entry Point
 * Dual-compatible: runs inside Obsidian Desktop/Mobile and passes standalone Node 18+ verification.
 */
import {
  parseFrontmatter,
  lintDecisionDocument,
  validateStatusTransition,
  auditVaultDecisions,
  generateDecisionMatrixMarkdown,
  scaffoldNewAdrMarkdown
} from "./src/governance.mjs";

export class AdrRfcGovernancePlugin {
  constructor(app, manifest) {
    this.app = app || null;
    this.manifest = manifest || { id: "adr-rfc-governance-kit", version: "1.0.0" };
    this.registeredCommands = [];
    this.ribbonIcons = [];
  }

  addRibbonIcon(icon, title, callback) {
    const entry = { icon, title, callback };
    this.ribbonIcons.push(entry);
    return entry;
  }

  addCommand(commandSpec) {
    this.registeredCommands.push(commandSpec);
    return commandSpec;
  }

  async onload() {
    this.addRibbonIcon(
      "shield-check",
      "Audit Vault ADRs & RFCs",
      async () => await this.runVaultGovernanceAudit()
    );

    this.addCommand({
      id: "create-new-adr",
      name: "Create New ADR",
      callback: async () => await this.createNewAdrRecord()
    });

    this.addCommand({
      id: "audit-vault-adrs-rfcs",
      name: "Audit Vault ADRs & RFCs",
      callback: async () => await this.runVaultGovernanceAudit()
    });

    this.addCommand({
      id: "generate-architecture-decision-matrix",
      name: "Generate Architecture Decision Matrix",
      callback: async () => await this.buildVaultDecisionMatrix()
    });
  }

  onunload() {
    this.registeredCommands = [];
    this.ribbonIcons = [];
  }

  async createNewAdrRecord(opts = {}) {
    const content = scaffoldNewAdrMarkdown(opts);
    if (this.app?.vault?.create) {
      const targetPath = `Decisions/${opts.adr_id || "ADR-0002"}-${(opts.title || "New-Decision")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}.md`;
      await this.app.vault.create(targetPath, content);
    }
    return content;
  }

  async collectDecisionFilesFromApp() {
    if (!this.app?.vault?.getMarkdownFiles) return [];
    const mdFiles = this.app.vault.getMarkdownFiles();
    const out = [];
    for (const file of mdFiles) {
      if (file.path.includes("Templates/") || file.path.includes("00-Architecture-Governance-Dashboard")) {
        continue;
      }
      const content = await this.app.vault.read(file);
      const { frontmatter } = parseFrontmatter(content);
      if (frontmatter && frontmatter.adr_id) {
        out.push({ path: file.path, content });
      }
    }
    return out;
  }

  async runVaultGovernanceAudit(providedFiles = null) {
    const files = providedFiles || (await this.collectDecisionFilesFromApp());
    return auditVaultDecisions(files);
  }

  async buildVaultDecisionMatrix(providedFiles = null) {
    const audit = await this.runVaultGovernanceAudit(providedFiles);
    const matrixMd = generateDecisionMatrixMarkdown(audit.records);
    if (this.app?.vault?.adapter?.write) {
      await this.app.vault.adapter.write("Architecture-Decision-Matrix.md", matrixMd);
    }
    return matrixMd;
  }
}

export {
  parseFrontmatter,
  lintDecisionDocument,
  validateStatusTransition,
  auditVaultDecisions,
  generateDecisionMatrixMarkdown,
  scaffoldNewAdrMarkdown
};

export default AdrRfcGovernancePlugin;
