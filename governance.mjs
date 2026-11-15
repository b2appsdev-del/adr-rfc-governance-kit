/**
 * ADR & RFC Architecture Decision Governance Engine (MADR 3.0 + RFC Schema Linter,
 * Status Lifecycle Transition Engine, Superseding-Chain Validator & Matrix Generator)
 */

export const VALID_BASE_STATUSES = ["Proposed", "Accepted", "Rejected", "Deprecated"];
export const SUPERSEDED_RE = /^Superseded by (ADR-\d{4}|RFC-\d{4})$/;
export const ID_RE = /^(ADR|RFC)-\d{4}$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const VALID_COST_IMPACTS = ["None", "Low", "Medium", "High"];
export const VALID_SECURITY_REVIEWS = ["Pending", "Approved", "Not Required", "Action Required"];

/**
 * Parses YAML frontmatter from a Markdown string (zero external dependencies).
 * @param {string} markdown
 * @returns {{ frontmatter: Record<string, any> | null, body: string, rawFrontmatter: string }}
 */
export function parseFrontmatter(markdown) {
  const clean = String(markdown || "").replace(/^\uFEFF/, "");
  const match = clean.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: null, body: clean, rawFrontmatter: "" };
  }
  const rawFrontmatter = match[1];
  const body = match[2];
  const frontmatter = {};

  for (const line of rawFrontmatter.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const kv = trimmed.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let rawVal = kv[2].trim();

    if (rawVal.startsWith("[") && rawVal.endsWith("]")) {
      const inner = rawVal.slice(1, -1).trim();
      frontmatter[key] = inner
        ? inner.split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean)
        : [];
    } else if (rawVal === "null" || rawVal === "~" || rawVal === "") {
      frontmatter[key] = null;
    } else if (rawVal === "true") {
      frontmatter[key] = true;
    } else if (rawVal === "false") {
      frontmatter[key] = false;
    } else {
      frontmatter[key] = rawVal.replace(/^["']|["']$/g, "");
    }
  }

  return { frontmatter, body, rawFrontmatter };
}

/**
 * Validates whether a status value is valid per ADR/RFC governance rules.
 * @param {string} status
 * @returns {boolean}
 */
export function isValidStatus(status) {
  if (!status || typeof status !== "string") return false;
  return VALID_BASE_STATUSES.includes(status) || SUPERSEDED_RE.test(status);
}

/**
 * Validates a lifecycle transition from currentStatus -> nextStatus.
 * Allowed transitions:
 * - Proposed -> Accepted | Rejected | Deprecated
 * - Accepted -> Deprecated | Superseded by ADR-XXXX / RFC-XXXX
 * - Deprecated -> Superseded by ADR-XXXX / RFC-XXXX
 * @param {string} currentStatus
 * @param {string} nextStatus
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function validateStatusTransition(currentStatus, nextStatus) {
  if (!isValidStatus(currentStatus)) {
    return { allowed: false, reason: `Invalid current status: '${currentStatus}'` };
  }
  if (!isValidStatus(nextStatus)) {
    return { allowed: false, reason: `Invalid target status: '${nextStatus}'` };
  }
  if (currentStatus === nextStatus) {
    return { allowed: true };
  }

  if (currentStatus === "Proposed") {
    if (["Accepted", "Rejected", "Deprecated"].includes(nextStatus)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: "A 'Proposed' record must be 'Accepted' before it can be superseded"
    };
  }

  if (currentStatus === "Accepted") {
    if (nextStatus === "Deprecated" || SUPERSEDED_RE.test(nextStatus)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Cannot transition an 'Accepted' record back to '${nextStatus}'`
    };
  }

  if (currentStatus === "Deprecated") {
    if (SUPERSEDED_RE.test(nextStatus)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Cannot transition a 'Deprecated' record to '${nextStatus}'`
    };
  }

  return {
    allowed: false,
    reason: `Terminal status '${currentStatus}' cannot transition to '${nextStatus}'`
  };
}

/**
 * Validates a single ADR or RFC Markdown document against the MADR 3.0 & RFC governance schema.
 * Required schema fields: adr_id, status, date, deciders, supersedes, cost_impact, security_review
 * @param {string} markdown
 * @param {{ isTemplate?: boolean }} [options]
 * @returns {{ valid: boolean, errors: string[], warnings: string[], frontmatter: Record<string, any> | null }}
 */
