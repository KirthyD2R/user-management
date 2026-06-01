import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Total number of items across all pages (optional, shown in the label). */
  total?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Shared pagination footer used by all list/table pages.
 * Renders Previous / Next controls and a "Page X of Y" label.
 */
export default function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  className = '',
}: PaginationProps) {
  return (
    <div
      className={`flex items-center justify-between px-6 py-3 bg-slate-50 border-t border-slate-200 ${className}`}
    >
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" />
        Previous
      </button>
      <span className="text-sm text-slate-600">
        Page {page} of {totalPages}
        {typeof total === 'number' ? ` · ${total} total` : ''}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
