import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search, X } from "lucide-react";

export type MultiSelectOption = { value: string; label: string };

export default function MultiSelect({
  values,
  onChange,
  options,
  placeholder = "Select…",
}: {
  values: string[];
  onChange: (v: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        !(e.target as Element).closest("[data-ms-dropdown]")
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
    else setQuery("");
  }, [open]);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const panelH = Math.min(260, options.length * 40 + 56);
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < panelH && rect.top > spaceBelow;
      setDropdownStyle(
        openUp
          ? { position: "fixed", bottom: window.innerHeight - rect.top + 4, left: rect.left, width: rect.width, zIndex: 9999 }
          : { position: "fixed", top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 }
      );
    }
    setOpen((o) => !o);
  };

  const toggle = (val: string) => {
    onChange(values.includes(val) ? values.filter((v) => v !== val) : [...values, val]);
  };

  const remove = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(values.filter((v) => v !== val));
  };

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  const selectedLabels = values.map((v) => options.find((o) => o.value === v)?.label).filter(Boolean) as string[];

  const dropdown = open
    ? createPortal(
        <div
          data-ms-dropdown
          style={dropdownStyle}
          className="bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 flex flex-col"
        >
          <div className="p-2 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2 px-2 py-1.5 border border-slate-200 rounded-md bg-slate-50">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
              />
            </div>
          </div>
          <div className="overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-400">No results</p>
            ) : (
              filtered.map((opt) => {
                const checked = values.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(opt.value)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-primary-50 ${
                      checked ? "bg-primary-50 text-primary-700 font-medium" : "text-slate-700"
                    }`}
                  >
                    <span className={`w-4 h-4 flex items-center justify-center rounded border flex-shrink-0 ${
                      checked ? "bg-primary-600 border-primary-600" : "border-slate-300"
                    }`}>
                      {checked && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })
            )}
          </div>
          {values.length > 0 && (
            <div className="px-3 py-2 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[38px]"
      >
        <div className="flex flex-wrap gap-1 flex-1 min-w-0 mr-2">
          {selectedLabels.length === 0 ? (
            <span className="text-slate-400">{placeholder}</span>
          ) : selectedLabels.length <= 2 ? (
            selectedLabels.map((label, i) => (
              <span
                key={values[i]}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-medium"
              >
                {label}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => remove(values[i], e as any)}
                  onKeyDown={(e) => e.key === 'Enter' && remove(values[i], e as any)}
                  className="hover:text-red-500 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </span>
              </span>
            ))
          ) : (
            <span className="text-slate-700 font-medium text-sm">
              {values.length} selected
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {dropdown}
    </div>
  );
}
