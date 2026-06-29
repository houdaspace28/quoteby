"use server";

import { generateText, Output } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

// Each quote carries its own author: in "discovery" mode (no author pinned)
// the results can come from many different people, so attribution lives on the
// quote, not on a single page-level subject. `resolvedAuthor` is the corrected
// spelling of the author the user asked for (e.g. "nitche" → "Friedrich
// Nietzsche"), or null when they didn't pin one — the client uses it to build
// the "… by X" part of the heading and to decide whether to show per-card credit.
const QuotesSchema = z.object({
  resolvedAuthor: z.string().nullable(),
  quotes: z
    .array(z.object({ text: z.string(), author: z.string() }))
    .min(1)
    .max(15),
});

// All three inputs are optional, but at least one must be present. The prompt is
// assembled from whichever parts were supplied, so the model is constrained only
// by what the user actually asked for (author, vibe/tone, and/or theme).
export async function getQuotes(input: {
  author?: string;
  vibe?: string;
  theme?: string;
}) {
  const author = input.author?.trim() ?? "";
  const vibe = input.vibe?.trim() ?? "";
  const theme = input.theme?.trim() ?? "";

  if (!author && !vibe && !theme) {
    return { error: "Enter at least one — author, vibe, or theme." };
  }
  if (author.length > 80) return { error: "That name is too long." };
  if (theme.length > 80) return { error: "That theme is too long." };

  // Build the instruction from the supplied parts only.
  const parts: string[] = [
    "Return between 1 and 15 well-known quotes as a JSON object.",
  ];
  if (author) {
    parts.push(
      `The user typed "${author}" as the author, which may be misspelled or ` +
        `informal (e.g. "nitche" → "Friedrich Nietzsche", "shakespere" → ` +
        `"William Shakespeare"). Identify the well-known person they most likely ` +
        `mean, set "resolvedAuthor" to that person's correctly-spelled, ` +
        `commonly-used name, and return quotes by that author only.`,
    );
  } else {
    parts.push(
      `No specific author was requested: set "resolvedAuthor" to null and draw ` +
        `quotes from a variety of well-known people.`,
    );
  }
  if (vibe) parts.push(`Every quote must fit a "${vibe}" vibe and tone.`);
  if (theme) parts.push(`Every quote must be about the theme "${theme}".`);
  parts.push(
    `For each quote, set "author" to the correctly-spelled name of the real ` +
      `person who said it. Only include quotes you are confident are real and ` +
      `correctly attributed; if unsure, return fewer rather than inventing or ` +
      `misattributing any. Each quote stands on its own.`,
  );

  try {
    const { output } = await generateText({
      model: groq("openai/gpt-oss-20b"),
      output: Output.object({ schema: QuotesSchema }),
      temperature: 0.4,
      // gpt-oss-20b is a *reasoning* model: it spends output tokens thinking
      // before emitting the JSON. Groq's default budget is only 1024 tokens, so
      // on harder requests the reasoning exhausts it and the model gets cut off
      // with empty output → Groq's `json_validate_failed` (the intermittent 400).
      // Give it ample headroom, and keep reasoning light since recalling quotes
      // doesn't need deep deliberation — leaving more of the budget for the JSON.
      maxOutputTokens: 4096,
      providerOptions: {
        groq: { reasoningEffort: "low", reasoningFormat: "parsed" },
      },
      prompt: parts.join(" "),
    });
    return { resolvedAuthor: output.resolvedAuthor, quotes: output.quotes };
  } catch (err) {
    console.error("getQuotes failed:", err);
    return { error: "Couldn't fetch quotes. Try again." };
  }
}