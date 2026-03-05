"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [chatHistory]);

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

  // Timer
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

  // Init chat when session starts
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <h2 className="text-xl font-bold">Dolacz do sesji</h2>
        <input
          type="text"
          placeholder="Twoje imie / nick"
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          className="w-72 bg-white/10 border border-white/20 rounded-lg p-3 text-white text-center focus:outline-none focus:border-gold"
          maxLength={30}
        />
        <button
          onClick={handleJoin}
          disabled={!nick.trim()}
          className="bg-gold hover:bg-yellow-500 text-navy font-bold px-8 py-3 rounded-lg transition-colors disabled:opacity-50"
        >
          Dolacz
        </button>
      </div>
    );
  }

  // WAITING FOR START
  if (sessionStatus === "waiting") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-gold text-4xl pulse-glow">&#9679;</div>
        <h2 className="text-xl font-bold">Czekaj na start sesji</h2>
        <p className="text-white/50 text-sm">
          Polaczono jako <span className="text-gold">{nick}</span>
        </p>
      </div>
    );
  }

  // ACTIVE or FINISHED - show chat
  const chatLocked = timeUp || sessionStatus === "finished";

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      {/* Timer */}
      {sessionStatus === "active" && timeLeft !== null && (
        <div className="text-center mb-4">
          <span
            className={`text-4xl font-bold font-mono ${
              timeLeft < 60000 ? "text-red-400" : "text-gold"
            }`}
          >
            {formatTime(timeLeft)}
          </span>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="bg-white/5 rounded-lg p-6 mb-4">
          <h2 className="text-gold font-bold text-lg mb-3">Wyniki grupy</h2>
          <div className="text-white/90 whitespace-pre-wrap leading-relaxed text-sm">
            {summary}
          </div>
        </div>
      )}

      {/* Status messages */}
      {finished && !summary && (
        <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4 mb-4 text-center">
          <span className="text-green-400">&#10004;</span> Gotowe! Czekaj na
          wyniki grupy.
        </div>
      )}

      {chatLocked && !finished && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 mb-4 text-center">
          Czas minal. Czekaj na wyniki grupy.
        </div>
      )}

      {/* Chat */}
      <div className="flex-1 overflow-y-auto chat-scroll bg-white/5 rounded-lg p-4 space-y-3 mb-4">
        {chatHistory.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-gold/20 text-gold"
                  : "bg-white/10 text-white/90"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-lg px-4 py-2 text-sm text-white/50">
              Pisze...
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
            placeholder="Twoja odpowiedz..."
            disabled={sending}
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="bg-gold hover:bg-yellow-500 text-navy font-bold px-6 rounded-lg transition-colors disabled:opacity-50"
          >
            Wyslij
          </button>
        </div>
      )}
    </div>
  );
}
