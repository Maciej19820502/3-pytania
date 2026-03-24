import { NextResponse } from "next/server";
import {
  getSessionConfig,
  getSessionStatus,
  getParticipant,
  setParticipant,
} from "@/lib/redis";
import { chatWithAI } from "@/lib/ai";

export async function POST(request: Request) {
  const { nick } = await request.json();

  if (!nick) {
    return NextResponse.json({ error: "Nick required" }, { status: 400 });
  }

  const [status, config] = await Promise.all([
    getSessionStatus(),
    getSessionConfig(),
  ]);

  if (status !== "active") {
    return NextResponse.json(
      { error: "Session not active" },
      { status: 400 }
    );
  }

  let participant = await getParticipant(nick);

  if (!participant) {
    await setParticipant(nick, {
      status: "waiting",
      answers: [],
      currentQuestion: 0,
      finishedAt: null,
      chatHistory: [],
    });
    participant = await getParticipant(nick);
  }

  if (!participant) {
    return NextResponse.json(
      { error: "Participant not found" },
      { status: 404 }
    );
  }

  // If chat already initialized, return existing history
  if (participant.chatHistory.length > 0) {
    return NextResponse.json({
      chatHistory: participant.chatHistory,
      currentQuestion: participant.currentQuestion,
      finished: participant.status === "finished",
    });
  }

  const isEn = config.language === "en";

  const systemPrompt = isEn
    ? `You are a helpful assistant conducting a short diagnostic interview.
Group context: ${config.context}
Ask questions one by one, react briefly and warmly (max 2 sentences in English),
then ask the next question. Do not ask additional questions beyond the assigned ones.
After the last answer, write a warm summary of this person's profile (3-4 sentences).

Questions to ask (ask them in order):
${config.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Start with a short, warm greeting (1 sentence) and ask the first question.`
    : `Jestes pomocnym asystentem prowadzacym krotki wywiad diagnostyczny.
Kontekst grupy: ${config.context}
Zadajesz pytania jedno po jednym, reagujesz krotko i zyczliwie (max 2 zdania po polsku),
potem zadajesz nastepne pytanie. Nie zadawaj dodatkowych pytan poza wyznaczonymi.
Po ostatniej odpowiedzi napisz cieple podsumowanie profilu tej osoby (3-4 zdania).

Pytania do zadania (zadawaj je po kolei):
${config.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Rozpocznij od krotkiego, cieplego powitania (1 zdanie) i zadaj pierwsze pytanie.`;

  const userMessage = isEn
    ? `Hi, my name is ${nick}. I'm ready for the questions.`
    : `Czesc, mam na imie ${nick}. Jestem gotowy/a na pytania.`;

  const greeting = await chatWithAI(systemPrompt, [
    { role: "user", content: userMessage },
  ]);

  participant.chatHistory = [{ role: "assistant", content: greeting }];
  participant.status = "in_progress";
  await setParticipant(nick, participant);

  return NextResponse.json({
    chatHistory: participant.chatHistory,
    currentQuestion: 0,
    finished: false,
  });
}
