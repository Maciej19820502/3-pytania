"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { translations, Language } from "@/lib/translations";

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
}

export default function ParticipantPage() {
  const [nick, setNick] = useState("");
  const [joined, setJoined] = useState(false);
  const [sessionStatus, setSessionStatus] = useState("waiting");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [configDuration, setConfigDuration] = useState(5);
  const [summary, setSummary] = useState<string | null>(null);
  const [chatInitialized, setChatInitialized] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [lang, setLang] = useState<Language>("pl");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const t = translations[lang];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [chatHistory]);

  // Fetch session language on page load (before joining)
  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.config?.language) setLang(data.config.language);
      })
      .catch(() => {});
  }, []);

  const poll = useCallback(async () => {
    if (!joined) return;
    try {
      const res = await fetch(
        `/api/participant?nick=${encodeURIComponent(nick)}`
      );
      const data = await res.json();
      setSessionStatus(data.sessionStatus);
      if (data.config?.startedAt) setStartedAt(data.config.startedAt);
      if (data.config?.duration) setConfigDuration(data.config.duration);
      if (data.config?.language) setLang(data.config.language);
      if (data.summary) setSummary(data.summary);
      if (data.participant?.status === "finished") setFinished(true);
      if (
        data.participant?.chatHistory?.length > 0 &&
        chatHistory.length === 0
      ) {
        setChatHistory(data.participant.chatHistory);
      }
    } catch (e) {
      console.error("Poll error:", e);
    }
  }, [joined, nick, chatHistory.length]);

  useEffect(() => {
    if (!joined) return;
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [joined, poll]);

  useEffect(() => {
    if (!startedAt || sessionStatus !== "active") {
      setTimeLeft(null);
      return;
    }
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const remaining = configDuration * 60 * 1000 - elapsed;
      const left = Math.max(0, remaining);
      setTimeLeft(left);
      if (left === 0) setTimeUp(true);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, configDuration, sessionStatus]);

  useEffect(() => {
    if (sessionStatus === "active" && joined && !chatInitialized) {
      setChatInitialized(true);
      initChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, joined, chatInitialized]);

  const handleJoin = async () => {
    if (!nick.trim()) return;
    const res = await fetch("/api/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nick: nick.trim() }),
    });
    const data = await res.json();
    if (data.ok) {
      setNick(data.nick);
      setJoined(true);
    }
  };

  const initChat = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/chat/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nick }),
      });
      const data = await res.json();
      if (data.chatHistory) {
        setChatHistory(data.chatHistory);
        if (data.finished) setFinished(true);
      }
    } catch (e) {
      console.error("Init chat error:", e);
    }
    setSending(false);
  };

  const handleSend = async () => {
    if (!input.trim() || sending || finished || timeUp) return;
    const userMsg = input.trim();
    setInput("");
    setChatHistory((prev) => [...prev, { role: "user", content: userMsg }]);
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nick, message: userMsg }),
      });
      const data = await res.json();
      if (data.reply) {
        setChatHistory((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);
      }
      if (data.finished) setFinished(true);
    } catch (e) {
      console.error("Chat error:", e);
    }
    setSending(false);
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  // NOT JOINED
  if (!joined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] fade-in">
        <div className="card p-10 w-full max-w-sm text-center space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-1">{t.joinSession}</h2>
            <p className="text-white/30 text-sm">{t.enterName}</p>
          </div>
          <input
            type="text"
            placeholder={t.namePlaceholder}
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            className="input-field w-full p-3 text-center text-sm"
            maxLength={30}
          />
          <button
            onClick={handleJoin}
            disabled={!nick.trim()}
            className="btn-primary w-full py-3 text-sm"
          >
            {t.join}
          </button>
        </div>
      </div>
    );
  }

  // WAITING FOR START
  if (sessionStatus === "waiting") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] fade-in">
        <div className="card p-10 text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#F0A500]/10 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-[#F0A500] pulse-glow" />
          </div>
          <div>
            <h2 className="text-lg font-bold mb-1">{t.waitingForStart}</h2>
            <p className="text-white/30 text-sm">
              {t.connectedAs}{" "}
              <span className="text-[#F0A500] font-medium">{nick}</span>
            </p>
          </div>
          <p className="text-white/20 text-xs">{t.sessionStartedByHost}</p>
        </div>
      </div>
    );
  }

  const chatLocked = timeUp || sessionStatus === "finished";

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] fade-in">
      {/* Timer */}
      {sessionStatus === "active" && timeLeft !== null && (
        <div className="text-center mb-5">
          <span
            className={`text-4xl font-bold font-mono tabular-nums ${
              timeLeft < 60000
                ? "text-red-400 timer-danger"
                : "text-[#F0A500] timer-glow"
            }`}
          >
            {formatTime(timeLeft)}
          </span>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="card p-6 mb-4 fade-in">
          <p className="section-title mb-4">{t.groupResults}</p>
          <div className="text-white/80 whitespace-pre-wrap leading-relaxed text-sm">
            {summary}
          </div>
        </div>
      )}

      {/* Status messages */}
      {finished && !summary && (
        <div className="card p-5 mb-4 text-center fade-in">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-green-500/10 flex items-center justify-center">
            <span className="text-green-400 text-lg">&#10003;</span>
          </div>
          <p className="text-white/80 text-sm font-medium">{t.doneWaiting}</p>
        </div>
      )}

      {chatLocked && !finished && (
        <div className="card p-5 mb-4 text-center fade-in">
          <p className="text-red-400/80 text-sm font-medium">
            {t.timeUpWaiting}
          </p>
        </div>
      )}

      {/* Chat */}
      <div className="flex-1 overflow-y-auto chat-scroll card p-5 space-y-3 mb-4">
        {chatHistory.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            } fade-in`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start fade-in">
            <div className="chat-bubble-ai px-5 py-3">
              <div className="typing-dots">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      {!chatLocked && !finished && (
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={t.yourAnswer}
            disabled={sending}
            className="input-field flex-1 px-4 py-3 text-sm disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="btn-primary px-5 flex items-center"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
