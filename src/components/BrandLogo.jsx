import logoUrl from "../assets/branding/q_arena_logo_optimized.webp";
import { APP_NAME } from "../config/app";

function BrandLogo({ className = "", imageClassName = "h-10 w-10", textClassName = "text-lg font-semibold tracking-tight text-slate-950", showText = true, showTagline = false }) {
  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      <span className="flex shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_25px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
        <img src={logoUrl} alt="Q Arena logo" className={`shrink-0 object-contain ${imageClassName}`} />
      </span>
      {showText && (
        <div className="min-w-0">
          <span className={`block truncate ${textClassName}`}>{APP_NAME}</span>
          {showTagline && <span className="block truncate text-xs font-medium text-slate-500">Smart Planning for Smart Students</span>}
        </div>
      )}
    </div>
  );
}

export default BrandLogo;