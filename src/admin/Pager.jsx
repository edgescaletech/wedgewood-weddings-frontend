import React from "react";

export default function Pager({ count, page, size, onPage, label }) {
  const pages = Math.ceil(count / size);
  if (pages <= 1) return null;
  const buttons = [
    ...new Set(
      [1, page - 1, page, page + 1, pages].filter(
        (number) => number >= 1 && number <= pages,
      ),
    ),
  ];
  return (
    <nav className="ux-pager" aria-label={label}>
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </button>
      {buttons.map((number, index) => (
        <React.Fragment key={number}>
          {index > 0 && number - buttons[index - 1] > 1 && <span>…</span>}
          <button
            type="button"
            aria-label={`Page ${number}`}
            aria-current={page === number ? "page" : undefined}
            onClick={() => onPage(number)}
          >
            {number}
          </button>
        </React.Fragment>
      ))}
      <button
        type="button"
        disabled={page === pages}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
