# MiraiAi

MiraiAi is a voice-first guide to Indian government benefit schemes. Describe what you or a family member needs, such as help with healthcare, a pension, or education. MiraiAi asks follow-up questions, checks the relevant scheme rules, and explains what to do next.

[Open MiraiAi](https://miraiai-1ef6.onrender.com/)

## What you can do

- **Check eligibility by voice or text.** Start a guided interview in English or Hindi. You can answer in your own words, and the typed flow also works when speech recognition is unavailable.
- **See why a scheme matches.** Each check shows the relevant rule, the answer that affected the result, and a link to the official source. Results are **Likely eligible**, **Not eligible**, or **Needs verification**.
- **Browse government schemes.** Search and filter the myScheme directory by keyword, level, or state or ministry. Directory entries link to official pages. Eligibility checks are available for the curated schemes with coded rules.
- **Save household answers.** Create an account to save selected answers for future checks and manage or delete them in **My workspace**.

MiraiAi provides independent guidance. The relevant government office or agency makes the final eligibility decision and handles applications.

## How it works

1. **Find the relevant schemes.** The interview matches a stated need or scheme name to the curated catalog and asks for facts that can affect the result.
2. **Interpret the answers.** Local parsing handles common responses such as ages, income, and yes/no answers. If parsing fails for a verified signed-in user, the Lovable AI Gateway can extract one typed answer for the user to confirm. It also supports translation of replies.
3. **Apply the rules.** The TypeScript eligibility engine evaluates the facts against source-cited criteria. Missing information can lead to **Needs verification**. AI does not determine eligibility.
4. **Explain the result.** MiraiAi presents the reasons and official links in the interface and can read the result aloud when speech playback is available.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, TanStack Router, Tailwind CSS, and Radix UI |
| Server | TanStack Start and Nitro on Node.js, with Zod validation for server-function inputs |
| Auth and data | Supabase Auth and PostgreSQL. Row-level security restricts saved household answers to the owning account. |
| Voice and AI | Browser speech APIs, optional Sarvam speech-to-text and text-to-speech, and Lovable AI Gateway for extraction and translation |
| Build and testing | Vite, Bun lockfile, Vitest, and Testing Library |
| Hosting | Render web service built from GitHub |

## Run locally

Install Node.js 24 and Bun, then run:

```sh
git clone https://github.com/AbhiramDhanvi/arceus-digital-hub.git
cd arceus-digital-hub
bun install --frozen-lockfile
bun run dev
```

Open the local URL printed by Vite. Use [`.env.example`](.env.example) as a reference when connecting your own Supabase project. Accounts and saved answers require a configured project with the SQL migrations applied. Optional server-side speech requires `SARVAM_API_KEY` and the voice-quota migration. AI-backed extraction and translation require gateway configuration. Keep provider credentials on the server.

```sh
bun run test
bun run build
```

## Where to look in the code

| Path | Responsibility |
| --- | --- |
| [`src/routes/`](src/routes) | Homepage, authentication, and workspace |
| [`src/lib/interview.ts`](src/lib/interview.ts) | Guided interview questions and answer handling |
| [`src/lib/eligibility.ts`](src/lib/eligibility.ts) | Curated scheme catalog, official citations, and eligibility rules |
| [`src/lib/assistant.functions.ts`](src/lib/assistant.functions.ts) | Server-side AI extraction and translation |
| [`src/lib/voice.functions.ts`](src/lib/voice.functions.ts) | Server-side speech processing and quota enforcement |
| [`public/data/myscheme-index.json`](public/data/myscheme-index.json) | Searchable scheme directory |
| [`drizzle/migrations/`](drizzle/migrations) | SQL migrations for household data and voice quotas |

The project is also connected to the [Lovable editor](https://lovable.dev/projects/fa2df361-8383-451a-8b79-3cdcd2537815).
