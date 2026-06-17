import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  BookCheck,
  BookMarked,
  Bot,
  Brain,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Mic,
  MicOff,
  Notebook,
  Search,
  Send,
  Settings,
  Target,
  TestTubeDiagonal,
  UserCircle2,
  WandSparkles,
  X,
} from "lucide-react";
import BrandLogo from "../components/BrandLogo";
import MathRenderer from "../components/MathRenderer";
import { apiEndpoints } from "../api/api";
import { useAuth } from "../context/useAuth";
import { Badge, Card } from "../components/ui";

const AVAILABLE_ROUTES = new Set([
  "/dashboard",
  "/subjects",
  "/search",
  "/predictions",
  "/analysis",
  "/profile",
  "/board-papers",
  "/suggestions",
  "/answers",
  "/generate-answer",
  "/ai-tutor",
]);

const SIDEBAR_ITEMS = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "My Subjects", to: "/subjects", icon: BookCheck },
  { label: "Smart Predictions", to: "/predictions", icon: Brain },
  { label: "Search Questions", to: "/search", icon: Search },
  { label: "AI Tutor", to: "/ai-tutor", icon: WandSparkles },
  { label: "Bookmarks", to: "/bookmarks", icon: BookMarked },
  { label: "Practice", to: "/subjects", icon: Target },
  { label: "Mock Tests", to: "/mock-tests", icon: TestTubeDiagonal },
  { label: "Notes", to: "/notes", icon: Notebook },
  { label: "Profile", to: "/profile", icon: UserCircle2 },
  { label: "Settings", to: "/settings", icon: Settings },
  { label: "Help", to: "/support", icon: CircleHelp },
];

