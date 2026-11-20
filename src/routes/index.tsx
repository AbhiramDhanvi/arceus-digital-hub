import type { CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import capturedCSS from "../styles/site.css?raw";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "ARCEUS | Your voice. Your benefits." }] }),
  staticData: { importedDocument: { html: { "lang": "en" }, body: { "data-site-import-popup-incomplete": "document-menu-ownership" } } },
  component: Index,
});

function Index() {
  return (
    <>
      <style>{capturedCSS}</style>
    <style>{"@layer imported-inline{[data-site-import-svg-default-fit=\"contain\"]{object-fit:contain}}"}</style>
      <div id="root">
        <div className="app home-page flex flex-col min-h-screen">
          <a className={"skip-link py-[12px] px-[16px] top-[8px] z-12 [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"} href="#content">Skip to content</a>
          <ImportedHeader />
          <main className={"flex-1 [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"} id="content" tabIndex={-1}>
            <div className="hero-ground overflow-hidden">
              <ImportedSectionYourVoiceYourBenefits />
            </div>
            <div className="value-band [border-block:1px_solid_rgb(217,223,204)]">
              <div className="wrap value-items items-center grid mx-auto [@media(width_<=_650px)]:py-[10px]">
                <div className="items-center flex"><svg className="flex-none h-[20px] align-middle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21.54 15H17a2 2 0 0 0-2 2v4.54" /><path d="M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17" /><path d="M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05" /><circle cx="12" cy="12" r="10" /></svg>4 languages</div>
                <div className="items-center flex"><svg className="flex-none h-[20px] align-middle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 18v-7" /><path d="M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z" /><path d="M14 18v-7" /><path d="M18 18v-7" /><path d="M3 22h18" /><path d="M6 18v-7" /></svg>Official scheme sources</div>
                <div className="items-center flex"><svg className="flex-none h-[20px] align-middle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" /></svg>Voice and text</div>
                <div className="items-center flex"><svg className="flex-none h-[20px] align-middle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><path d="M16 3.128a4 4 0 0 1 0 7.744" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" /></svg>Support for the whole family</div>
              </div>
            </div>
            <ImportedSectionFromAQuestionTo />
            <div className="directory-ground [border-block:1px_solid_rgb(219,226,209)]">
              <ImportedSectionExploreByCategory />
            </div>
            <ImportedSectionPlanningALifeEvent />
            <div hidden>
              <ImportedSectionTalkToARCEUS />
            </div>
          </main>
          <footer className="site-footer [border-top:1px_solid_var(--line)]">
            <div className="wrap footer-inner items-center flex justify-between mx-auto min-h-[88px] [@media(width_<=_650px)]:flex-wrap [@media(width_<=_650px)]:py-[15px]">
              <a className={"brand items-center inline-flex gap-[10px] tracking-[-0.075em] whitespace-nowrap [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"} href="#home">
                <img alt="" src="/site-assets/bce0e0ed77805734-989645a5c1acd1a734922ab1c10cf3e1.png" data-site-import-svg-default-fit="contain" />
                <span>ARCEUS<span>.</span></span>
              </a>
              <p className="[@media(width_<=_650px)]:order-3 [@media(width_<=_650px)]:w-full">Independent scheme guidance for citizens.</p>
              <a className={"items-center inline-flex gap-[7px] [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"} href="https://www.myscheme.gov.in/" rel="noreferrer" target="_blank"><svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>Visit myScheme</a>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}

function ImportedHeader() {
  return (
    <header className="site-header border-[#ffffff25] relative z-4 [border-bottom:1px_solid_var(--line)]">
      <div className="wrap header-inner items-center flex justify-between mx-auto">
        <a className={"brand items-center inline-flex gap-[10px] tracking-[-0.075em] whitespace-nowrap [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"} href="#home">
          <img alt="" src="/site-assets/bce0e0ed77805734-989645a5c1acd1a734922ab1c10cf3e1.png" data-site-import-svg-default-fit="contain" />
          <span>ARCEUS<span>.</span></span>
        </a>
        <nav className="navigation items-center" aria-label="Main">
          <a className={"[-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"} aria-current="page" href="#home">Home</a>
          <a className={"[-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"} href="#assistant">Voice assistant</a>
          <a className={"[-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"} href="#schemes">Explore schemes</a>
          <a className={"[-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"} href="#workspace">My workspace</a>
        </nav>
        <div className="header-actions items-center">
          <label className="language-select items-center flex gap-[6px] px-[10px] relative" id="bb-customSelect-vuUyf-label">
            <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21.54 15H17a2 2 0 0 0-2 2v4.54" />
              <path d="M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17" />
              <path d="M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            <div>
              <span className={"[&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"} role="combobox" aria-autocomplete="list" aria-expanded="false" aria-owns="bb-customSelect-vuUyf-panel" aria-activedescendant="bb-customSelect-vuUyf-selectedOption" aria-labelledby="bb-customSelect-vuUyf-label" tabIndex={0}>
                <span>English</span>
              </span>
              <select className={"appearance-none pt-[10px] pr-[17px] pb-[10px] pl-0 [-webkit-tap-highlight-color:transparent] [border:0px] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"} aria-label="Language / भाषा" tabIndex={-1} defaultValue="en">
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
                <option value="te">తెలుగు</option>
                <option value="mr">मराठी</option>
              </select>
              <div id="bb-customSelect-vuUyf-panel" role="listbox">
                <div role="option" id="bb-customSelect-vuUyf-selectedOption">English</div>
                <div role="option">हिन्दी</div>
                <div role="option">తెలుగు</div>
                <div role="option">मराठी</div>
              </div>
            </div>
            <svg className="flex-none pointer-events-none absolute right-[7px] align-middle" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </label>
          <button className={"button header-cta items-center gap-[9px] justify-center text-center [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3 [&:hover]:[box-shadow:rgb(23,60,52)_0px_8px_15px_-9px]"}><svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /><path d="M20 2v4" /><path d="M22 4h-4" /><circle cx="4" cy="20" r="2" /></svg>Get started</button>
          <button className={"icon-button menu-toggle items-center gap-[9px] justify-center min-h-[38px] min-w-[38px] p-[6px] text-center [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"} aria-label="Menu" aria-expanded="false">
            <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 5h16" />
              <path d="M4 12h16" />
              <path d="M4 19h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

function ImportedSectionYourVoiceYourBenefits() {
  return (
    <section className="hero wrap home-hero items-center grid mx-auto relative">
      <div className="hero-copy" style={{ transform: "translateY(0px)", opacity: "1" }}>
        <div className="eyebrow items-center flex gap-[8px] tracking-[0.15em]"><span className="h-px w-[16px]" />INDIAN GOVERNMENT SCHEMES</div>
        <h1>Your voice.<br /><em>Your benefits.</em></h1>
        <p className="max-w-[420px]">Find schemes for you and your family. Speak or type in English, Hindi, Telugu, or Marathi to check eligibility and learn how to apply.</p>
        <div className="actions items-center flex flex-wrap">
          <button className={"button primary items-center gap-[9px] justify-center text-center [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3 [&:hover]:[&:not(:disabled)]:[box-shadow:rgb(23,60,52)_0px_8px_15px_-9px]"}><svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19v3" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><rect x="9" y="2" width="6" height="13" rx="3" /></svg>Talk to ARCEUS</button>
          <button className={"button \x6futline items-center gap-[9px] justify-center text-center [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"}><svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" /></svg>Explore schemes</button>
        </div>
        <div className="source-line items-center flex gap-[7px]"><svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></svg>Guidance based on official government sources</div>
      </div>
      <div className="hero-picture [box-shadow:rgba(0,0,0,0.867)_0px_28px_55px_-37px] isolate overflow-hidden relative [@media(width_<=_650px)]:h-[clamp(277px,85vw,400px)]" style={{ transform: "translateY(0px) scale(1)", opacity: "1" }}>
        <picture className="inset-0 absolute -z-2">
          <source media="(max-width: 650px)" srcSet="/site-assets/df1ee9f3cab76ebb.webp" />
          <img className="block h-full object-cover w-full" alt="" width="1440" height="960" fetchPriority="high" src="/site-assets/193bfc6f66941b98.webp" />
        </picture>
        <div className="hero-wash inset-0 pointer-events-none absolute -z-1" aria-hidden="true" />
        <div className="voice-card border border-solid border-[#e1f4db66] rounded-[12px] [box-shadow:rgba(4,20,15,0.4)_0px_12px_42px] absolute [backdrop-filter:blur(16px)]" style={{ transform: "translateY(0px)", opacity: "1" }}>
          <div className="voice-card-label items-center flex gap-[8px]">
            <div className="voice-card-icon rounded-[7px] grid h-[35px] place-items-center w-[35px]">
              <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 10v3" />
                <path d="M6 6v11" />
                <path d="M10 3v18" />
                <path d="M14 8v7" />
                <path d="M18 5v13" />
                <path d="M22 10v3" />
              </svg>
            </div>
            <div>
              <b className="block tracking-[0.08em]">ARCEUS</b>
              <small className="block">Scheme assistant</small>
            </div>
            <span className="border border-solid border-[#c3d7c36b] rounded-[5px] ml-auto py-[4px] px-[8px]">English</span>
          </div>
          <div className="voice-wave compact-wave items-center flex gap-[5px] justify-center" aria-hidden="true">
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "7px", "--bar": "0", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "14px", "--bar": "1", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "23px", "--bar": "2", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "11px", "--bar": "3", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "31px", "--bar": "4", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "42px", "--bar": "5", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "18px", "--bar": "6", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "35px", "--bar": "7", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "54px", "--bar": "8", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "32px", "--bar": "9", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "16px", "--bar": "10", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "48px", "--bar": "11", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "64px", "--bar": "12", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "42px", "--bar": "13", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "28px", "--bar": "14", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "11px", "--bar": "15", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "24px", "--bar": "16", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "42px", "--bar": "17", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "28px", "--bar": "18", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "12px", "--bar": "19", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "29px", "--bar": "20", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "18px", "--bar": "21", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "8px", "--bar": "22", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "16px", "--bar": "23", transform: "scaleY(1)" } as CSSProperties} />
            <span className="rounded-[10px] flex-[0_0_4px] basis-[3px]!" style={{ "--height": "9px", "--bar": "24", transform: "scaleY(1)" } as CSSProperties} />
          </div>
          <button className={"voice-card-action items-center border border-solid border-[#a6c4a469] rounded-[6px] flex gap-[8px] py-[6px] px-[8px] text-left w-full [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"}><svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" /></svg>Ask about a scheme</button>
        </div>
      </div>
      <button className={"journey-link items-center inline-flex gap-[8px] left-0 min-h-[34px] pt-[3px] pr-[5px] pb-[3px] pl-0 absolute [-webkit-tap-highlight-color:transparent] [border:0px] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"}><svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>See how it works</button>
    </section>
  );
}

function ImportedSectionFromAQuestionTo() {
  return (
    <section className={"wrap journey mx-auto [scroll-margin-top:20px] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"} id="how-arceus-works" tabIndex={-1}>
      <div className="eyebrow items-center flex gap-[8px] tracking-[0.15em]"><span className="h-px w-[16px]" />HOW IT WORKS</div>
      <h2 className="tracking-tight max-w-[740px]">From a question to the next step</h2>
      <div className="journey-grid items-start grid relative" style={{ "--journey-progress": "0.000" } as CSSProperties} data-stage="0">
        <div className="journey-visual [box-shadow:rgb(24,57,47)_0px_0px_0px_1px_inset] grid isolate overflow-hidden [@media(width_<=_780px)]:h-[min(300px,41svh)]" aria-hidden="true">
          <div className="journey-lens grid inset-0 place-items-center absolute -z-1 [@media(width_<=_780px)]:[scale:0.75]">
            <div className="aspect-square border border-solid border-[#d6f5ad5e] rounded-[50%] absolute w-[224px]" />
            <div className="aspect-square border border-solid border-[#d6f5ad5e] rounded-[50%] border-dashed! absolute w-[282px]" />
            <div className="aspect-square border border-solid border-[#d6f5ad5e] rounded-[50%] absolute w-[339px]" />
          </div>
          <div className="journey-progress items-center flex justify-between z-2">
            <span className="border border-solid border-[#c0d7be] rounded-[50%] h-[10px] relative w-[10px] z-1" />
            <span className="border border-solid border-[#c0d7be] rounded-[50%] h-[10px] relative w-[10px] z-1" />
            <span className="border border-solid border-[#c0d7be] rounded-[50%] h-[10px] relative w-[10px] z-1" />
          </div>
          <div className="journey-frames self-stretch grid place-items-center">
            <div className="journey-frame frame-ask border border-solid border-[#c7e9c965] rounded-[11px] [box-shadow:rgba(8,31,28,0.737)_0px_19px_39px] grid justify-items-start min-w-0 w-[min(100%,358px)] [grid-area:1/1]">
              <div className="frame-icon rounded-[8px] grid h-[39px] place-items-center w-[39px]">
                <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 19v3" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <rect x="9" y="2" width="6" height="13" rx="3" />
                </svg>
              </div>
              <div className="voice-wave items-center flex gap-[clamp(3px,0.55vw,7px)] justify-center w-full" aria-hidden="true">
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "7px", "--bar": "0" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "14px", "--bar": "1" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "23px", "--bar": "2" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "11px", "--bar": "3" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "31px", "--bar": "4" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "42px", "--bar": "5" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "18px", "--bar": "6" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "35px", "--bar": "7" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "54px", "--bar": "8" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "32px", "--bar": "9" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "16px", "--bar": "10" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "48px", "--bar": "11" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "64px", "--bar": "12" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "42px", "--bar": "13" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "28px", "--bar": "14" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "11px", "--bar": "15" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "24px", "--bar": "16" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "42px", "--bar": "17" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "28px", "--bar": "18" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "12px", "--bar": "19" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "29px", "--bar": "20" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "18px", "--bar": "21" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "8px", "--bar": "22" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "16px", "--bar": "23" } as CSSProperties} />
                <span className="items-center rounded-[10px] flex flex-[0_0_4px] gap-[8px]" style={{ "--height": "9px", "--bar": "24" } as CSSProperties} />
              </div>
              <div className="journey-quote">“Can my father get health cover?”</div>
            </div>
            <div className="journey-frame frame-check border border-solid border-[#c7e9c965] rounded-[11px] [box-shadow:rgba(8,31,28,0.737)_0px_19px_39px] grid justify-items-start min-w-0 w-[min(100%,358px)] [grid-area:1/1]">
              <div className="frame-icon rounded-[8px] grid h-[39px] place-items-center w-[39px]">
                <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <b>Ayushman Vay Vandana</b>
              <span className="items-center flex gap-[8px]"><svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>Age 70 or above on Aadhaar</span>
              <span className="items-center flex gap-[8px]"><svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>Lives in India</span>
            </div>
            <div className="journey-frame frame-apply border border-solid border-[#c7e9c965] rounded-[11px] [box-shadow:rgba(8,31,28,0.737)_0px_19px_39px] grid justify-items-start min-w-0 w-[min(100%,358px)] [grid-area:1/1]">
              <div className="frame-icon rounded-[8px] grid h-[39px] place-items-center w-[39px]">
                <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 18v-7" />
                  <path d="M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z" />
                  <path d="M14 18v-7" />
                  <path d="M18 18v-7" />
                  <path d="M3 22h18" />
                  <path d="M6 18v-7" />
                </svg>
              </div>
              <b>Prepare to apply</b>
              <span className="items-center flex gap-[8px]"><svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.5 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v6" /><path d="M14 2v5a1 1 0 0 0 1 1h5" /><path d="m14 20 2 2 4-4" /></svg>Aadhaar for e-KYC</span>
              <span className="items-center flex gap-[8px]"><svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>NHA beneficiary portal</span>
            </div>
          </div>
        </div>
        <div>
          <article className="journey-step current items-start flex gap-[14px] [border-top:1px_solid_var(--line)]">
            <div className="step-icon rounded-[9px] grid flex-[0_0_45px] h-[45px] place-items-center">
              <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 19v3" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <rect x="9" y="2" width="6" height="13" rx="3" />
              </svg>
            </div>
            <div>
              <h3 className="tracking-[-0.023em]">Ask in your own words</h3>
              <p>Tell ARCEUS what you need, such as healthcare for a parent. Speak or type in the language you prefer.</p>
            </div>
          </article>
          <article className="journey-step items-start flex gap-[14px] [border-top:1px_solid_var(--line)]">
            <div className="step-icon rounded-[9px] grid flex-[0_0_45px] h-[45px] place-items-center">
              <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div>
              <h3 className="tracking-[-0.023em]">Check the rules that apply</h3>
              <p>Answer the few questions that affect your result. If two answers disagree, ARCEUS asks you to confirm before making a recommendation.</p>
            </div>
          </article>
          <article className="journey-step items-start flex gap-[14px] [border-bottom:1px_solid_var(--line)] [border-top:1px_solid_var(--line)]">
            <div className="step-icon rounded-[9px] grid flex-[0_0_45px] h-[45px] place-items-center">
              <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 18v-7" />
                <path d="M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z" />
                <path d="M14 18v-7" />
                <path d="M18 18v-7" />
                <path d="M3 22h18" />
                <path d="M6 18v-7" />
              </svg>
            </div>
            <div>
              <h3 className="tracking-[-0.023em]">Apply through the official portal</h3>
              <p>See why you may qualify, prepare your documents, and follow the steps to the official website. Save the reference in your workspace after applying.</p>
            </div>
          </article>
        </div>
      </div>
      <button className={"button primary items-center gap-[9px] justify-center mt-[20px] text-center [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3 [&:hover]:[&:not(:disabled)]:[box-shadow:rgb(23,60,52)_0px_8px_15px_-9px]"}><svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19v3" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><rect x="9" y="2" width="6" height="13" rx="3" /></svg>Start an eligibility check</button>
    </section>
  );
}

