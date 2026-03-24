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
  >,
  language: "pl" | "en" = "pl"
): Promise<string> {
  const isEn = language === "en";

  const noAnswer = isEn ? "(no answer)" : "(brak)";
  const participantsList = Object.entries(participantsData)
    .filter(([, d]) => d.answers.length > 0)
    .map(([nick, d]) => {
      const qa = questions
        .map(
          (q, i) =>
            `  ${isEn ? "Q" : "P"}: ${q}\n  ${isEn ? "A" : "O"}: ${d.answers[i] || noAnswer}`
        )
        .join("\n");
      return `${nick}:\n${qa}`;
    })
    .join("\n\n");

  const totalParticipants = Object.entries(participantsData).filter(
    ([, d]) => d.answers.length > 0
  ).length;

  const systemPrompt = isEn
    ? `You are an experienced consultant and analyst. The session facilitator asked a group of participants to answer several questions. Your task is to write a concise, substantive opinion about this group.

You have three sources of information:
1. SESSION CONTEXT — describes who the participants are, what the purpose of the study is, what we want to verify
2. QUESTIONS — what questions were asked to participants
3. ANSWERS — what they specifically answered

Based on this, write an expert opinion addressed to the session facilitator. The opinion should:
- Describe the picture of the group that emerges from the answers (don't repeat questions or answers — synthesize)
- Relate to the context: is the group where it should be? What do the answers tell us in the context of the study's purpose?
- Identify patterns, interesting signals, gaps, strengths
- End with a concrete recommendation for the facilitator: what does this mean for further sessions/work

Style: natural, expert, in English. Like a short consultant's note after a diagnostic session.
Do NOT use rigid templates, numbered lists or headings. Write in flowing text with paragraphs.
You may use emoji if they improve readability, but sparingly.
Length: 150-300 words.`
    : `Jestes doswiadczonym konsultantem i analitykiem. Prowadzacy sesje poprosil grupe uczestnikow o odpowiedzi na kilka pytan. Twoim zadaniem jest napisac zwiezla, merytoryczna opinie o tej grupie.

Masz trzy zrodla informacji:
1. KONTEKST SESJI — opisuje kto to sa uczestnicy, jaki jest cel badania, co chcemy zweryfikowac
2. PYTANIA — jakie pytania zadano uczestnikom
3. ODPOWIEDZI — co konkretnie odpowiedzieli

Na tej podstawie napisz opinie ekspercka skierowana do prowadzacego sesje. Opinia powinna:
- Opisywac obraz grupy jaki wynika z odpowiedzi (nie powtarzaj pytan ani odpowiedzi — syntezuj)
- Odnosic sie do kontekstu: czy grupa jest tam gdzie powinna byc? co wynika z odpowiedzi w kontekscie celu badania?
- Wychwycic wzorce, ciekawe sygnaly, luki, mocne strony
- Zakonczyc sie konkretna wskazowka dla prowadzacego: co z tego wynika na dalsze zajecia/prace

Styl: naturalny, ekspercki, po polsku. Jak krotka notatka konsultanta po sesji diagnostycznej.
NIE uzywaj sztywnych szablonow, numerowanych list ani naglowkow. Pisz plynnym tekstem z akapitami.
Mozesz uzyc emoji jesli poprawiaja czytelnosc, ale oszczednie.
Dlugosc: 150-300 slow.`;

  const sessionCtxLabel = isEn ? "SESSION CONTEXT" : "KONTEKST SESJI";
  const questionsLabel = isEn
    ? "QUESTIONS ASKED TO PARTICIPANTS"
    : "PYTANIA ZADANE UCZESTNIKOM";
  const answersLabel = isEn ? "ANSWERS" : "ODPOWIEDZI";
  const participantsLabel = isEn ? "participants" : "uczestnikow";

  const userMessage = `${sessionCtxLabel}:
${context}

${questionsLabel}:
${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

${answersLabel} (${totalParticipants} ${participantsLabel}):
${participantsList}`;

  return chatWithAI(systemPrompt, [{ role: "user", content: userMessage }]);
}
