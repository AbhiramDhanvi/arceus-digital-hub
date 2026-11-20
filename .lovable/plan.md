# ARCEUS upgrade plan

Work happens in this Lovable project (the imported ARCEUS site). The GitHub repo is used only as the reference for its scheme data and eligibility rules. Nothing is pushed back to it.

## 1. Backend and data (Lovable Cloud)
- Turn on Lovable Cloud.
- Tables: profiles, households (stored facts), saved_schemes, reminders, documents, conversations, usage_log. Every table locked to its owner with row-level security.
- Schemes: bring in the 2,066-scheme directory. Each scheme is marked "verified rules" or "listing only".

## 2. Sign-in (email only, no GitHub)
- Sign up, email confirmation, log in, log out, forgot password, and a /reset-password page.
- Signed-in pages: My workspace and saved results. Voice sign-in uses the same account.

## 3. Eligibility engine (no AI decisions)
- Port the repo's rules into one shared module.
- Results are Likely eligible, Ineligible, or Needs verification, each with a reason, required documents, official link, and steps.
- Known facts are reused, conflicting answers are flagged, and the engine asks only for missing facts.
- Unit tests cover each status and conflict handling.

## 4. Voice and chat assistant
- Text chat plus push-to-talk. Speech-to-text and text-to-speech use Sarvam (needs SARVAM_API_KEY). The browser's own speech is the fallback.
- Languages: English, Hindi, Telugu, Marathi, Tamil, Kannada, Bengali, with switching mid-conversation.
- AI (Lovable AI) only pulls facts out of what the user says and phrases replies. The engine decides eligibility.
- Simple answers skip the AI entirely. Context sent to the AI is kept short, repeated speech replies are cached, and each user has a daily limit.
- Clear mic states, live transcript, interruption (stop playback), and friendly errors.

## 5. UI polish
- Green and neutral brand, refined type, responsive layout.
- Pages: landing, assistant, scheme explorer (search, filters, verified badge), result cards, sign-in, and dashboard (household, saved schemes, reminders, document upload with on-device OCR).

## 6. Delivery
- Tests for the eligibility rules and conversation state, and checks for the sign-in flow.
- README updated, plus a list of anything not verified, such as live Sarvam voice and email delivery.

## Needed from you
- Sarvam API key (requested when building starts).
- Optional: your own email domain for branded confirmation emails. Default emails work without it.

## Technical notes
- TanStack server functions run Sarvam and AI calls, so keys stay on the server.
- The Lovable AI gateway handles fact extraction.
- Tesseract.js is loaded only when needed.
- Usage rows are logged to show costs.
