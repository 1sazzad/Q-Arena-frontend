function ErrorMessage({ children, tone = "error" }) {
  if (!children) {
    return null;
  }

  const classes =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : tone === "info"
          ? "border-indigo-200 bg-indigo-50 text-indigo-800"
          : "border-rose-200 bg-rose-50 text-rose-700";

  // Accessibility: use live regions so dynamic messages are announced to assistive technologies.
  // - Error/Warning (default/error/warning): urgent -> role="alert" + aria-live="assertive"
  // - Success/Info: non-urgent -> role="status" + aria-live="polite"
  const a11yProps = (tone === "success" || tone === "info")
    ? { role: "status", "aria-live": "polite", "aria-atomic": "true" }
    : { role: "alert", "aria-live": "assertive", "aria-atomic": "true" };

  return (
    <div
      {...a11yProps}
      className={`whitespace-pre-line rounded-[1.25rem] border px-4 py-3 text-sm leading-6 shadow-sm ${classes}`}
    >
      {children}
    </div>
  );
}

export default ErrorMessage;
