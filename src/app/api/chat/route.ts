import { NextResponse } from "next/server";
import {
  getSessionConfig,
  getSessionStatus,
  getParticipant,
  setParticipant,
} from "@/lib/redis";
import { chatWithAI } from "@/lib/ai";

export async function POST(request: Request) {
  const { nick, message } = await request.json();

  if (!nick || !message) {
    return NextResponse.json(
      { error: "Nick and message required" },
      { status: 400 }
    );
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

  if (participant.status === "finished") {
    return NextResponse.json(
      { error: "Already finished" },
      { status: 400 }
    );
  }

  // Check timer
  if (config.startedAt) {
    const elapsed = Date.now() - config.startedAt;
    const limit = config.duration * 60 * 1000;
    if (elapsed > limit) {
      return NextResponse.json(
        { error: "Time is up" },
        { status: 400 }
      );
    }
  }

  const currentQ = participant.currentQuestion;
  const totalQuestions = config.questions.length;

  // Record user answer
  participant.answers.push(message);
  participant.chatHistory.push({ role: "user", content: message });

  const systemPrompt = `Jestes pomocnym asystentem prowadzacym krotki wywiad diagnostyczny.
Kontekst grupy: ${config.context}
Zadajesz pytania jedno po jednym, reagujesz krotko i zyczliwie (max 2 zdania po polsku),
potem zadajesz nastepne pytanie. Nie zadawaj dodatkowych pytan poza wyznaczonymi.
Po ostatniej odpowiedzi napisz cieple podsumowanie profilu tej osoby (3-4 zdania).

Pytania do zadania (zadawaj je po kolei):
${config.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Aktualnie uczestnik odpowiedzial na pytanie nr ${currentQ + 1} z ${totalQuestions}.
${currentQ + 1 < totalQuestions ? `Nastepne pytanie do zadania to: ${config.questions[currentQ + 1]}` : "To bylo ostatnie pytanie. Napisz podsumowanie profilu."}`;

  const aiResponse = await chatWithAI(systemPrompt, participant.chatHistory);

  participant.chatHistory.push({ role: "assistant", content: aiResponse });
  participant.currentQuestion = currentQ + 1;

  if (currentQ + 1 >= totalQuestions) {
    participant.status = "finished";
    participant.finishedAt = Date.now();
  } else {
    participant.status = "in_progress";
  }

  await setParticipant(nick, participant);

  return NextResponse.json({
    reply: aiResponse,
    currentQuestion: participant.currentQuestion,
    finished: participant.status === "finished",
  });
}
