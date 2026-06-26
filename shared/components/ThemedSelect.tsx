import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search } from "lucide-react";

export type ThemedSelectOption = { value: string; label: string };

export default function ThemedSelect({
  value,
  onChange,
  options,
  placeholder = "",
  searchable = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: ThemedSelectOption[];
  placeholder?: string;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const filteredOptions = searchable && searchQuery.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        !(e.target as Element).closest("[data-themed-select-dropdown]")
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      const selectedIdx = filteredOptions.findIndex((o) => o.value === value);
      setFocusedIndex(selectedIdx >= 0 ? selectedIdx : 0);
      if (searchable) setTimeout(() => searchRef.current?.focus(), 50);
      else setTimeout(() => btnRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
      setFocusedIndex(-1);
    }
  }, [open]);

  // Reset focused index when search changes
  useEffect(() => {
    setFocusedIndex(0);
  }, [searchQuery]);

  // Scroll focused item into view
  useEffect(() => {
    if (open && focusedIndex >= 0) {
      itemRefs.current[focusedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        handleToggle();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      btnRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
        onChange(filteredOptions[focusedIndex].value);
        setOpen(false);
        btnRef.current?.focus();
      }
    }
  };

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const panelHeight = Math.min(240, options.length * 40 + 8);
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < panelHeight && rect.top > spaceBelow;
      setDropdownStyle(
        openUpward
          ? { position: "fixed", bottom: window.innerHeight - rect.top + 4, left: rect.left, width: rect.width, zIndex: 9999 }
          : { position: "fixed", top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 }
      );
    }
    setOpen((o) => !o);
  };

  const selected = options.find((o) => o.value === value);

  const dropdown = open
    ? createPortal(
        <div
          data-themed-select-dropdown
          style={dropdownStyle}
          className="bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 flex flex-col"
          onKeyDown={handleKeyDown}
        >
          {searchable && (
            <div className="p-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2 px-2 py-1.5 border border-slate-200 rounded-md bg-slate-50">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search..."
                  className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                />
              </div>
            </div>
          )}
          <div ref={listRef} className="overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-400">No results</p>
            ) : filteredOptions.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isFocused = idx === focusedIndex;
              return (
                <button
                  key={opt.value}
                  ref={(el) => { itemRefs.current[idx] = el; }}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  onMouseEnter={() => setFocusedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${
                    isFocused
                      ? "bg-primary-50 text-primary-700"
                      : isSelected
                      ? "bg-primary-50 text-primary-700 font-medium"
                      : "text-slate-700 hover:bg-primary-50"
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary-600" />}
                </button>
              );
            })}
          </div>
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
        onKeyDown={handleKeyDown}
        className="w-full flex items-center justify-between border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <span className={selected ? "text-slate-900" : "text-slate-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {dropdown}
    </div>
  );
}
