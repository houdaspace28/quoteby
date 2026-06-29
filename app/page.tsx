import QuoteFinder from "./components/QuoteFinder";

// This page is a Server Component (no "use client"): it renders the static
// shell — the decorative band — with zero client JavaScript. The interactive
// part (<QuoteFinder />) opts into the client on its own and renders the logo
// header plus the search / loading / results / saved views.
export default function Home() {
  return (
    <div className="relative isolate flex h-svh flex-col overflow-hidden bg-paper">
      {/* Credit — top-left, balancing the logo (centre) and Saved entry (right).
          Opens GitHub in a new tab; rel="noreferrer" drops the referrer and
          closes the reverse-tabnabbing hole that target="_blank" otherwise opens. */}
      <a
        href="https://github.com/houdaspace28"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed left-6 top-5 z-20 flex items-center gap-1.5 text-xs text-[#999999] transition-opacity hover:opacity-70"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="currentColor"
        >
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
        with love, houda & claude
      </a>

      <QuoteFinder />

      {/* Decorative photo band along the bottom — the "background" frame from
          Figma. `band-seamless.png` is a properly tileable version of the flower
          image: its faded transparent edges are cross-faded (the right tail is
          wrapped over the left fade-in), so `repeat-x` joins are continuous with
          no seam or paper gap — and no mirroring. It spans any viewport width.
          `-z-10` keeps it behind the cards; decorative, so hidden from a11y. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-64 bg-size-[auto_100%] bg-repeat-x"
        style={{ backgroundImage: "url('/band-seamless.png')" }}
      />
    </div>
  );
}
