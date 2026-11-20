// Feature flags for additive ARCEUS capabilities. All default OFF.

function parseBoolFlag(raw: unknown): boolean {
  if (typeof raw === "boolean") return raw;
  if (typeof raw !== "string") return false;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/**
 * Returns true only when ENABLE_ADAPTIVE_PLANNER is explicitly enabled.
 * Default is OFF so existing ARCEUS behaviour is completely unchanged.
 */
export function isAdaptivePlannerEnabled(override?: boolean): boolean {
  if (typeof override === "boolean") return override;

  if (typeof process !== "undefined" && process.env) {
    const nodeFlag =
      process.env["ENABLE_ADAPTIVE_PLANNER"] ?? process.env["VITE_ENABLE_ADAPTIVE_PLANNER"];
    if (nodeFlag !== undefined) return parseBoolFlag(nodeFlag);
  }

  const metaEnv = (import.meta as { env?: Record<string, unknown> }).env;
  if (metaEnv) {
    const viteFlag = metaEnv["VITE_ENABLE_ADAPTIVE_PLANNER"] ?? metaEnv["ENABLE_ADAPTIVE_PLANNER"];
    if (viteFlag !== undefined) return parseBoolFlag(viteFlag);
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
