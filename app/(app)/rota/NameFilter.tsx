"use client";

/** Filters the rows of the staff tables (tr[data-name]) as you type. */
export function NameFilter() {
  return (
    <input
      type="search"
      placeholder="Find a name…"
      className="input sm:max-w-64"
      onChange={(e) => {
        const q = e.target.value.trim().toLowerCase();
        document.querySelectorAll<HTMLTableRowElement>("tr[data-name]").forEach((tr) => {
          tr.hidden = q !== "" && !tr.dataset.name!.includes(q);
        });
      }}
    />
  );
}
