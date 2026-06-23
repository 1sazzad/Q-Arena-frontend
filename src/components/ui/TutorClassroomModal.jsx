import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Eraser,
  Mic,
  MicOff,
  MoreHorizontal,
  MousePointer2,
  Pause,
  PenTool,
  Play,
  Redo2,
  Send,
  Square,
  StopCircle,
  Trash2,
  Type,
  Undo2,
  X,
} from "lucide-react";
import { apiEndpoints } from "../../api/api";
import MathRenderer from "../MathRenderer";
import { Badge, Card, LoadingSpinner } from "./index";

const TEACHER_UNAVAILABLE = "Q Arena AI Teacher is unavailable. Please try again.";

function formatDuration(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .trim();
}

function extractExplanationBlocks(tutorResponse) {
  if (!tutorResponse) return [];

  const blocks = [];
  const intro = tutorResponse.teacher_explanation || tutorResponse.explanation || tutorResponse.answer || tutorResponse.message;

  if (intro) {
    blocks.push({ type: "paragraph", content: Array.isArray(intro) ? intro.join("\n\n") : intro });
  }

  const stepCandidates = tutorResponse.whiteboard_steps || tutorResponse.steps || [];
  if (Array.isArray(stepCandidates)) {
    stepCandidates.forEach((step) => {
      if (typeof step === "string") {
        blocks.push({ type: "paragraph", content: step });
        return;
      }

      if (step && typeof step === "object") {
        blocks.push(step);
      }
    });
  }

  return blocks;
}

