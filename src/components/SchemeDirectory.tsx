import { useEffect, useMemo, useState } from "react";
import { SCHEMES } from "@/lib/eligibility";
import { getSiteStrings, useAppLanguage } from "@/lib/i18n";

/** [slug, name, level C|S, state or ministry, tags] — factual myScheme index; discovery only, never a verdict. */
type Row = [string, string, "C" | "S", string, string];
/** myScheme slug → MiraiAi rule-coded scheme id (only these can be checked). */
export const CHECKABLE: Record<string, string> = {
  "pm-kisan": "pm-kisan", pmfby: "pmfby", pmsby: "pmsby", pmjjby: "pmjjby", apy: "apy", pmuy: "pmuy", pmmy: "mudra",
  "pm-svanidhi": "svanidhi", pmv: "pmv", sui: "standup", "csss-cus": "pmusp", nmmss: "nmmss", "pmay-u": "pmayu", ssy: "ssy",
};
const PAGE = 20;

export function SchemeDirectory() {
  const [lang] = useAppLanguage();
  const d = getSiteStrings(lang).directory;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState(false);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<"" | "C" | "S">("");
  const [place, setPlace] = useState("");
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    let live = true;
    fetch("/data/myscheme-index.json").then(r => r.json() as Promise<Row[]>).then(data => { if (live) setRows(data); }).catch(() => { if (live) setErr(true); });
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
      <div className="eyebrow items-center flex gap-[8px] tracking-[0.15em]"><span className="h-px w-[16px]" />{d.eyebrow}</div>
      <h2 id="sd-title">{d.heading(rows ? rows.length.toLocaleString("en-IN") : null)}</h2>
      <p className="sd-note">{d.note(SCHEMES.length)}</p>
      <div className="sd-filters" role="search">
        <label><span>{d.searchLabel}</span><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={d.searchPlaceholder} /></label>
        <label><span>{d.levelLabel}</span><select value={level} onChange={e => { setLevel(e.target.value as "" | "C" | "S"); setPlace(""); }}><option value="">{d.all}</option><option value="C">{d.central}</option><option value="S">{d.stateUt}</option></select></label>
        <label><span>{level === "C" ? d.ministry : d.stateOrMinistry}</span><select value={place} onChange={e => setPlace(e.target.value)}><option value="">{d.all}</option>{places.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
      </div>
      {err && <p role="alert" className="sd-note">{d.loadError}</p>}
      {!rows && !err && <p className="sd-note" aria-live="polite">{d.loading}</p>}
      {rows && <p className="sd-count" aria-live="polite">{d.resultsCount(list.length)}</p>}
      <ul className="sd-list">
        {list.slice(0, shown).map(r => {
          const id = CHECKABLE[r[0]];
          return (
            <li key={r[0]} className="sd-item">
              <div className="sd-main">
                <a href={`https://www.myscheme.gov.in/schemes/${r[0]}`} target="_blank" rel="noreferrer">{r[1]}</a>
                <span className="sd-meta"><b>{r[2] === "C" ? d.central : d.stateShort}</b> · {r[3]}{r[4] ? ` · ${r[4].split(",").slice(0, 3).join(",")}` : ""}</span>
              </div>
              {id && <button type="button" className="sd-check" onClick={() => check(id)}>{d.canCheck}</button>}
            </li>
          );
        })}
      </ul>
      {shown < list.length && <button type="button" className="button outline sd-more" onClick={() => setShown(n => n + PAGE)}>{d.showMore(Math.min(PAGE, list.length - shown))}</button>}
    </section>
  );
}