function ImportedSectionExploreByCategory() {
  return (
    <section className="wrap landing-section mx-auto">
      <div className="items-end flex gap-[16px] justify-between mb-[23px] [@media(width_<=_650px)]:flex-wrap">
        <div>
          <div className="eyebrow items-center flex gap-[8px] tracking-[0.15em]"><span className="h-px w-[16px]" />SCHEME DIRECTORY</div>
          <h2>Explore by category</h2>
        </div>
        <button className={"button \x6futline items-center gap-[9px] justify-center text-center [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"}><svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></svg>View all schemes</button>
      </div>
      <div className="category-grid grid gap-[11px]">
        <button className={"category-card tint-agriculture flex flex-col gap-[7px] justify-start min-w-0 text-left [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3 [&:hover]:[box-shadow:var(--shadow)]"}>
          <div className="tile-icon rounded-[11px] grid h-[43px] mb-[5px] place-items-center w-[43px]">
            <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3" />
              <path d="M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4" />
              <path d="M5 21h14" />
            </svg>
          </div>
          <b>Agriculture</b>
          <span>1 ARCEUS check</span>
        </button>
        <button className={"category-card tint-education flex flex-col gap-[7px] justify-start min-w-0 text-left [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3 [&:hover]:[box-shadow:var(--shadow)]"}>
          <div className="tile-icon rounded-[11px] grid h-[43px] mb-[5px] place-items-center w-[43px]">
            <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
              <path d="M22 10v6" />
              <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
            </svg>
          </div>
          <b>Education</b>
          <span>1 ARCEUS check</span>
        </button>
        <button className={"category-card tint-health flex flex-col gap-[7px] justify-start min-w-0 text-left [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3 [&:hover]:[box-shadow:var(--shadow)]"}>
          <div className="tile-icon rounded-[11px] grid h-[43px] mb-[5px] place-items-center w-[43px]">
            <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
              <path d="M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
            </svg>
          </div>
          <b>Healthcare</b>
          <span>1 ARCEUS check</span>
        </button>
        <button className={"category-card tint-business flex flex-col gap-[7px] justify-start min-w-0 text-left [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3 [&:hover]:[box-shadow:var(--shadow)]"}>
          <div className="tile-icon rounded-[11px] grid h-[43px] mb-[5px] place-items-center w-[43px]">
            <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
              <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
            </svg>
          </div>
          <b>Business &amp; loans</b>
          <span>2 ARCEUS checks</span>
        </button>
        <button className={"category-card tint-marriage flex flex-col gap-[7px] justify-start min-w-0 text-left [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3 [&:hover]:[box-shadow:var(--shadow)]"}>
          <div className="tile-icon rounded-[11px] grid h-[43px] mb-[5px] place-items-center w-[43px]">
            <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19.414 14.414C21 12.828 22 11.5 22 9.5a5.5 5.5 0 0 0-9.591-3.676.6.6 0 0 1-.818.001A5.5 5.5 0 0 0 2 9.5c0 2.3 1.5 4 3 5.5l5.535 5.362a2 2 0 0 0 2.879.052 2.12 2.12 0 0 0-.004-3 2.124 2.124 0 1 0 3-3 2.124 2.124 0 0 0 3.004 0 2 2 0 0 0 0-2.828l-1.881-1.882a2.41 2.41 0 0 0-3.409 0l-1.71 1.71a2 2 0 0 1-2.828 0 2 2 0 0 1 0-2.828l2.823-2.762" />
            </svg>
          </div>
          <b>Marriage</b>
          <span>1 ARCEUS check</span>
        </button>
        <button className={"category-card tint-insurance flex flex-col gap-[7px] justify-start min-w-0 text-left [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3 [&:hover]:[box-shadow:var(--shadow)]"}>
          <div className="tile-icon rounded-[11px] grid h-[43px] mb-[5px] place-items-center w-[43px]">
            <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <b>Insurance</b>
          <span>2 ARCEUS checks</span>
        </button>
        <button className={"category-card tint-savings flex flex-col gap-[7px] justify-start min-w-0 text-left [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3 [&:hover]:[box-shadow:var(--shadow)]"}>
          <div className="tile-icon rounded-[11px] grid h-[43px] mb-[5px] place-items-center w-[43px]">
            <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 17h3v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a3.16 3.16 0 0 0 2-2h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a5 5 0 0 0-2-4V3a4 4 0 0 0-3.2 1.6l-.3.4H11a6 6 0 0 0-6 6v1a5 5 0 0 0 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z" />
              <path d="M16 10h.01" />
              <path d="M2 8v1a2 2 0 0 0 2 2h1" />
            </svg>
          </div>
          <b>Savings</b>
          <span>2 ARCEUS checks</span>
        </button>
        <button className={"category-card flex flex-col gap-[7px] justify-start min-w-0 text-left [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3 [&:hover]:[box-shadow:var(--shadow)]"}>
          <div className="tile-icon rounded-[11px] grid h-[43px] mb-[5px] place-items-center w-[43px]">
            <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4" />
            </svg>
          </div>
          <b>Utilities</b>
          <span>1 ARCEUS check</span>
        </button>
      </div>
    </section>
  );
}

