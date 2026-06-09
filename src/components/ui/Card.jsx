function Card({ as: Component = "section", className = "", children, ...props }) {
  return (
    <Component
      className={[
        "qa-card min-w-0 rounded-[1.25rem] border bg-white p-5 sm:p-6 lg:p-7",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </Component>
  );
}

export default Card;
