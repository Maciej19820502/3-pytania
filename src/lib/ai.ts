import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

function getAnthropicClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function chatWithAI(
  systemPrompt: string,
  messages: { role: "assistant" | "user"; content: string }[]
): Promise<string> {
  // Try Claude first
  const anthropic = getAnthropicClient();
  if (anthropic) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      const block = response.content[0];
      if (block.type === "text") return block.text;
    } catch (e) {
      console.error("Claude API error, falling back to OpenAI:", e);
    }
  }

  // Fallback to OpenAI
  const openai = getOpenAIClient();
  if (openai) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as "assistant" | "user",
          content: m.content,
        })),
      ],
    });
    return response.choices[0]?.message?.content || "Brak odpowiedzi.";
  }

  throw new Error("No AI API key configured");
}

export async function generateGroupSummary(
  context: string,
  questions: string[],
  participantsData: Record<
    string,
    { answers: string[]; status: string }
  >
): Promise<string> {
  const participantsList = Object.entries(participantsData)
    .filter(([, d]) => d.answers.length > 0)
    .map(([nick, d]) => {
      const qa = questions
        .map((q, i) => `  P: ${q}\n  O: ${d.answers[i] || "(brak)"}`)
        .join("\n");
      return `${nick}:\n${qa}`;
    })
    .join("\n\n");

  const systemPrompt = `Jestes ekspertem od analizy danych z ankiet i wywiadow. Kontekst grupy: ${context}

Przeanalizuj odpowiedzi uczestnikow i wygeneruj podsumowanie grupowe w formacie:

1. Laczna liczba uczestnikow: X
2. Rozklad czestotliwosci uzywania AI (np. "60% -- sporadycznie, 25% -- regularnie")
3. Top 3 obawy wymienione przez grupe (syntetycznie)
4. Top 3 narzedzia AI wymienione przez grupe
5. Ocena dojrzalosci AI grupy: 1-5 z jednozdaniowym uzasadnieniem (uzyj emoji gwiazdek)
6. Rekomendacja dla prowadzacego (jedno zdanie -- na co zwrocic uwage w dalszych zajeciach)

Pisz po polsku, zwiezle i profesjonalnie. Uzywaj emoji dla czytelnosci.`;

  const userMessage = `Oto odpowiedzi uczestnikow na 3 pytania diagnostyczne:\n\n${participantsList}`;

  return chatWithAI(systemPrompt, [{ role: "user", content: userMessage }]);
}