function ImportedSectionPlanningALifeEvent() {
  return (
    <section className="wrap landing-section life-section mx-auto">
      <div className="life-intro items-center grid mb-[29px]">
        <img className="h-auto object-cover w-full" width="1080" height="720" loading="lazy" alt="" src="/site-assets/9da2e2a5fb9b53b6.webp" />
        <div>
          <div className="eyebrow items-center flex gap-[8px] tracking-[0.15em]"><span className="h-px w-[16px]" />FAMILY PLANNING</div>
          <h2>Planning a life event?</h2>
          <p className="max-w-[430px]">Check benefits for family members and keep their application records and reminders together.</p>
          <button className={"button primary items-center gap-[9px] justify-center mt-[20px] text-center [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3 [&:hover]:[&:not(:disabled)]:[box-shadow:rgb(23,60,52)_0px_8px_15px_-9px]"}><svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><path d="M16 3.128a4 4 0 0 1 0 7.744" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" /></svg>Open my workspace</button>
        </div>
      </div>
      <div className="life-grid grid gap-[12px] mt-[22px]">
        <button className={"life-card flex flex-col gap-[7px] justify-start min-h-[133px] min-w-0 text-left [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3 [&:hover]:[box-shadow:var(--shadow)]"}>
          <svg className="flex-none mb-[3px] align-middle" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
            <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
          </svg>
          <b>Starting a business</b>
          <span>Explore working capital and microenterprise loans.</span>
        </button>
        <button className={"life-card flex flex-col gap-[7px] justify-start min-h-[133px] min-w-0 text-left [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3 [&:hover]:[box-shadow:var(--shadow)]"}>
          <svg className="flex-none mb-[3px] align-middle" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19.414 14.414C21 12.828 22 11.5 22 9.5a5.5 5.5 0 0 0-9.591-3.676.6.6 0 0 1-.818.001A5.5 5.5 0 0 0 2 9.5c0 2.3 1.5 4 3 5.5l5.535 5.362a2 2 0 0 0 2.879.052 2.12 2.12 0 0 0-.004-3 2.124 2.124 0 1 0 3-3 2.124 2.124 0 0 0 3.004 0 2 2 0 0 0 0-2.828l-1.881-1.882a2.41 2.41 0 0 0-3.409 0l-1.71 1.71a2 2 0 0 1-2.828 0 2 2 0 0 1 0-2.828l2.823-2.762" />
          </svg>
          <b>Preparing for marriage</b>
          <span>Check Telangana marriage assistance and the documents you need.</span>
        </button>
        <button className={"life-card flex flex-col gap-[7px] justify-start min-h-[133px] min-w-0 text-left [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3 [&:hover]:[box-shadow:var(--shadow)]"}>
          <svg className="flex-none mb-[3px] align-middle" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
            <path d="M22 10v6" />
            <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
          </svg>
          <b>Continuing school</b>
          <span>Check scholarship screening criteria and selection steps.</span>
        </button>
        <button className={"life-card flex flex-col gap-[7px] justify-start min-h-[133px] min-w-0 text-left [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3 [&:hover]:[box-shadow:var(--shadow)]"}>
          <svg className="flex-none mb-[3px] align-middle" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 17h3v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a3.16 3.16 0 0 0 2-2h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a5 5 0 0 0-2-4V3a4 4 0 0 0-3.2 1.6l-.3.4H11a6 6 0 0 0-6 6v1a5 5 0 0 0 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z" />
            <path d="M16 10h.01" />
            <path d="M2 8v1a2 2 0 0 0 2 2h1" />
          </svg>
          <b>Welcoming a daughter</b>
          <span>Explore a savings account for your daughter’s future.</span>
        </button>
        <button className={"life-card flex flex-col gap-[7px] justify-start min-h-[133px] min-w-0 text-left [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3 [&:hover]:[box-shadow:var(--shadow)]"}>
          <svg className="flex-none mb-[3px] align-middle" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
            <path d="M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
          </svg>
          <b>Turning 70</b>
          <span>Check senior healthcare eligibility and enrolment steps.</span>
        </button>
      </div>
    </section>
  );
}

