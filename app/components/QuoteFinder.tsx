"use client";

// One Client Component drives the whole experience because every screen
// (search / loading / results / saved) shares the same state. Folding them
// together keeps the state in one place; the surrounding page stays a Server
// Component. Maps to Figma: interface-1 (idle), interface-2 (loading),
// interface-3 (results); "saved" is the new localStorage-backed bookmarks view.
//
// The shared chrome — clickable logo (home) and the Saved entry — is rendered
// once around the per-status content, so it stays put across every screen.

import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { getQuotes } from "../actions";
import { useSavedQuotes, type Quote } from "../hooks/useSavedQuotes";
import BookmarkIcon from "./BookmarkIcon";

type Status = "idle" | "loading" | "results" | "saved";

// Curated vibe options. "" is the neutral "Any vibe" default and is never sent
// to the model — only a chosen vibe constrains the prompt.
const VIBES = [
  "Inspiring",
  "Funny",
  "Deep",
  "Melancholic",
  "Stoic",
  "Romantic",
  "Rebellious",
] as const;

// Compose the dynamic heading from whatever the search used. "quotes" is the
// anchor; the vibe is an adjective in front, the theme an "about …" clause, and
// the resolved author a "by …" clause — so any subset reads naturally:
// "Funny quotes", "Quotes about love", "Deep quotes about love by Plato".
function buildHeading(vibe: string, theme: string, author: string | null) {
  let h = vibe ? `${vibe} quotes` : "quotes";
  if (theme) h += ` about ${theme}`;
  if (author) h += ` by ${author}`;
  return h.charAt(0).toUpperCase() + h.slice(1);
}

