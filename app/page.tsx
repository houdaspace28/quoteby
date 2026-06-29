import Image from "next/image";
import QuoteFinder from "./components/QuoteFinder";

// This page is a Server Component (no "use client"): it renders the static
// shell shared by every screen — logo + decorative band — with zero client
// JavaScript. The interactive middle (<QuoteFinder />) opts into the client
// on its own and swaps between the search / loading / results views.
export default function Home() {
  return (
    <div className="relative isolate flex h-svh flex-col overflow-hidden bg-paper">
      {/* Logo — text in the design, but exported from Figma as an SVG so we
          don't have to recreate the "Cal Sans" lettering by hand. */}
      <header className="flex justify-center pt-5">
        <Image src="/logo.svg" alt="quote.by" width={95} height={23} priority />
      </header>

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