function ImportedSectionTalkToARCEUS() {
  return (
    <section className="wrap page-section mx-auto">
      <div className="eyebrow items-center flex gap-[8px] tracking-[0.15em]"><span className="h-px w-[16px]" />YOUR SCHEME ASSISTANT</div>
      <h1 className="page-title">Talk to ARCEUS</h1>
      <p className="page-lead max-w-[530px]">Ask in your own words. ARCEUS will ask only for the details it still needs.</p>
      <div className="assistant-layout items-start grid gap-[16px] mt-[24px]">
        <aside className="assistant-sidebar rounded-[17px] text-center [border:1px_solid_var(--line)] [@media(width_<=_650px)]:items-center [@media(width_<=_650px)]:grid [@media(width_<=_650px)]:gap-[6px] [@media(width_<=_650px)]:grid-cols-[1fr_1fr] [@media(width_<=_650px)]:order-2">
          <div className="sidebar-orb border border-solid border-[#dbe8da] rounded-[50%] h-[156px] mt-[5px] mr-auto mb-[17px] ml-auto place-items-center w-[156px]">
            <div className="rounded-[50%] [box-shadow:rgba(81,126,98,0.667)_0px_13px_32px_-9px] grid h-[105px] place-items-center w-[105px]">
              <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 10v3" />
                <path d="M6 6v11" />
                <path d="M10 3v18" />
                <path d="M14 8v7" />
                <path d="M18 5v13" />
                <path d="M22 10v3" />
              </svg>
            </div>
          </div>
          <h2>English</h2>
          <p>Ready to listen</p>
          <button className={"button primary items-center gap-[9px] justify-center text-center [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3 [&:hover]:[&:not(:disabled)]:[box-shadow:rgb(23,60,52)_0px_8px_15px_-9px]"}><svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19v3" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><rect x="9" y="2" width="6" height="13" rx="3" /></svg>Start microphone</button>
          <label className="read-toggle items-start flex gap-[7px] justify-center [@media(width_<=_650px)]:col-start-1 [@media(width_<=_650px)]:col-end-[-1]"><input className={"accent-(--accent) shrink-0 h-[16px] w-[16px] [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"} type="checkbox" defaultChecked />Read voice replies aloud</label>
          <label className="read-toggle items-start flex gap-[7px] justify-center [@media(width_<=_650px)]:col-start-1 [@media(width_<=_650px)]:col-end-[-1]"><input className={"accent-(--accent) shrink-0 h-[16px] w-[16px] [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"} type="checkbox" />Hands-free follow-up questions</label>
          <button className={"text-button py-[3px] px-0 underline underline-offset-3 [-webkit-tap-highlight-color:transparent] [border:0px] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"}>Sign in for Sarvam voice</button>
          <small className="block [@media(width_<=_650px)]:col-start-1 [@media(width_<=_650px)]:col-end-[-1]">Your browser handles speech. Its speech service may process audio online. Keep ID and bank numbers out of the chat.</small>
        </aside>
        <div className="chat-shell rounded-[17px] min-w-0 overflow-hidden [border:1px_solid_var(--line)] [@media(width_<=_650px)]:min-w-0">
          <div className="chat-header items-center flex gap-[10px] py-[12px] px-[16px] [border-bottom:1px_solid_var(--line)]">
            <div className="chat-icon rounded-[9px] grid h-[41px] place-items-center w-[41px]">
              <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
                <path d="M20 2v4" />
                <path d="M22 4h-4" />
                <circle cx="4" cy="20" r="2" />
              </svg>
            </div>
            <div>
              <b>ARCEUS</b>
              <small>Eligibility conversation</small>
            </div>
            <button className={"icon-button items-center gap-[9px] justify-center ml-auto min-h-[38px] min-w-[38px] p-[6px] text-center [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"} title="Restart conversation" aria-label="Restart conversation">
              <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          </div>
          <div className={"transcript flex flex-col gap-[12px] overflow-auto [overscroll-behavior:contain] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"} role="log" aria-live="polite" tabIndex={0}>
            <div className="message agent-message self-start rounded-[12px] rounded-tl-[3px]! py-[11px] px-[14px] pr-[43px]! relative w-fit">
              <p className="wrap-anywhere">Namaste! Tell me which scheme you want to check, or what kind of help you need. You can speak or type.</p>
              <button className={"listen-button rounded-[5px] h-[29px] absolute right-[7px] top-[7px] w-[29px] [-webkit-tap-highlight-color:transparent] [border:0px] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"} aria-label="Read this reply aloud">
                <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
                  <path d="M16 9a5 5 0 0 1 0 6" />
                  <path d="M19.364 18.364a9 9 0 0 0 0-12.728" />
                </svg>
              </button>
            </div>
            <div className="flex flex-wrap gap-[7px]">
              <button className={"chip items-center gap-[9px] justify-center min-h-[36px] py-[7px] px-[12px] text-center [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"}>I’m a farmer <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg></button>
              <button className={"chip items-center gap-[9px] justify-center min-h-[36px] py-[7px] px-[12px] text-center [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"}>I need a scholarship <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg></button>
              <button className={"chip items-center gap-[9px] justify-center min-h-[36px] py-[7px] px-[12px] text-center [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"}>Healthcare for a parent <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg></button>
              <button className={"chip items-center gap-[9px] justify-center min-h-[36px] py-[7px] px-[12px] text-center [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"}>I need a business loan <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg></button>
            </div>
          </div>
          <div className="p-[12px] [border-top:1px_solid_var(--line)]">
            <form className="composer items-center rounded-[12px] flex gap-[8px] p-[5px] [border:1px_solid_var(--line)]">
              <button className={"icon-button mic-button items-center gap-[9px] justify-center min-h-[38px] min-w-[38px] p-[6px] text-center [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"} type="button" aria-label="Start microphone">
                <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 19v3" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <rect x="9" y="2" width="6" height="13" rx="3" />
                </svg>
              </button>
              <input className={"border-current border-none flex-1 min-w-0 py-[8px] px-[2px] [-webkit-tap-highlight-color:transparent] [border-image:none] [border-width:medium] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"} maxLength={500} aria-label="Your message" placeholder="Ask a question or type your answer…" defaultValue="" />
              <button className={"icon-button send-button items-center gap-[9px] justify-center min-h-[38px] min-w-[38px] p-[6px] text-center [-webkit-tap-highlight-color:transparent] [&:focus-visible]:outline-[#4a9b84] [&:focus-visible]:outline-solid [&:focus-visible]:outline-[3px] [&:focus-visible]:outline-offset-3"} type="submit" disabled aria-label="Send message">
                <svg className="flex-none align-middle" xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
                  <path d="m21.854 2.147-10.94 10.939" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
