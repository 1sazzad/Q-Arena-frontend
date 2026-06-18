import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search, X, Headset } from "lucide-react";

import PublicSidebar from "../components/PublicSidebar";
import { useAuth } from "../context/useAuth";
import { Card, Button, ErrorMessage } from "../components/ui";
import { apiEndpoints } from "../api/api";
import { CONTACT_METHODS } from "../config/contact";

const MESSAGE_MAX_LENGTH = 2000;

export default function HelpPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Feedback form state
  const [fbRating, setFbRating] = useState("");
  const [fbMessage, setFbMessage] = useState("");
  const [fbError, setFbError] = useState("");
  const [fbSuccess, setFbSuccess] = useState("");
  const [fbSubmitting, setFbSubmitting] = useState(false);

  function selectQuickHelpCategory(value) {
    // Updated quick-card behaviour while support tickets are unavailable
    if (value === "AI Tutor") {
      const el = document.getElementById("faq-card");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (value === "Bug Report") {
      // Guide users to the Feedback form for bug reports until support tickets are available
      setFbMessage("Use Feedback for bug reports until support tickets are available.");
      const el = document.getElementById("feedback-card");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // otherwise do nothing (or navigation handled by caller)
  }

  async function submitFeedback(e) {
    e?.preventDefault?.();
    setFbError("");
    setFbSuccess("");

    const message = String(fbMessage || "").trim();
    if (!message) {
      setFbError("Message is required.");
      return;
    }

    if (message.length > MESSAGE_MAX_LENGTH) {
      setFbError(`Message must be ${MESSAGE_MAX_LENGTH} characters or less.`);
      return;
    }

    setFbSubmitting(true);

    try {
      const payload = {
        name: user?.full_name?.trim() || undefined,
        email: user?.email?.trim() || undefined,
        rating: fbRating ? Number(fbRating) : undefined,
        message,
        page_url: "/help",
      };

      const res = await apiEndpoints.submitFeedback(payload);
      setFbSuccess(res.data?.message || "Thanks — your feedback has been submitted.");
      setFbMessage("");
      setFbRating("");
    } catch (err) {
      console.error("Feedback submit failed", err);
      setFbError("Could not submit feedback right now. Please try again.");
    } finally {
      setFbSubmitting(false);
    }
  }

  const quickCards = [
    {
      title: "AI Tutor Help",
      text: "Get help with explanations, chat, and classroom mode.",
      category: "AI Tutor",
      cta: "Learn more",
    },
    {
      title: "Predictions & Questions",
      text: "Report issues with smart predictions, search, or question data.",
      category: "Smart Predictions",
      cta: "Learn more",
    },
    {
      title: "Account & Settings",
      text: "Need help with profile, academic info, or login?",
      category: "Account/Profile",
      cta: "Open settings",
      navigateTo: "/settings",
    },
    {
      title: "Bug Report",
      text: "Found a bug? Let us know so we can fix it.",
      category: "Bug Report",
      cta: "Report now",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-[240px]">
        <PublicSidebar user={user} />
      </div>

      {sidebarOpen ? <div className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" /> : null}

      <div className={`fixed inset-y-0 left-0 z-50 w-[240px] bg-white transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <PublicSidebar
          user={user}
          onNavigate={() => {
            setSidebarOpen(false);
          }}
        />
      </div>

      <div className="lg:pl-[240px]">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-20 w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen((current) => !current)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 lg:hidden"
                aria-label="Toggle sidebar"
              >
                <X className="h-5 w-5" />
              </button>

              <div>
                <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Help & Support</h1>
                <p className="text-xs text-slate-500 sm:text-sm">Get help, report issues, contact us, and share feedback with the Q Arena team.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative hidden sm:block sm:w-[250px] lg:w-[320px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search help articles..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none"
                />
              </div>
              <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600">
                <Bell className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-700"
                aria-label="Open profile"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">{(user && (user.full_name || user.email) ? (user.full_name || user.email).split(" ").map(p=>p[0]).slice(0,2).join("") : "ST")}</span>
                <span className="hidden max-w-[100px] truncate text-xs font-medium sm:inline">{user?.full_name || user?.email || "Student"}</span>
              </button>
            </div>
          </div>
        </header>

        <main>
          <div className="mx-auto max-w-[1280px] px-6 py-6">
            <style>{`   .help-page-shell {     display: flex;     flex-direction: column;     gap: 1.5rem;   }    .help-page-left,   .help-page-right {     min-width: 0;   }    @media (min-width: 1024px) {     .help-page-shell {       flex-direction: row;       align-items: flex-start;     }      .help-page-left {       flex: 1 1 0%;       min-width: 0;       margin-right: 1rem;     }      .help-page-right {       width: 360px;       flex: 0 0 360px;       position: sticky;       top: 6rem;     }   } `}</style>

            <div className="help-page-shell">
              <div className="help-page-left space-y-6">
                <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Quick Help</h2>
                      <p className="mt-1 text-sm text-slate-500">Choose a topic to quickly prepare a support request.</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {quickCards.map((card) => (
                      <button
                        key={card.title}
                        type="button"
                        onClick={() => {
                          selectQuickHelpCategory(card.category);
                          if (card.navigateTo) navigate(card.navigateTo);
                        }}
                        className="group flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50"
                      >
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-slate-900">{card.title}</h3>
                          <p className="mt-1 text-xs text-slate-600">{card.text}</p>
                        </div>
                        <div className="self-start">
                          <span className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{card.cta}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">Support Tickets</h2>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-sm text-slate-500">Support ticket submission is not available yet. You can still share feedback or contact us using the options on this page.</p>
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Coming soon</span>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm text-slate-600">Support ticket submission is not available yet. You can still share feedback or contact us using the options on this page.</p>

                    <div className="mt-4">
                      <Button disabled className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-300 px-4 py-2.5 text-sm font-semibold text-white cursor-not-allowed">Support Tickets Coming Soon</Button>
                    </div>

                    <p className="mt-3 text-xs text-slate-500">A dedicated support ticket system is planned for a future release.</p>
                  </div>
                </Card>

                <Card id="feedback-card" as="form" onSubmit={submitFeedback} className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">Feedback</h2>
                  <p className="mt-1 text-sm text-slate-500">Share your thoughts, suggestions or feedback with the team.</p>

                  <div className="mt-4 grid gap-3">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3" role="radiogroup" aria-label="How helpful was this?">
                      {[1,2,3,4,5].map((n)=> (
                        <button
                          key={n}
                          type="button"
                          onClick={()=>setFbRating(String(n))}
                          role="radio"
                          aria-checked={fbRating===String(n)}
                          aria-label={`Rate ${n} out of 5`}
                          className={`rounded-lg border px-3 py-2 text-sm ${fbRating===String(n)?'bg-blue-50 border-blue-200 text-blue-700':'bg-slate-50 border-slate-200 text-slate-700'}`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>

                    <label className="text-sm">
                      <div className="text-sm font-medium text-slate-700">Message</div>
                      <textarea value={fbMessage} onChange={(e)=>setFbMessage(e.target.value)} maxLength={MESSAGE_MAX_LENGTH} rows={5} placeholder="Share your thoughts, suggestions or feedback..." className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none" />
                      <div className="mt-2 text-xs text-slate-500">{fbMessage.length}/{MESSAGE_MAX_LENGTH}</div>
                    </label>

                    <div className="flex items-center gap-3">
                      <Button type="submit" disabled={fbSubmitting} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700">{fbSubmitting? 'Submitting...' : 'Submit Feedback'}</Button>
                      <div className="ml-auto text-sm">
                        {fbError ? <ErrorMessage>{fbError}</ErrorMessage> : null}
                        {fbSuccess ? <ErrorMessage tone="success">{fbSuccess}</ErrorMessage> : null}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              <aside className="help-page-right space-y-4">
                <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <Headset className="h-6 w-6 text-blue-600" />
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">We're here to help</h3>
                      <p className="mt-1 text-xs text-slate-600">We usually review student support requests within 24–48 hours.</p>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Contact Us</h3>
                  <p className="mt-1 text-xs text-slate-500">Other ways to reach the Q Arena team.</p>

                  <div className="mt-3 space-y-3">
                    {CONTACT_METHODS && CONTACT_METHODS.length>0 ? CONTACT_METHODS.map((method)=> (
                      <div key={method.type} className="rounded-xl border border-slate-100 p-3">
                        <p className="text-xs font-medium text-slate-500">{method.type}</p>
                        <p className="mt-1 break-words text-sm font-semibold text-slate-900">{method.label}</p>
                        <div className="mt-2">
                          <Button as="a" href={method.href} target={method.href.startsWith('http')? '_blank' : undefined} rel={method.href.startsWith('http')? 'noreferrer' : undefined} variant={method.type==='WhatsApp'? 'primary' : 'secondary'}>{method.actionLabel}</Button>
                        </div>
                      </div>
                    )) : (
                      <p className="mt-2 text-sm text-slate-500">Contact options will be added soon.</p>
                    )}
                  </div>
                </Card>

                <Card id="faq-card" className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Frequently Asked Questions</h3>
                  <div className="mt-3 space-y-3 text-sm text-slate-700">
                    <div>
                      <p className="font-semibold">How do I use AI Tutor?</p>
                      <p className="mt-1 text-xs text-slate-500">Open AI Tutor from the sidebar or click Ask AI on a question.</p>
                    </div>

                    <div>
                      <p className="font-semibold">Why are predictions not available for my subject?</p>
                      <p className="mt-1 text-xs text-slate-500">Some subjects may not have enough uploaded question data yet.</p>
                    </div>

                    <div>
                      <p className="font-semibold">How do I update my academic profile?</p>
                      <p className="mt-1 text-xs text-slate-500">Open Settings and use Account Information to update your academic details.</p>
                    </div>

                    <div>
                      <p className="font-semibold">Why is a feature marked Coming soon?</p>
                      <p className="mt-1 text-xs text-slate-500">It means the feature is planned but not connected to the live product yet.</p>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Q Arena Services</h3>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <div className="flex items-center justify-between"><span>AI Tutor</span><span className="text-xs text-emerald-600 font-semibold">Available</span></div>
                    <div className="flex items-center justify-between"><span>Smart Predictions</span><span className="text-xs text-emerald-600 font-semibold">Available</span></div>
                    <div className="flex items-center justify-between"><span>Search Questions</span><span className="text-xs text-emerald-600 font-semibold">Available</span></div>
                    <div className="flex items-center justify-between"><span>Feedback System</span><span className="text-xs text-emerald-600 font-semibold">Available</span></div>
                    <div className="flex items-center justify-between"><span>Support Tickets</span><span className="text-xs text-amber-600 font-semibold">Coming soon</span></div>
                  </div>
                </Card>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