function getInitials(name = "Alex Chen") {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "AC";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function SidebarSection({ user, accountMenuOpen, onToggleAccountMenu, onNavigate, onLogout }) {
  return (
    <aside className="flex h-full flex-col overflow-hidden border-r border-slate-200 bg-white">
      <div className="px-5 pb-5 pt-6">
        <BrandLogo className="gap-3" imageClassName="h-9 w-9" textClassName="text-lg font-semibold text-slate-900" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {SIDEBAR_ITEMS.map((item) => {
          const Icon = item.icon;
          const enabled = AVAILABLE_ROUTES.has(item.to);
          const baseClass = "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition";

          if (!enabled) {
            return (
              <div key={item.label} className={`${baseClass} cursor-not-allowed text-slate-500 opacity-70`} title="Coming soon">
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                <Badge tone="slate" className="ml-auto">Coming soon</Badge>
              </div>
            );
          }

          return (
            <NavLink
              key={item.label}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) => `${baseClass} ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"}`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-slate-100 px-4 py-4">

        <div className="relative">
          <div className="flex items-center gap-2">
            <Link
              to="/profile"
              onClick={onNavigate}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:bg-slate-100"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                {getInitials(user?.full_name || "Alex Chen")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{user?.full_name || "Alex Chen"}</p>
                <p className="text-xs text-slate-500">Student</p>
              </div>
            </Link>
            <button type="button" onClick={onToggleAccountMenu} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100">
              <ChevronDown className={`h-4 w-4 transition ${accountMenuOpen ? "rotate-180" : ""}`} />
            </button>
          </div>

          {accountMenuOpen ? (
            <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
              <Link to="/profile" onClick={onNavigate} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <UserCircle2 className="h-4 w-4" />
                Profile
              </Link>
              <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-400" disabled>
                <Settings className="h-4 w-4" />
                Settings
              </button>
              <Link to="/support" onClick={onNavigate} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <CircleHelp className="h-4 w-4" />
                Help
              </Link>
              <div className="border-t border-slate-100" />
              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

const DEFAULT_CLASSROOM_CONTEXT = {
  subject: "Linear Algebra",
  subjectCode: "510225",
  topic: "Eigenvalues & Eigenvectors",
  difficulty: "Medium",
  examMode: "Written",
};

const WHITEBOARD_SECTIONS = [
  { title: "Given Matrix", value: "A = \\begin{bmatrix} 4 & 1 \\\\ 2 & 3 \\end{bmatrix}" },
  { title: "Remember", value: "For eigenvalues, solve: \\det(A-\\lambda I)=0" },
  { title: "Characteristic Equation", value: "\\lambda^2 - 7\\lambda + 10 = 0" },
  { title: "Final Answer", value: "\\lambda = 5, 2" },
];

const QUICK_ACTIONS = ["Explain Again", "Give Example", "Make It Easier", "Clear Chat"];

// Safe, user-facing message when the AI teacher is unavailable. Never expose provider/model/source names to students.
const SAFE_AI_UNAVAILABLE_MESSAGE = "Q Arena AI Teacher is unavailable. Please try again.";

function extractTeacherReply(data) {
  return data?.reply || data?.answer || data?.generated_answer || data?.message || "I could not generate a complete answer this time.";
}

function buildClassroomChatPayload(message, context, chatHistory) {
  return {
    message,
    subject: context.subject,
    subject_code: context.subjectCode,
    topic: context.topic,
    difficulty: context.difficulty,
    exam_mode: context.examMode,
    chat_history: chatHistory,
  };
}

function toClassroomHistory(messages) {
  return messages.map((item) => ({
    role: item.role,
    content: item.text,
  }));
}

export default function AITutorPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatError, setChatError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState("");

  const inputRef = useRef(null);
  const chatScrollRef = useRef(null);

  const [voiceSupported] = useState(() => {
    try {
      return Boolean(typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition));
    } catch {
      return false;
    }
  });
  const [isListening, setIsListening] = useState(false);
  const [voiceState, setVoiceState] = useState(() => (voiceSupported ? "idle" : "unsupported"));
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef(null);

  const greetingName = useMemo(() => (user?.full_name ? user.full_name.split(" ")[0] : "Alex"), [user]);

  const classroomContext = useMemo(
    () => ({
      subject: location.state?.subject_name || DEFAULT_CLASSROOM_CONTEXT.subject,
      subjectCode: location.state?.subject_code || DEFAULT_CLASSROOM_CONTEXT.subjectCode,
      topic: location.state?.topic || DEFAULT_CLASSROOM_CONTEXT.topic,
      difficulty: location.state?.difficulty || DEFAULT_CLASSROOM_CONTEXT.difficulty,
      examMode: location.state?.exam_mode || DEFAULT_CLASSROOM_CONTEXT.examMode,
    }),
    [location.state],
  );

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages, isSending]);

  const stopListening = useCallback(() => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      recognitionRef.current = null;
    } catch {
      void 0;
    }
    setIsListening(false);
    if (voiceSupported) {
      setVoiceState("idle");
    }
  }, [voiceSupported]);

  useEffect(() => () => stopListening(), [stopListening]);

  const startListening = useCallback(() => {
    setVoiceError("");

    try {
      const Recognition = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

      if (!Recognition) {
        setVoiceState("unsupported");
        setVoiceError("Voice input is not supported in this browser.");
        return;
      }

      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      const recognition = new Recognition();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceState("listening");
      };

      recognition.onresult = (event) => {
        const transcript = String(event?.results?.[0]?.[0]?.transcript || "").trim();

        if (transcript) {
          setChatInput((prev) => {
            const current = String(prev || "").trim();
            return current ? `${current} ${transcript}` : transcript;
          });
        }
      };

      recognition.onerror = (event) => {
        const errorCode = event?.error || "unknown";
        setIsListening(false);

        if (errorCode === "not-allowed" || errorCode === "permission-denied") {
          setVoiceState("permission-denied");
          setVoiceError("Microphone permission denied.");
        } else if (errorCode === "network") {
          setVoiceState("error");
          setVoiceError("Voice input is unavailable right now.");
        } else {
          setVoiceState("error");
          setVoiceError("Voice input failed. Please try again.");
        }
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        setIsListening(false);
        if (voiceSupported) {
          setVoiceState((current) => (current === "permission-denied" ? current : "idle"));
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceState("error");
      setVoiceError("Voice input failed. Please try again.");
    }
  }, [voiceSupported]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const sendMessage = useCallback(async (messageText) => {
    const trimmed = String(messageText || "").trim();
    if (!trimmed || isSending) {
      return;
    }

    const userMessage = { id: `u-${Date.now()}`, role: "user", text: trimmed };
    const historyBeforeCurrentMessage = toClassroomHistory(chatMessages);

    // Optimistically show the user's message
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setChatError("");
    setLastFailedMessage("");
    setIsSending(true);

    try {
      const classroomPayload = buildClassroomChatPayload(trimmed, classroomContext, historyBeforeCurrentMessage);

      // IMPORTANT: Call only the classroom chat endpoint. Do NOT fallback to legacy answer generators.
      const response = await apiEndpoints.chatTutorClassroom(classroomPayload);

      const data = response?.data ?? response;
      const reply = extractTeacherReply(data);

      // IMPORTANT: Ignore any provider/model/retrieval metadata returned by the backend for user-facing UI.
      // Backend may include these fields for internal debugging, but they must never be displayed to students.
      setChatMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: reply,
        },
      ]);
    } catch (error) {
      // Preserve the failed message so user can retry
      setLastFailedMessage(trimmed);
      // Use a safe, generic user-facing message. Technical details go to console only.
      setChatError(SAFE_AI_UNAVAILABLE_MESSAGE);
      console.error("Classroom chat request failed:", error);
    } finally {
      setIsSending(false);
    }
  }, [chatMessages, classroomContext, isSending]);

  const handleSend = useCallback(() => {
    const trimmed = String(chatInput || "").trim();
    if (!trimmed) {
      setChatError("Please type a message first.");
      return;
    }

    sendMessage(trimmed);
  }, [chatInput, sendMessage]);

  const handleQuickAction = useCallback((action) => {
    if (action === "Clear Chat") {
      setChatMessages([]);
      setChatInput("");
      setChatError("");
      setLastFailedMessage("");
      return;
    }

    const prompts = {
      "Explain Again": `Explain ${classroomContext.topic} again step by step.`,
      "Give Example": `Give me one worked example on ${classroomContext.topic}.`,
      "Make It Easier": `Explain this topic in a very easy beginner-friendly way.`,
    };

    sendMessage(prompts[action] || action);
  }, [classroomContext.topic, sendMessage]);

  return (
    <div className="h-screen overflow-hidden bg-slate-50">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-[240px]">
        <SidebarSection
          user={user}
          accountMenuOpen={accountMenuOpen}
          onToggleAccountMenu={() => setAccountMenuOpen((current) => !current)}
          onLogout={handleLogout}
        />
      </div>

      {sidebarOpen ? <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px] lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" /> : null}

      <div className={`fixed inset-y-0 left-0 z-50 w-[240px] bg-white transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarSection
          user={user}
          accountMenuOpen={accountMenuOpen}
          onToggleAccountMenu={() => setAccountMenuOpen((current) => !current)}
          onNavigate={() => {
            setSidebarOpen(false);
            setAccountMenuOpen(false);
          }}
          onLogout={handleLogout}
        />
      </div>

      <div className="lg:pl-[240px]">
        <header className="sticky top-0 z-30 h-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-full w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen((current) => !current)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 lg:hidden"
                aria-label="Toggle dashboard menu"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold text-slate-900">AI Tutor</h1>
                <p className="truncate text-xs text-slate-500 sm:text-sm">Your personal AI teacher is ready for live classroom chat.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative hidden sm:block sm:w-[300px] lg:w-[400px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search lessons, topics, questions..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:bg-white"
                />
              </div>
              <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600">
                <Bell className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700"
                aria-label="Open profile"
              >
                {getInitials(user?.full_name || "Alex Chen")}
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto h-[calc(100vh-5rem)] w-full max-w-[1600px] overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid h-full grid-rows-[auto_minmax(0,1fr)] gap-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <p className="text-slate-500">Subject: <span className="font-semibold text-slate-900">{classroomContext.subject}</span></p>
                <p className="text-slate-500">Code: <span className="font-semibold text-slate-900">{classroomContext.subjectCode}</span></p>
                <p className="text-slate-500">Topic: <span className="font-semibold text-slate-900">{classroomContext.topic}</span></p>
                <p className="text-slate-500">Difficulty: <span className="font-semibold text-amber-600">{classroomContext.difficulty}</span></p>
                <p className="text-slate-500">Exam Mode: <span className="font-semibold text-slate-900">{classroomContext.examMode}</span></p>
              </div>
            </section>

            <section className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <Card className="flex min-h-0 flex-col overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-sm">
                <div ref={chatScrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4 pb-32">
                  {chatMessages.length === 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
                        <div>
                          <h2 className="text-lg font-semibold text-slate-900">Today&apos;s Whiteboard</h2>
                          <p className="text-sm text-slate-500">{greetingName}, start from this lesson and ask follow-up questions below.</p>
                        </div>
                        <Badge tone="green">Live lesson</Badge>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {WHITEBOARD_SECTIONS.map((item) => (
                          <div key={item.title} className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">{item.title}</p>
                            <MathRenderer value={item.value} className="mt-2 text-sm text-slate-800 [&_p]:my-0 [&_.katex-display]:my-1" />
                          </div>
                        ))}
                      </div>

                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        <span className="font-semibold">Exam Tip:</span> Expand determinant carefully and verify signs before solving roots.
                      </div>
                    </div>
                  ) : null}

                  {chatMessages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-6 ${message.role === "user" ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-800"}`}>
                        <div className="whitespace-pre-wrap">{message.text}</div>
                        {message.role === "assistant" ? <p className="mt-1 text-[11px] text-slate-500">Q Arena AI Teacher</p> : null}
                      </div>
                    </div>
                  ))}

                  {isSending ? (
                    <div className="flex justify-start pb-1">
                      <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Q Arena is preparing your answer...
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.04)] backdrop-blur">
                  <div className="mb-2 flex flex-wrap gap-2">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action}
                        type="button"
                        onClick={() => handleQuickAction(action)}
                        disabled={isSending}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {action}
                      </button>
                    ))}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-2">
                    <div className="flex items-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (isListening) {
                            stopListening();
                          } else {
                            startListening();
                          }
                        }}
                        disabled={!voiceSupported}
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border ${isListening ? "border-red-200 bg-red-50 text-red-600" : "border-slate-200 bg-white text-slate-700"} disabled:cursor-not-allowed disabled:opacity-50`}
                        title={voiceSupported ? (isListening ? "Stop voice input" : "Start voice input") : "Voice input unsupported"}
                      >
                        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </button>

                      <textarea
                        ref={inputRef}
                        rows={2}
                        value={chatInput}
                        onChange={(event) => {
                          setChatInput(event.target.value);
                          setChatError("");
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder="Ask your AI Teacher... (Enter to send, Shift+Enter for new line)"
                        className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:bg-white"
                      />

                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={isSending || !String(chatInput || "").trim()}
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Send className="h-4 w-4" />
                        Send
                      </button>
                    </div>
                  </div>

                  {(chatError || voiceError || voiceState === "unsupported") ? (
                    <div className="mt-2 space-y-2 text-sm">
                      {chatError ? <p className="text-rose-600">{chatError || SAFE_AI_UNAVAILABLE_MESSAGE}</p> : null}
                      {lastFailedMessage ? (
                        <button type="button" onClick={() => sendMessage(lastFailedMessage)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                          Retry failed message
                        </button>
                      ) : null}
                      {voiceState === "unsupported" ? <p className="text-slate-500">Voice input is unsupported in this browser.</p> : null}
                      {voiceError ? <p className="text-amber-700">{voiceError}</p> : null}
                    </div>
                  ) : null}

                  <p className="mt-2 text-xs text-slate-500">
                    Voice: {voiceState === "listening" ? "listening" : voiceState === "unsupported" ? "unsupported browser" : voiceState}
                  </p>
                </div>
              </Card>

              <aside className="hidden min-h-0 space-y-4 overflow-y-auto pr-1 xl:block">
                <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                      <Bot className="h-6 w-6" />
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">AI Teacher is online</p>
                      <p className="text-xs text-slate-500">Hi {greetingName}! Ask anything about {classroomContext.topic}.</p>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                  <h4 className="text-sm font-semibold text-slate-900">Class Tools</h4>
                  <div className="mt-3 space-y-2">
                    {["Explain a Question", "Generate Practice", "Formula Help", "Step-by-Step Solution"].map((tool) => (
                      <button key={tool} type="button" className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
                        {tool}
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                  <h4 className="text-sm font-semibold text-slate-900">Study Progress</h4>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="relative h-14 w-14 rounded-full p-1" style={{ background: "conic-gradient(#10b981 64%, #e2e8f0 64%)" }}>
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-sm font-semibold text-emerald-700">64%</div>
                    </div>
                    <div className="space-y-1 text-xs text-slate-600">
                      <p><span className="font-semibold text-slate-800">Topics Covered:</span> 16/25</p>
                      <p><span className="font-semibold text-slate-800">Questions Solved:</span> 48/75</p>
                      <p><span className="font-semibold text-slate-800">Accuracy:</span> 72%</p>
                    </div>
                  </div>
                </Card>
              </aside>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