export function lintDecisionDocument(markdown, options = {}) {
  const errors = [];
  const warnings = [];
  const { frontmatter, body } = parseFrontmatter(markdown);

  if (!frontmatter) {
    return {
      valid: false,
      errors: ["Missing YAML frontmatter block (---)"],
      warnings,
      frontmatter: null
    };
  }

  const requiredFields = [
    "adr_id",
    "status",
    "date",
    "deciders",
    "supersedes",
    "cost_impact",
    "security_review"
  ];

  for (const field of requiredFields) {
    if (!(field in frontmatter)) {
      errors.push(`Missing required frontmatter field '${field}'`);
    }
  }

  if (frontmatter.adr_id && !ID_RE.test(String(frontmatter.adr_id))) {
    errors.push(`Invalid 'adr_id' format '${frontmatter.adr_id}' (expected ADR-XXXX or RFC-XXXX)`);
  }

  if (frontmatter.status && !isValidStatus(String(frontmatter.status))) {
    errors.push(
      `Invalid 'status' value '${frontmatter.status}' (expected Proposed, Accepted, Rejected, Deprecated, or 'Superseded by ADR-XXXX')`
    );
  }

  if (frontmatter.date && !DATE_RE.test(String(frontmatter.date))) {
    errors.push(`Invalid 'date' format '${frontmatter.date}' (expected YYYY-MM-DD)`);
  }

  if ("deciders" in frontmatter) {
    const d = frontmatter.deciders;
    const hasDeciders = Array.isArray(d) ? d.length > 0 : typeof d === "string" && d.trim().length > 0;
    if (!hasDeciders) {
      errors.push("Field 'deciders' must specify at least one decision owner or group");
    }
  }

  if ("supersedes" in frontmatter && frontmatter.supersedes !== null && frontmatter.supersedes !== "None") {
    const sup = String(frontmatter.supersedes);
    if (!ID_RE.test(sup)) {
      errors.push(`Invalid 'supersedes' reference '${sup}' (expected None, null, or ADR-XXXX / RFC-XXXX)`);
    }
    if (frontmatter.adr_id && sup === String(frontmatter.adr_id)) {
      errors.push(`Record '${frontmatter.adr_id}' cannot supersede itself`);
    }
  }

  if (frontmatter.cost_impact && !VALID_COST_IMPACTS.includes(String(frontmatter.cost_impact))) {
    errors.push(
      `Invalid 'cost_impact' value '${frontmatter.cost_impact}' (expected ${VALID_COST_IMPACTS.join(" | ")})`
    );
  }

  if (
    frontmatter.security_review &&
    !VALID_SECURITY_REVIEWS.includes(String(frontmatter.security_review))
  ) {
    errors.push(
      `Invalid 'security_review' value '${frontmatter.security_review}' (expected ${VALID_SECURITY_REVIEWS.join(" | ")})`
    );
  }

  if (!options.isTemplate) {
    if (!/##\s+Context/i.test(body)) {
      warnings.push("Missing recommended MADR section '## Context and Problem Statement'");
    }
    if (!/##\s+Decision/i.test(body)) {
      warnings.push("Missing recommended MADR section '## Decision Outcome'");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    frontmatter
  };
}

/**
 * Audits a collection of ADR/RFC documents for duplicate IDs and broken superseding chains.
 * @param {Array<{ path: string, content: string }>} files
 * @returns {{ valid: boolean, recordCount: number, issues: Array<{ path: string, message: string }>, records: Array<any> }}
 */
export function auditVaultDecisions(files) {
  const issues = [];
  const records = [];
  const byId = new Map();

  for (const file of files) {
    const res = lintDecisionDocument(file.content);
    if (!res.valid) {
      for (const err of res.errors) {
        issues.push({ path: file.path, message: err });
      }
    }
    if (res.frontmatter && res.frontmatter.adr_id) {
      const id = String(res.frontmatter.adr_id);
      if (byId.has(id)) {
        issues.push({
          path: file.path,
          message: `Duplicate adr_id '${id}' (also declared in '${byId.get(id).path}')`
        });
      } else {
        const rec = {
          path: file.path,
          adr_id: id,
          title: res.frontmatter.title || id,
          status: String(res.frontmatter.status || "Unknown"),
          date: String(res.frontmatter.date || ""),
          deciders: Array.isArray(res.frontmatter.deciders)
            ? res.frontmatter.deciders.join(", ")
            : String(res.frontmatter.deciders || ""),
          supersedes:
            res.frontmatter.supersedes && res.frontmatter.supersedes !== "None"
              ? String(res.frontmatter.supersedes)
              : "None",
          cost_impact: String(res.frontmatter.cost_impact || "None"),
          security_review: String(res.frontmatter.security_review || "Pending")
        };
        byId.set(id, rec);
        records.push(rec);
      }
    }
  }

  for (const rec of records) {
    if (rec.supersedes !== "None") {
      const target = byId.get(rec.supersedes);
      if (!target) {
        issues.push({
          path: rec.path,
          message: `${rec.adr_id} declares supersedes='${rec.supersedes}', but '${rec.supersedes}' was not found in vault`
        });
      } else if (target.status !== `Superseded by ${rec.adr_id}`) {
        issues.push({
          path: target.path,
          message: `${target.adr_id} is superseded by ${rec.adr_id}, so its status must be 'Superseded by ${rec.adr_id}' (found '${target.status}')`
        });
      }
    }

    const supMatch = rec.status.match(SUPERSEDED_RE);
    if (supMatch) {
      const newerId = supMatch[1];
      if (!byId.has(newerId)) {
        issues.push({
          path: rec.path,
          message: `${rec.adr_id} has status '${rec.status}', but superseding record '${newerId}' does not exist`
        });
      }
    }
  }

  records.sort((a, b) => a.adr_id.localeCompare(b.adr_id));
  return {
    valid: issues.length === 0,
    recordCount: records.length,
    issues,
    records
  };
}

/**
 * Generates a deterministic Markdown Architecture Decision Matrix table from audited records.
 * @param {Array<any>} records
 * @returns {string}
 */
export function generateDecisionMatrixMarkdown(records) {
  const sorted = [...records].sort((a, b) => String(a.adr_id).localeCompare(String(b.adr_id)));
  const lines = [
    "# Architecture Decision Matrix (ADR & RFC Index)",
    "",
    "> *Auto-generated by ADR & RFC Architecture Decision Governance Kit (`adr-rfc-governance-kit`).*",
    "",
    "| ID | Title | Status | Date | Deciders | Supersedes | Cost Impact | Security Review |",
    "| :--- | :--- | :--- | :---: | :--- | :---: | :---: | :---: |"
  ];

  for (const r of sorted) {
    const decidersStr = Array.isArray(r.deciders) ? r.deciders.join(", ") : String(r.deciders || "");
    lines.push(
      `| **${r.adr_id}** | ${r.title || r.adr_id} | \`${r.status}\` | ${r.date} | ${decidersStr} | ${r.supersedes || "None"} | ${r.cost_impact} | ${r.security_review} |`
    );
  }

  lines.push("");
  lines.push(
    "*Disclaimer: Educational & engineering governance workflow tool only; not legal, financial, or formal regulatory compliance certification advice.*"
  );
  return lines.join("\n");
}

/**
 * Scaffolds a new MADR 3.0 Markdown document with valid governance frontmatter.
 * @param {{ adr_id: string, title: string, date: string, deciders?: string[], cost_impact?: string, security_review?: string }} params
 * @returns {string}
 */
export function scaffoldNewAdrMarkdown({
  adr_id = "ADR-0002",
  title = "New Architecture Decision",
  date = "2026-11-15",
  deciders = ["Staff Architecture Group"],
  cost_impact = "Low",
  security_review = "Pending"
} = {}) {
  return [
    "---",
    `adr_id: ${adr_id}`,
    `title: "${title}"`,
    "status: Proposed",
    `date: ${date}`,
    `deciders: [${deciders.map((d) => `"${d}"`).join(", ")}]`,
    "supersedes: None",
    `cost_impact: ${cost_impact}`,
    `security_review: ${security_review}`,
    "---",
    "",
    `# ${adr_id}: ${title}`,
    "",
    "## Context and Problem Statement",
    "",
    "Describe the architectural context, technical constraints, and engineering problem being solved.",
    "",
    "## Decision Drivers",
    "",
    "- Reliability & availability targets",
    "- Operational cost & latency bounds",
    "- Security & zero-trust posture",
    "",
    "## Considered Options",
    "",
    "1. **Option 1**: Primary architecture candidate",
    "2. **Option 2**: Alternative trade-off",
    "",
    "## Decision Outcome",
    "",
    "Chosen option: **Option 1**, because it satisfies all latency, security, and operational constraints.",
    ""
  ].join("\n");
}
