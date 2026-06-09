function PageHeader({ eyebrow, title, description, actions, stats }) {
  return (
    <header className="qa-page-header min-w-0 rounded-[1.25rem] border border-slate-200/80 bg-white p-5 sm:p-6 lg:p-7">
      <div className="mb-4 h-1 w-20 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400" aria-hidden="true" />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-2 max-w-4xl break-words text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
            {title}
          </h1>
          {description && <p className="mt-3 max-w-3xl break-words text-sm leading-6 text-slate-600 sm:text-base">{description}</p>}
        </div>
        {actions && <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">{actions}</div>}
      </div>
      {stats && <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{stats}</div>}
    </header>
  );
}

export default PageHeader;
