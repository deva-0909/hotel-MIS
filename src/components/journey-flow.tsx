const DEPT_COLOR: Record<string, string> = {
  "FRONT OFFICE": "border-blue-200 bg-blue-50 text-blue-700",
  HOUSEKEEPING: "border-purple-200 bg-purple-50 text-purple-700",
  RESTAURANT: "border-amber-200 bg-amber-50 text-amber-700",
  KITCHEN: "border-orange-200 bg-orange-50 text-orange-700",
  "SPA & LAUNDRY": "border-pink-200 bg-pink-50 text-pink-700",
  "ENGINEERING & MAINTENANCE": "border-gray-300 bg-gray-100 text-gray-700",
  "ROOM SERVICE": "border-amber-200 bg-amber-50 text-amber-700",
  "ACCOUNTS & FINANCE": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "CRM & MARKETING": "border-rose-200 bg-rose-50 text-rose-700",
  "STORES & PURCHASE": "border-teal-200 bg-teal-50 text-teal-700",
};

export function JourneyFlow({ steps }: { steps: { dept: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`rounded-lg border px-3 py-2 text-center ${DEPT_COLOR[step.dept] ?? "border-gray-200 bg-gray-50 text-gray-600"}`}>
            <div className="text-[9px] font-semibold uppercase tracking-wider opacity-70">{step.dept}</div>
            <div className="text-sm font-medium">{step.label}</div>
          </div>
          {i < steps.length - 1 && <span className="text-gray-300">→</span>}
        </div>
      ))}
    </div>
  );
}
