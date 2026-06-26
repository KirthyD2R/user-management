import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseYMD(val: string): Date | null {
  if (!val) return null;
  const d = new Date(val + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selected = parseYMD(value);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current?.contains(e.target as Node) ||
        panelRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const panelH = 320;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < panelH && rect.top > spaceBelow;
      setDropdownStyle(
        openUp
          ? { position: "fixed", bottom: window.innerHeight - rect.top + 4, left: rect.left, width: rect.width, zIndex: 9999 }
          : { position: "fixed", top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 }
      );
      if (selected) {
        setViewYear(selected.getFullYear());
        setViewMonth(selected.getMonth());
      }
    }
    setOpen((o) => !o);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();
  const cells: { date: Date; cur: boolean }[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(viewYear, viewMonth - 1, daysInPrev - i), cur: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(viewYear, viewMonth, d), cur: true });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: new Date(viewYear, viewMonth + 1, cells.length - daysInMonth - firstDay + 1), cur: false });
  }

  const displayLabel = selected
    ? selected.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  const calendar = open ? createPortal(
    <div
      ref={panelRef}
      style={dropdownStyle}
      className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 min-w-[280px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-slate-700">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map(({ date, cur }, i) => {
          const ymd = toYMD(date);
          const isSelected = value === ymd;
          const isToday = toYMD(today) === ymd;
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                onChange(ymd);
                setOpen(false);
              }}
              className={[
                "text-xs rounded-lg py-1.5 w-full transition font-medium",
                !cur ? "text-slate-300" : "text-slate-700 hover:bg-primary-50 hover:text-primary-700",
                isSelected ? "!bg-primary-600 !text-white hover:!bg-primary-700" : "",
                isToday && !isSelected ? "ring-1 ring-primary-400 text-primary-600" : "",
              ].join(" ")}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex justify-between mt-3 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => { onChange(""); setOpen(false); }}
          className="text-xs text-slate-500 hover:text-slate-700 transition"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => { onChange(toYMD(today)); setOpen(false); }}
          className="text-xs text-primary-600 font-medium hover:text-primary-700 transition"
        >
          Today
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <span className={displayLabel ? "text-slate-900" : "text-slate-400"}>
          {displayLabel ?? placeholder}
        </span>
        <CalendarDays className="w-4 h-4 text-slate-400" />
      </button>
      {calendar}
    </div>
  );
}
