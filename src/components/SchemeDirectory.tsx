import { useEffect, useMemo, useState } from "react";
import { SCHEMES } from "@/lib/eligibility";

/** [slug, name, level C|S, state or ministry, tags] — factual myScheme index; discovery only, never a verdict. */
type Row = [string, string, "C" | "S", string, string];
/** myScheme slug → MiraiAi rule-coded scheme id (only these can be checked). */
export const CHECKABLE: Record<string, string> = {
  "pm-kisan": "pm-kisan", pmfby: "pmfby", pmsby: "pmsby", pmjjby: "pmjjby", apy: "apy", pmuy: "pmuy", pmmy: "mudra",
  "pm-svanidhi": "svanidhi", pmv: "pmv", sui: "standup", "csss-cus": "pmusp", nmmss: "nmmss", "pmay-u": "pmayu", ssy: "ssy",
};
const PAGE = 20;

export function SchemeDirectory() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState(false);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<"" | "C" | "S">("");
  const [place, setPlace] = useState("");
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    let live = true;
    fetch("/data/myscheme-index.json").then(r => r.json() as Promise<Row[]>).then(d => { if (live) setRows(d); }).catch(() => { if (live) setErr(true); });
    return () => { live = false; };
  }, []);
  useEffect(() => setShown(PAGE), [q, level, place]);

  const places = useMemo(() => rows ? [...new Set(rows.filter(r => !level || r[2] === level).map(r => r[3]))].sort() : [], [rows, level]);
  const list = useMemo(() => {
    if (!rows) return [];
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter(r => (!level || r[2] === level) && (!place || r[3] === place) &&
      words.every(w => r[1].toLowerCase().includes(w) || r[4].toLowerCase().includes(w) || r[0] === w));
  }, [rows, q, level, place]);

  function check(id: string) {
    window.location.hash = "assistant"; window.scrollTo(0, 0);
    window.setTimeout(() => window.dispatchEvent(new CustomEvent("arceus:scheme", { detail: id })), 0);
  }

  return (
    <section className="wrap landing-section mx-auto sd" id="schemes" aria-labelledby="sd-title">
      <div className="eyebrow items-center flex gap-[8px] tracking-[0.15em]"><span className="h-px w-[16px]" />ALL SCHEMES</div>
      <h2 id="sd-title">Search {rows ? rows.length.toLocaleString("en-IN") : "the"} schemes listed on myScheme</h2>
      <p className="sd-note">This list is for finding schemes only — MiraiAi does not decide eligibility for these. MiraiAi has source-cited rules for {SCHEMES.length} schemes; the ones in this list are marked “MiraiAi can check”.</p>
      <div className="sd-filters" role="search">
        <label><span>Search by name or topic</span><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. scholarship, pension, farmer" /></label>
        <label><span>Level</span><select value={level} onChange={e => { setLevel(e.target.value as "" | "C" | "S"); setPlace(""); }}><option value="">All</option><option value="C">Central</option><option value="S">State / UT</option></select></label>
        <label><span>{level === "C" ? "Ministry" : "State / ministry"}</span><select value={place} onChange={e => setPlace(e.target.value)}><option value="">All</option>{places.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
      </div>
      {err && <p role="alert" className="sd-note">The scheme list could not load. Try myscheme.gov.in directly.</p>}
      {!rows && !err && <p className="sd-note" aria-live="polite">Loading the list…</p>}
      {rows && <p className="sd-count" aria-live="polite">{list.length.toLocaleString("en-IN")} result{list.length === 1 ? "" : "s"}</p>}
      <ul className="sd-list">
        {list.slice(0, shown).map(r => {
          const id = CHECKABLE[r[0]];
          return (
            <li key={r[0]} className="sd-item">
              <div className="sd-main">
                <a href={`https://www.myscheme.gov.in/schemes/${r[0]}`} target="_blank" rel="noreferrer">{r[1]}</a>
                <span className="sd-meta"><b>{r[2] === "C" ? "Central" : "State"}</b> · {r[3]}{r[4] ? ` · ${r[4].split(",").slice(0, 3).join(",")}` : ""}</span>
              </div>
              {id && <button type="button" className="sd-check" onClick={() => check(id)}>MiraiAi can check</button>}
            </li>
          );
        })}
      </ul>
      {shown < list.length && <button type="button" className="button outline sd-more" onClick={() => setShown(n => n + PAGE)}>Show {Math.min(PAGE, list.length - shown)} more</button>}
    </section>
  );
}
