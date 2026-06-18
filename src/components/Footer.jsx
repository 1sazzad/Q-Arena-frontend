import { Link } from "react-router-dom";
import { Mail, MessageCircle } from "lucide-react";
import { CONTACT_METHODS } from "../config/contact";
import BrandLogo from "./BrandLogo";

function Footer() {
  const whatsapp = CONTACT_METHODS.find((m) => m.type === "WhatsApp");

  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-10 sm:px-6 lg:px-8 text-slate-700">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-5">
          <div className="col-span-1">
            <Link to="/" className="inline-block">
              <BrandLogo className="items-start" imageClassName="h-10 w-10" textClassName="text-lg font-semibold tracking-tight text-slate-900" showTagline={false} />
            </Link>
            <p className="mt-3 text-sm text-slate-600">Study smarter with AI-powered exam preparation.</p>
            <p className="mt-3 text-xs text-slate-500">Made for students preparing smarter.</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">Product</p>
            <nav className="mt-3 grid gap-2 text-sm">
              <a href="/#ai-tutor" className="inline-flex items-center hover:text-slate-900">AI Tutor</a>
              <a href="/#predictions" className="inline-flex items-center hover:text-slate-900">Smart Predictions</a>
              <a href="/#features" className="inline-flex items-center hover:text-slate-900">Question Search</a>
              <a href="/#features" className="inline-flex items-center hover:text-slate-900">Subject Analysis</a>
              <span className="inline-flex items-center text-sm text-slate-500">Mock Tests (coming soon)</span>
            </nav>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">Resources</p>
            <nav className="mt-3 grid gap-2 text-sm">
              <a href="/#how-it-works" className="inline-flex items-center hover:text-slate-900">How It Works</a>
              <a href="/#subjects" className="inline-flex items-center hover:text-slate-900">Subjects</a>
              <a href="/#contact" className="inline-flex items-center hover:text-slate-900">Help & Contact</a>
              <Link to="/feedback" className="inline-flex items-center hover:text-slate-900">Feedback</Link>
            </nav>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">Legal</p>
            <nav className="mt-3 grid gap-2 text-sm">
              <Link to="/privacy-policy" className="inline-flex items-center hover:text-slate-900">Privacy Policy</Link>
              <Link to="/terms-of-service" className="inline-flex items-center hover:text-slate-900">Terms of Use</Link>
              <Link to="/contact" className="inline-flex items-center hover:text-slate-900">Contact</Link>
            </nav>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">Contact</p>
            <div className="mt-3 grid gap-2 text-sm">
              <a href="mailto:support@qarena.me" className="inline-flex items-center hover:text-slate-900">
                <Mail className="mr-2 h-4 w-4 text-slate-600" aria-hidden="true" />
                Email Support: support@qarena.me
              </a>

              {whatsapp && (
                <a href={whatsapp.href} target="_blank" rel="noreferrer" className="inline-flex items-center hover:text-slate-900">
                  <MessageCircle className="mr-2 h-4 w-4 text-slate-600" aria-hidden="true" />
                  WhatsApp: {whatsapp.label}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-4 text-sm text-slate-500 flex flex-col items-start sm:flex-row sm:justify-between">
          <div>© 2026 Q Arena. All rights reserved.</div>
          <div className="mt-2 sm:mt-0">Made for students preparing smarter.</div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
