"use client";

// One Client Component drives the whole experience because all three screens
// (search / loading / results) share the same state. Folding them together
// keeps the state in one place; the surrounding page stays a Server Component.
// Maps to Figma: interface-1 (idle), interface-2 (loading), interface-3 (results).

import { useState } from "react";
import Image from "next/image";
import { getQuotes } from "../actions";

type Status = "idle" | "loading" | "results";

export default function QuoteFinder() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [quotes, setQuotes] = useState<string[]>([]);
  const [subject, setSubject] = useState(""); // the name shown in "Quotes by …"
  const [error, setError] = useState<string | null>(null);

  async function runSearch() {
    setError(null);
    setStatus("loading");

    // Server Action — runs on the server, holds the Groq key, returns plain JSON.
    const result = await getQuotes(query);

    if ("quotes" in result) {
      setQuotes(result.quotes ?? []);
      // Prefer the author name the model resolved (e.g. "nitche" →
      // "Friedrich Nietzsche"); fall back to whatever the user typed.
      setSubject(result.author ?? query.trim());
      setStatus("results");
    } else {
      setError(result.error ?? "Couldn't fetch quotes. Try again.");
      setStatus("idle");
    }
  }

  function newSearch() {
    setStatus("idle");
    setQuotes([]);
    setSubject("");
    setQuery("");
    setError(null);
  }

  // ── Loading (interface-2) ──────────────────────────────────────────────
  if (status === "loading") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-64">
        <h1 className="animate-pulse text-center text-[32px] font-light leading-snug text-ink">
          Retrieving quotes ...
        </h1>
      </main>
    );
  }

  // ── Results (interface-3) ──────────────────────────────────────────────
  // `main` fills the height below the logo and clips overflow; the quote list
  // is the only scroller, so cards scroll *over* the fixed bottom band.
  if (status === "results") {
    return (
      <main className="flex flex-1 flex-col items-center overflow-hidden px-6 pt-12">
        <div className="flex h-full w-full max-w-163.75 flex-col gap-12">
          {/* Header row: title + New search button (stays put while list scrolls) */}
          <div className="flex shrink-0 items-center justify-between gap-4">
            <h1 className="text-[32px] font-light leading-snug text-ink">
              Quotes by {subject}
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
                <p className="text-base leading-5.5 text-ink">{quote}</p>
                <Image
                  src="/bookmark.svg"
                  alt=""
                  width={20}
                  height={20}
                  className="shrink-0"
                />
              </li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

  // ── Idle / search (interface-1) ────────────────────────────────────────
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 pb-64">
      <div className="flex w-full max-w-130 flex-col items-center gap-6">
        <h1 className="text-center text-[32px] font-light leading-snug text-ink">
          Whose words are you looking for ?
        </h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runSearch();
          }}
          className="flex w-full flex-col items-center gap-2"
        >
          <div className="flex w-full items-center justify-center gap-2">
            {/* Input wrapper — white, 1px #EFF2F5 border, 12px radius */}
            <div className="flex h-12 w-full max-w-100 items-center gap-2 rounded-xl border border-[#eff2f5] bg-white px-4">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try Plato"
                aria-label="Thinker's name"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-[#999999]"
              />
            </div>

            {/* Accent search button — square, 20px icon so it reads clearly */}
            <button
              type="submit"
              aria-label="Search"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent transition-opacity hover:opacity-90"
            >
              <Image src="/search.svg" alt="" width={20} height={20} />
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </div>
    </main>
  );
}
