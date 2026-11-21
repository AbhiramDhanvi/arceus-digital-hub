// Feature flags for additive MiraiAi capabilities. All default OFF.

function parseBoolFlag(raw: unknown): boolean {
  if (typeof raw === "boolean") return raw;
  if (typeof raw !== "string") return false;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/**
 * Returns true only when ENABLE_ADAPTIVE_PLANNER is explicitly enabled.
 * Default is OFF so existing MiraiAi behaviour is completely unchanged.
 */
export function isAdaptivePlannerEnabled(override?: boolean): boolean {
  if (typeof override === "boolean") return override;

  const metaEnv = (import.meta as { env?: Record<string, unknown> }).env;
  if (metaEnv && metaEnv["VITE_ENABLE_ADAPTIVE_PLANNER"] !== undefined) {
    return parseBoolFlag(metaEnv["VITE_ENABLE_ADAPTIVE_PLANNER"]);
  }

  if (typeof process !== "undefined" && process.env) {
    const nodeFlag =
      process.env["VITE_ENABLE_ADAPTIVE_PLANNER"] ?? process.env["ENABLE_ADAPTIVE_PLANNER"];
    if (nodeFlag !== undefined) return parseBoolFlag(nodeFlag);
  }

  if (metaEnv && metaEnv["ENABLE_ADAPTIVE_PLANNER"] !== undefined) {
    return parseBoolFlag(metaEnv["ENABLE_ADAPTIVE_PLANNER"]);
  }

  return false;
}

export function getNirantarAsrUrl(): string | null {
  if (typeof process !== "undefined" && process.env) {
    const u = process.env["NIRANTAR_ASR_URL"] ?? process.env["VITE_NIRANTAR_ASR_URL"];
    if (u && u.trim()) return u.trim();
  }
  const metaEnv = (import.meta as { env?: Record<string, unknown> }).env;
  const u = metaEnv?.["VITE_NIRANTAR_ASR_URL"];
  return typeof u === "string" && u.trim() ? u.trim() : null;
}
