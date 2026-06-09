function ResponsiveContainer({ as: Component = "main", className = "", children }) {
  return (
    <Component className={`qa-page min-h-[calc(100vh-72px)] overflow-x-hidden px-4 py-6 text-slate-900 sm:px-6 md:py-10 lg:px-8 ${className}`}>
      <div className="mx-auto max-w-7xl space-y-6 min-w-0">{children}</div>
    </Component>
  );
}

export default ResponsiveContainer;