function renderExplanationBlock(block, index) {
  const type = String(block?.type || "").toLowerCase();

  if (type === "heading") {
    return <h5 className="text-sm font-semibold text-indigo-700">{normalizeText(block.title || block.content || `Step ${index + 1}`)}</h5>;
  }

  if (type === "table" || type === "truth_table") {
    const headers = Array.isArray(block.headers) ? block.headers : [];
    const rows = Array.isArray(block.rows) ? block.rows : [];

    if (headers.length || rows.length) {
      return (
        <div className="min-w-0 max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm text-slate-700">
            {headers.length > 0 ? (
              <thead>
                <tr>
                  {headers.map((h, i) => (
                    <th key={`${index}-h-${i}`} className="border-b border-slate-200 px-3 py-2 font-semibold">{normalizeText(h)}</th>
                  ))}
                </tr>
              </thead>
            ) : null}
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${index}-r-${rowIndex}`}>
                  {(Array.isArray(row) ? row : []).map((cell, cellIndex) => (
                    <td key={`${index}-c-${rowIndex}-${cellIndex}`} className="border-t border-slate-100 px-3 py-2">{normalizeText(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }

  if (type === "formula") {
    const formula = normalizeText(block.formula || block.latex || block.content);
    return (
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
        <MathRenderer value={formula} className="text-sm" />
      </div>
    );
  }

  if (Array.isArray(block?.items)) {
    return (
      <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
        {block.items.map((item, itemIndex) => (
          <li key={`${index}-item-${itemIndex}`}>{normalizeText(item?.content || item)}</li>
        ))}
      </ul>
    );
  }

  return <MathRenderer value={normalizeText(block?.content || block?.text || block?.description || block)} className="text-sm text-slate-800" />;
}

export default function TutorClassroomModal({
  isOpen,
  onClose,
  tutorResponse = null,
  loading = false,
  error = null,
  onRetry = null,
  selectedTutorQuestion = null,
}) {
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState("");

  const [voiceSupported] = useState(() => Boolean(typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition)));
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef(null);

  const [sessionPaused, setSessionPaused] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);

  const chatScrollRef = useRef(null);

  const questionId = useMemo(
    () => selectedTutorQuestion?.id || selectedTutorQuestion?.question_id || tutorResponse?.question_id || tutorResponse?.question_context?.question_id || null,
    [selectedTutorQuestion, tutorResponse],
  );

  const context = tutorResponse?.question_context || {};
  const metadata = context?.metadata || {};

  const subject = selectedTutorQuestion?.subject_name || tutorResponse?.subject_name || context?.subject_name || "Current Subject";
  const subjectCode = selectedTutorQuestion?.subject_code || tutorResponse?.subject_code || context?.subject_code || "—";
  const topic = selectedTutorQuestion?.topic || metadata?.topic || context?.topic || "General";
  const difficulty = selectedTutorQuestion?.difficulty || metadata?.difficulty || tutorResponse?.difficulty || "—";
  const sourceDb = selectedTutorQuestion?.source || "Q Arena DB";

  const explanationBlocks = useMemo(() => extractExplanationBlocks(tutorResponse), [tutorResponse]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    if (sessionPaused) return;

    const id = setInterval(() => {
      setSessionSeconds((v) => v + 1);
    }, 1000);

    return () => clearInterval(id);
  }, [isOpen, sessionPaused]);

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages, chatSending]);

  const startListening = () => {
    setVoiceError("");
    try {
      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Recognition) {
        setVoiceError("Voice input is unsupported in this browser.");
        return;
      }

      const recognition = new Recognition();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = String(event?.results?.[0]?.[0]?.transcript || "").trim();
        if (transcript) {
          setChatInput((prev) => {
            const text = String(prev || "").trim();
            return text ? `${text} ${transcript}` : transcript;
          });
        }
      };
      recognition.onerror = (event) => {
        if (event?.error === "not-allowed" || event?.error === "permission-denied") {
          setVoiceError("Microphone permission denied.");
        } else {
          setVoiceError("Voice input is unavailable right now.");
        }
      };
      recognition.onend = () => {
        recognitionRef.current = null;
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceError("Voice input is unavailable right now.");
    }
  };

  const stopListening = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    } catch {
      void 0;
    }
    setIsListening(false);
  };

  const sendChat = async () => {
    const trimmed = String(chatInput || "").trim();
    if (!trimmed || chatSending || !questionId) return;

    const nextMessage = { id: `u-${Date.now()}`, role: "user", text: trimmed };
    const history = chatMessages.map((m) => ({ role: m.role, content: m.text }));

    setChatMessages((prev) => [...prev, nextMessage]);
    setChatInput("");
    setChatError("");
    setChatSending(true);

    try {
      const response = await apiEndpoints.chatTutorQuestion(questionId, {
        message: trimmed,
        chat_history: history,
      });
      const data = response?.data ?? response;
      const reply = normalizeText(data?.reply || data?.answer || data?.message);

      setChatMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", text: reply || TEACHER_UNAVAILABLE },
      ]);
    } catch (err) {
      console.error("Tutor chat failed", err);
      setChatError(TEACHER_UNAVAILABLE);
    } finally {
      setChatSending(false);
    }
  };

  const SessionControls = () => {
    return (
      <div className="space-y-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-3">
          <h4 className="text-sm font-semibold text-slate-900">Session Controls</h4>
          <p className="mt-2 text-xs text-slate-600">Live Session</p>
          <p className="text-lg font-semibold text-indigo-700">{formatDuration(sessionSeconds)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setSessionPaused((v) => !v)} className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700">
              {sessionPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              {sessionPaused ? "Resume" : "Pause Session"}
            </button>
            <button type="button" onClick={onClose} className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-2 text-xs font-semibold text-rose-700">
              <StopCircle className="h-3.5 w-3.5" />
              End Session
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-3">
          <h4 className="text-sm font-semibold text-slate-900">Conversation Flow</h4>
          <ol className="mt-2 space-y-2 text-xs text-slate-700">
            <li className="rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-1.5">Initial Explanation</li>
            <li className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">{topic || "Current topic"} step</li>
            <li className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">Current follow-up step</li>
            <li className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">Summary</li>
          </ol>
        </section>

        <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3">
          <h4 className="text-sm font-semibold text-indigo-800">Continue Class</h4>
          <p className="mt-1 text-xs text-indigo-700">We'll continue from here</p>
          <button type="button" className="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">Continue Class</button>
        </section>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto p-2 sm:p-4 lg:p-6"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" />

      <Card className="relative z-10 mx-auto flex max-h-[calc(100dvh-16px)] w-[calc(100vw-16px)] max-w-[calc(100vw-16px)] sm:w-[min(92vw,48rem)] lg:w-[min(90vw,72rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl">
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 sm:px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Tutor Classroom</h3>
                <p className="text-xs text-slate-500">AI Tutor is explaining the solution</p>
              </div>
              <Badge tone="emerald">
                <span className="inline-flex items-center gap-1 text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live
                </span>
              </Badge>
            </div>

            <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Close Tutor classroom">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs lg:grid-cols-3 xl:grid-cols-6">
            <p className="text-slate-600">Subject: <span className="font-semibold text-slate-900">{subject}</span></p>
            <p className="text-slate-600">Subject Code: <span className="font-semibold text-slate-900">{subjectCode}</span></p>
            <p className="text-slate-600">Topic: <span className="font-semibold text-slate-900">{topic}</span></p>
            <p className="text-slate-600">Difficulty: <span className="font-semibold text-slate-900">{difficulty}</span></p>
            <p className="text-slate-600">Question ID: <span className="font-semibold text-slate-900">{questionId || "—"}</span></p>
            <p className="text-slate-600">Source / DB: <span className="font-semibold text-slate-900">{sourceDb}</span></p>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <main className="min-h-0 overflow-visible lg:overflow-hidden lg:border-r border-slate-100 min-w-0">
            <div className="flex h-full min-h-0 flex-col">
              <div className="min-h-[260px] max-h-[45dvh] overflow-y-auto px-4 sm:px-5 py-4 lg:flex-1 lg:min-h-0" ref={chatScrollRef}>
                <div className="mb-4 px-4 sm:px-5 lg:hidden">
                  <SessionControls />
                </div>
                <section className="relative rounded-2xl border border-indigo-100 bg-white p-4">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(99,102,241,0.14)_1px,transparent_1px)] [background-size:16px_16px]" />
                  <div className="relative z-10 space-y-3">
                    <h4 className="text-sm font-semibold text-indigo-700">AI Whiteboard Explanation</h4>

                    {loading ? (
                      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                        <LoadingSpinner />
                        Q Arena is preparing your explanation...
                      </div>
                    ) : error ? (
                      <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
                        <p className="text-sm text-rose-700">{String(error || TEACHER_UNAVAILABLE)}</p>
                        {typeof onRetry === "function" ? (
                          <button type="button" onClick={onRetry} className="rounded-lg border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700">Retry</button>
                        ) : null}
                      </div>
                    ) : explanationBlocks.length === 0 ? (
                      <p className="text-sm text-slate-600">No explanation available yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {explanationBlocks.map((block, index) => (
                          <div key={`exp-${index}`} className="rounded-xl border border-slate-100 bg-white/90 p-3">
                            {renderExplanationBlock(block, index)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                <section className="mt-4 space-y-3">
                  <h4 className="text-sm font-semibold text-indigo-700">Live Interaction</h4>
                  {chatMessages.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">No messages yet. Ask a follow-up question.</p> : null}

                  {chatMessages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[86%] min-w-0 rounded-2xl px-3 py-2 text-sm ${message.role === "user" ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-800"}`}>
                        <MathRenderer value={normalizeText(message.text)} />
                        {message.role === "assistant" ? <p className="mt-1 text-[11px] text-slate-500">Q Arena AI Teacher</p> : null}
                      </div>
                    </div>
                  ))}

                  {chatSending ? <p className="text-sm text-slate-500">Q Arena is preparing your explanation...</p> : null}
                </section>
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-slate-50/70 px-4 sm:px-5 py-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="rounded-md border border-slate-200 bg-white px-2 py-1">Whiteboard tools</span>
                  <button type="button" className="rounded-md border border-slate-200 bg-white p-1.5"><Undo2 className="h-3.5 w-3.5" /></button>
                  <button type="button" className="rounded-md border border-slate-200 bg-white p-1.5"><Redo2 className="h-3.5 w-3.5" /></button>
                  <button type="button" className="rounded-md border border-slate-200 bg-white p-1.5"><MousePointer2 className="h-3.5 w-3.5" /></button>
                  <button type="button" className="rounded-md border border-slate-200 bg-white p-1.5"><PenTool className="h-3.5 w-3.5" /></button>
                  <button type="button" className="rounded-md border border-slate-200 bg-white p-1.5"><Eraser className="h-3.5 w-3.5" /></button>
                  <button type="button" className="rounded-md border border-slate-200 bg-white p-1.5"><Square className="h-3.5 w-3.5" /></button>
                  <button type="button" className="rounded-md border border-slate-200 bg-white p-1.5"><Type className="h-3.5 w-3.5" /></button>
                  <span className="ml-1 inline-flex gap-1">
                    <span className="h-3 w-3 rounded-full bg-indigo-500" />
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="h-3 w-3 rounded-full bg-rose-500" />
                  </span>
                  <button type="button" className="rounded-md border border-slate-200 bg-white p-1.5"><MoreHorizontal className="h-3.5 w-3.5" /></button>
                  <button type="button" className="rounded-md border border-slate-200 bg-white p-1.5"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>

              <div className="sticky bottom-0 shrink-0 border-t border-slate-200 bg-white px-4 sm:px-5 py-3">
                {chatError ? <p className="mb-2 text-sm text-rose-600">{chatError}</p> : null}
                {voiceError ? <p className="mb-2 text-sm text-amber-700">{voiceError}</p> : null}

                {/* Mobile-first: stack input full width, buttons on the next row. On sm+ keep horizontal layout. */}
                <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:flex-nowrap">
                  {/* Textarea first on mobile (order-1), then buttons. On sm the attach button appears left of the textarea via sm:order classes. */}
                  <textarea
                    rows={2}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendChat();
                      }
                    }}
                    placeholder="Ask a follow-up question..."
                    className="order-1 sm:order-2 max-h-28 min-h-[42px] min-w-0 w-full flex-none sm:flex-1 resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:bg-white"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      if (isListening) stopListening();
                      else startListening();
                    }}
                    disabled={!voiceSupported}
                    className={`order-2 sm:order-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border ${isListening ? "border-red-200 bg-red-50 text-red-600" : "border-slate-200 text-slate-700"} disabled:opacity-50`}
                    aria-label={isListening ? "Stop voice input" : "Start voice input"}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={sendChat}
                    disabled={!String(chatInput || "").trim() || chatSending || !questionId}
                    className="order-3 sm:order-3 inline-flex h-10 items-center gap-1 rounded-xl bg-indigo-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </button>
                </div>

                {isListening ? <p className="mt-1 text-xs text-slate-500">Listening... Tap to stop</p> : null}
              </div>
            </div>
          </main>

          <aside className="hidden lg:block min-h-0 overflow-y-auto bg-slate-50 p-4 min-w-0">
            <SessionControls />
          </aside>
        </div>
      </Card>
    </div>
  );
}
