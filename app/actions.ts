"use server";

import { generateText, Output } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

const QuotesSchema = z.object({
  author: z.string(),
  quotes: z.array(z.string()).min(1).max(15),
});

export async function getQuotes(name: string) {
  const thinker = name.trim();
  if (!thinker) return { error: "Please enter a name." };
  if (thinker.length > 80) return { error: "That name is too long." };

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
      prompt:
        `The user typed "${thinker}", which may be misspelled or informal ` +
        `(e.g. "nitche" → "Friedrich Nietzsche", "shakespere" → "William Shakespeare"). ` +
        `Identify the well-known person they most likely mean and set "author" to ` +
        `that person's correctly-spelled, commonly-used name. ` +
        `Then return up to 15 well-known quotes by that author. ` +
        `Only include quotes you are confident are real and correctly attributed; ` +
        `if unsure, return fewer rather than inventing any. Each quote stands on its own.`,
    });
    return { author: output.author, quotes: output.quotes };
  } catch (err) {
    console.error("getQuotes failed:", err);
    return { error: "Couldn't fetch quotes. Try again." };
  }
}