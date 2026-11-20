<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Keep imported markup and interaction repairs in its route file and retain source CSS separately to preserve the captured cascade.
- Eligibility decisions live only in src/lib/eligibility.ts (deterministic); AI only extracts facts and translates. Why: trustworthy results.
- Eligibility criteria records must cite an official source URL, faithful excerpt and checked date; unverified schemes may never reach "likely eligible". Why: users act on these results.
- The interview (src/lib/interview.ts, src/lib/parse.ts) must work without AI; AI may only extract one typed value for the current question after the deterministic parse fails, and the user must confirm it. Why: reliability and privacy.
- Sarvam speech goes only through src/lib/voice.functions.ts with an allow-listed voice set and the database daily quota (consume_voice_quota, bucket derived from auth.uid()). Why: cost control without spoofable client identifiers.
