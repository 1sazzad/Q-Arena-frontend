const variantClasses = {
  primary: "qa-button-primary border-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md hover:from-indigo-700 hover:to-cyan-700",
  secondary: "qa-button-secondary border-slate-200/80 bg-white text-slate-700 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/70 hover:text-indigo-700",
  dark: "qa-button-secondary border-transparent bg-slate-950 text-white shadow-sm hover:bg-slate-800",
  ghost: "qa-button-secondary border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950",
  danger: "qa-button-secondary border-transparent bg-rose-600 text-white shadow-sm hover:bg-rose-700",
};

const sizeClasses = {
  sm: "px-3 py-2 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-sm",
};

function Button({
  as: Component = "button",
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  children,
  type,
  ...props
}) {
  return (
    <Component
      type={Component === "button" ? type || "button" : undefined}
      disabled={disabled}
      className={[
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 font-semibold tracking-tight transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white",
        "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0",
        "max-w-full whitespace-normal text-center",
        variantClasses[variant] || variantClasses.primary,
        sizeClasses[size] || sizeClasses.md,
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </Component>
  );
}

export default Button;