export default function QuoteFinder() {
  const [author, setAuthor] = useState("");
  const [vibe, setVibe] = useState(""); // "" = Any vibe
  const [theme, setTheme] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [heading, setHeading] = useState(""); // frozen at search time
  const [showCardAuthor, setShowCardAuthor] = useState(false); // discovery mode
  const [error, setError] = useState<string | null>(null);
  // Where to return to when leaving the Saved view (idle or results).
  const [returnTo, setReturnTo] = useState<Status>("idle");
  // Identifies the latest search so a stale in-flight request (e.g. after the
  // user clicks the logo mid-load) can't override the current screen.
  const runId = useRef(0);

  const { saved, toggle, isSaved } = useSavedQuotes();

  function openSaved() {
    setReturnTo(status);
    setStatus("saved");
  }
  function closeSaved() {
    setStatus(returnTo);
  }

  async function runSearch() {
    const a = author.trim();
    const t = theme.trim();

    // At least one input is required — enforced here, not just hinted in the UI.
    if (!a && !vibe && !t) {
      setError("Enter at least one — author, vibe, or theme.");
      return;
    }

    const id = ++runId.current;
    setError(null);
    setStatus("loading");

    // Server Action — runs on the server, holds the Groq key, returns plain JSON.
    const result = await getQuotes({ author: a, vibe, theme: t });

    // A newer search (or a "home" reset) happened while we awaited — discard.
    if (id !== runId.current) return;

    if ("quotes" in result) {
      setQuotes(result.quotes ?? []);
      // Header carries attribution when an author was pinned; cards carry it
      // only in discovery mode (no author → quotes can be from many people).
      const resolved = result.resolvedAuthor ?? null;
      setShowCardAuthor(!resolved);
      setHeading(buildHeading(vibe, t, resolved));
      setStatus("results");
    } else {
      setError(result.error ?? "Couldn't fetch quotes. Try again.");
      setStatus("idle");
    }
  }

  // Reset to a fresh search screen. Also the logo's "home" action. Bumping runId
  // invalidates any search still in flight so it won't resurrect a stale screen.
  function newSearch() {
    runId.current++;
    setStatus("idle");
    setQuotes([]);
    setHeading("");
    setShowCardAuthor(false);
    setAuthor("");
    setVibe("");
    setTheme("");
    setError(null);
  }

  // Fixed entry point to the Saved view, aligned with the logo row. Shown on the
  // search and results screens (not during loading, and not in the Saved view
  // itself — that screen has its own Back button). The count nudges discovery.
  const cornerNav =
    status === "idle" || status === "results" ? (
      <button
        onClick={openSaved}
        aria-label="View saved quotes"
        className="fixed right-6 top-5 z-20 flex items-center gap-1.5 text-[#41482a] transition-opacity hover:opacity-70"
      >
        <BookmarkIcon />
        {saved.length > 0 && (
          <span className="text-sm font-medium">{saved.length}</span>
        )}
      </button>
    ) : null;

  let content: ReactNode;

  // ── Loading (interface-2) ──────────────────────────────────────────────
  if (status === "loading") {
    content = (
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-64">
        <h1 className="animate-pulse text-center text-[32px] font-light leading-snug text-ink">
          Retrieving quotes ...
        </h1>
      </main>
    );
  } else if (status === "saved") {
    // ── Saved (localStorage bookmarks) ───────────────────────────────────
    // Mirrors the results layout; each card's filled bookmark un-saves it
    // (toggle), so removing one simply drops it from the list.
    content = (
      <main className="flex flex-1 flex-col items-center overflow-hidden px-6 pt-12">
        <div className="flex h-full w-full max-w-163.75 flex-col gap-12">
          <div className="flex shrink-0 items-center justify-between gap-4">
            <h1 className="text-[32px] font-light leading-snug text-ink">
              Saved quotes
            </h1>
            <button
              onClick={closeSaved}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[#41482a] transition-opacity hover:opacity-90"
            >
              <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none">
                <path
                  d="M10 3.5 5.5 8l4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back
            </button>
          </div>

          {saved.length === 0 ? (
            <div className="flex flex-1 items-center justify-center pb-32">
              <p className="text-sm text-[#999999]">
                No saved quotes yet — tap the bookmark on a quote to keep it.
              </p>
            </div>
          ) : (
            <ul className="scrollbar-minimal flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-64 pr-3 -mr-3">
              {saved.map((quote, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-6 rounded-xl border border-[#eff2f5] bg-white p-6"
                >
                  {/* Saved quotes always show attribution, regardless of how
                      they were found. */}
                  <div className="flex flex-col gap-1.5">
                    <p className="text-base leading-5.5 text-ink">
                      {quote.text}
                    </p>
                    <p className="text-sm text-[#999999]">— {quote.author}</p>
                  </div>
                  <button
                    onClick={() => toggle(quote)}
                    aria-label="Remove from saved"
                    className="shrink-0 transition-opacity hover:opacity-70"
                  >
                    <BookmarkIcon filled />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    );
  } else if (status === "results") {
    // ── Results (interface-3) ─────────────────────────────────────────────
    // `main` fills the height below the logo and clips overflow; the quote list
    // is the only scroller, so cards scroll *over* the fixed bottom band.
    content = (
      <main className="flex flex-1 flex-col items-center overflow-hidden px-6 pt-12">
        <div className="flex h-full w-full max-w-163.75 flex-col gap-12">
          {/* Header row: title + New search button (stays put while list scrolls) */}
          <div className="flex shrink-0 items-center justify-between gap-4">
            <h1 className="text-[32px] font-light leading-snug text-ink">
              {heading}
            </h1>
            <button
              onClick={newSearch}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[#41482a] transition-opacity hover:opacity-90"
            >
              <Image src="/plus.svg" alt="" width={16} height={16} />
              New search
            </button>
          </div>

          {/* Scrollable quote cards. `min-h-0` lets this flex child shrink so it
              can scroll; `pb-64` lets the last card clear the bottom band. The
              `pr-3 -mr-3` pair carves a gutter so the minimalist scrollbar floats
              off the cards while they keep their position and header alignment. */}
          <ul className="scrollbar-minimal flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-64 pr-3 -mr-3">
            {quotes.map((quote, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-6 rounded-xl border border-[#eff2f5] bg-white p-6"
              >
                {/* In discovery mode (no author pinned) each quote shows who
                    said it, since results can span many people. */}
                <div className="flex flex-col gap-1.5">
                  <p className="text-base leading-5.5 text-ink">{quote.text}</p>
                  {showCardAuthor && (
                    <p className="text-sm text-[#999999]">— {quote.author}</p>
                  )}
                </div>
                <button
                  onClick={() => toggle(quote)}
                  aria-label={isSaved(quote) ? "Remove from saved" : "Save quote"}
                  aria-pressed={isSaved(quote)}
                  className="shrink-0 transition-opacity hover:opacity-70"
                >
                  <BookmarkIcon filled={isSaved(quote)} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </main>
    );
  } else {
    // ── Idle / search (interface-1) ───────────────────────────────────────
    content = (
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-64">
        <div className="flex w-full max-w-130 flex-col items-center gap-6">
          <h1 className="text-center text-[32px] font-light leading-snug text-ink">
            What words are you looking for ?
          </h1>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runSearch();
            }}
            className="flex w-full flex-col gap-3"
          >
            {/* Author — text. All three fields share the white / #EFF2F5 /
                rounded look; each is optional, so none is marked required. */}
            <div className="flex h-12 w-full items-center rounded-xl border border-[#eff2f5] bg-white px-4">
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Author — try Plato"
                aria-label="Author"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-[#999999]"
              />
            </div>

            {/* Vibe (dropdown) + Theme (text) share a row. The native select is
                styled to match the inputs: appearance-none + a custom chevron. */}
            <div className="flex gap-3">
              <div className="relative w-40 shrink-0">
                <select
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value)}
                  aria-label="Vibe"
                  className="h-12 w-full appearance-none rounded-xl border border-[#eff2f5] bg-white px-4 pr-9 text-sm text-ink outline-none"
                >
                  <option value="">Any vibe</option>
                  {VIBES.map((v) => (
                    <option key={v} value={v} className="text-ink">
                      {v}
                    </option>
                  ))}
                </select>
                {/* Chevron — decorative, lets clicks fall through to the select */}
                <svg
                  aria-hidden
                  viewBox="0 0 12 12"
                  className="pointer-events-none absolute right-3.5 top-1/2 h-3 w-3 -translate-y-1/2 text-ink"
                >
                  <path
                    d="M2.5 4.5 6 8l3.5-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className="flex h-12 w-full items-center rounded-xl border border-[#eff2f5] bg-white px-4">
                <input
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="Theme — e.g. love"
                  aria-label="Theme"
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-[#999999]"
                />
              </div>
            </div>

            {/* Accent search button — full width to anchor the form */}
            <button
              type="submit"
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-accent text-sm font-medium text-[#41482a] transition-opacity hover:opacity-90"
            >
              <Image src="/search.svg" alt="" width={18} height={18} />
              Search
            </button>

            {/* At-least-one hint, or the error if validation/fetch failed */}
            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : (
              <p className="text-center text-xs text-[#999999]">
                Fill in at least one — author, vibe, or theme.
              </p>
            )}
          </form>
        </div>
      </main>
    );
  }

  return (
    <>
      {/* Logo doubles as the "home" link, like any site's masthead: clicking it
          resets to a fresh search from any screen. */}
      <header className="flex justify-center pt-5">
        <button
          onClick={newSearch}
          aria-label="quote.by — home"
          className="transition-opacity hover:opacity-70"
        >
          <Image src="/logo.svg" alt="quote.by" width={95} height={23} priority />
        </button>
      </header>
      {cornerNav}
      {content}
    </>
  );
}
