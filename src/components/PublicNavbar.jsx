import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, Sparkles, X } from "lucide-react";
import BrandLogo from "./BrandLogo";

function PublicNavbar() {
  const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: "Home", href: "#home" },
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Support", href: "#support" },
  ];

  const handleNavClick = (href) => {
    // Close mobile menu in all cases when a nav item is clicked
    setIsOpen(false);

    // Local hash on the current page (e.g. "#features")
    if (href.startsWith("#")) {
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    // Cross-route hash to the homepage ("/#how-it-works")
    if (href.startsWith("/#")) {
      const hash = "#" + href.split("#")[1];
      if (location.pathname === "/") {
        const target = document.querySelector(hash);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } else {
        // Navigate to the homepage with hash; HomePage has an effect to handle scrolling after navigation
        navigate(href);
      }
      return;
    }

    // Fallback: normal navigation for absolute paths
    if (href.startsWith("/")) {
      navigate(href);
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4 sm:h-20">
          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center">
            <BrandLogo imageClassName="h-9 w-9" textClassName="hidden font-semibold text-slate-900 sm:block" showTagline />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.href);
                }}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Desktop Action Buttons */}
          <div className="hidden gap-3 md:flex">
            <button
              onClick={() => navigate("/login")}
              className="rounded-2xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
            >
              Log In
            </button>
            <button
              onClick={() => navigate("/register")}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:from-indigo-700 hover:to-cyan-700"
            >
              <Sparkles className="h-4 w-4" />
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 md:hidden"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="border-t border-slate-100 py-4 md:hidden">
            <div className="space-y-1">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(item.href);
                  }}
                  className="block rounded-xl px-3 py-2 text-base font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  {item.label}
                </a>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              <button
                onClick={() => {
                  navigate("/login");
                  setIsOpen(false);
                }}
                className="block w-full rounded-2xl px-3 py-2 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Log In
              </button>
              <button
                onClick={() => {
                  navigate("/register");
                  setIsOpen(false);
                }}
                className="block w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-3 py-2 text-center text-sm font-semibold text-white transition hover:from-indigo-700 hover:to-cyan-700"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default PublicNavbar;
