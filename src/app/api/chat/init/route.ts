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

  const [status, config, participant] = await Promise.all([
    getSessionStatus(),
    getSessionConfig(),
    getParticipant(nick),
  ]);

  if (status !== "active") {
    return NextResponse.json(
      { error: "Session not active" },
      { status: 400 }
    );
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

  const systemPrompt = `Jestes pomocnym asystentem prowadzacym krotki wywiad diagnostyczny.
Kontekst grupy: ${config.context}
Zadajesz pytania jedno po jednym, reagujesz krotko i zyczliwie (max 2 zdania po polsku),
potem zadajesz nastepne pytanie. Nie zadawaj dodatkowych pytan poza wyznaczonymi.
Po ostatniej odpowiedzi napisz cieple podsumowanie profilu tej osoby (3-4 zdania).

Pytania do zadania (zadawaj je po kolei):
${config.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Rozpocznij od krotkiego, cieplego powitania (1 zdanie) i zadaj pierwsze pytanie.`;

  const greeting = await chatWithAI(systemPrompt, [
    {
      role: "user",
      content: `Czesc, mam na imie ${nick}. Jestem gotowy/a na pytania.`,
    },
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
