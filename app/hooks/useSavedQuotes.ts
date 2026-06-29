"use client";

import { useSyncExternalStore } from "react";

// A saved quote always keeps its author, even when the results view hides it
// (author-pinned mode), so the Saved view can always show attribution.
export type Quote = { text: string; author: string };

const KEY = "quoteby:saved";

// Stable identity for de-duping a quote. A unit-separator (U+001F) won't appear
// in real quote text, so it safely joins the two fields into one key.
const idOf = (q: Quote) => `${q.author}${q.text}`;

// localStorage *is* an external store, so we read it through useSyncExternalStore
// rather than mirroring it into React state with an effect. That avoids the
// "setState inside an effect" cascade, fixes hydration via a server snapshot,
// and gives cross-tab sync for free (the native `storage` event).
//
// useSyncExternalStore requires getSnapshot to return a *stable* reference while
// the underlying value is unchanged — so we cache the parsed array keyed by its
// raw JSON string, and reuse one EMPTY instance for the empty/unavailable case.
const EMPTY: Quote[] = [];
let cachedRaw: string | null = null;
let cachedValue: Quote[] = EMPTY;

function read(): Quote[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY; // storage unavailable (e.g. blocked)
  }
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    cachedValue = raw ? JSON.parse(raw) : EMPTY;
  } catch {
    cachedValue = EMPTY; // corrupted contents — treat as empty
  }
  return cachedValue;
}

// In-tab listeners. The native `storage` event only fires in *other* tabs, so we
// notify our own subscribers explicitly after a write.
const listeners = new Set<() => void>();

function write(next: Quote[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return; // storage full or blocked — saving silently no-ops
  }
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

// Server (and the first hydration render) has no localStorage: return the stable
// empty snapshot so client and server markup match, then React re-renders with
// the real value after hydration.
const getServerSnapshot = () => EMPTY;

// Saved quotes live only in this browser's localStorage — no account, no server.
// The trade-off is intentional: per-device, wiped when browsing data is cleared.
export function useSavedQuotes() {
  const saved = useSyncExternalStore(subscribe, read, getServerSnapshot);

  function toggle(q: Quote) {
    const cur = read();
    write(
      cur.some((s) => idOf(s) === idOf(q))
        ? cur.filter((s) => idOf(s) !== idOf(q))
        : [...cur, q],
    );
  }

  function isSaved(q: Quote) {
    return saved.some((s) => idOf(s) === idOf(q));
  }

  return { saved, toggle, isSaved };
}
