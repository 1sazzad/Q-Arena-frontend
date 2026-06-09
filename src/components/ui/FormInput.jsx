import { forwardRef } from "react";

const FormInput = forwardRef(function FormInput(
  { label, helper, error, as: Component = "input", className = "", labelClassName = "", inputClassName = "", ...props },
  ref,
) {
  const control = (
        <Component
      ref={ref}
      className={[
        "qa-input w-full rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100",
        error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "",
        inputClassName,
      ].join(" ")}
      {...props}
    />
  );

  if (!label) {
    return control;
  }

  return (
    <label className={["block text-sm font-medium text-slate-700", className, labelClassName].join(" ")}>
      <span>{label}</span>
      <div className="mt-2">{control}</div>
      {helper && !error && <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p>}
      {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}
    </label>
  );
});

export default FormInput;