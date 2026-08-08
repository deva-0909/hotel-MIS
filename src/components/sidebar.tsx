"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/app/login/actions";

const NAV: { section: string; items: { href: string; label: string }[] }[] = [
  { section: "", items: [{ href: "/", label: "Dashboard" }] },
  {
    section: "Front Office",
    items: [
      { href: "/rooms", label: "Rooms" },
      { href: "/reservations", label: "Reservations" },
      { href: "/guests", label: "Guests" },
    ],
  },
  {
    section: "Restaurant",
    items: [
      { href: "/restaurant/tables", label: "Tables" },
      { href: "/restaurant/orders", label: "Orders" },
      { href: "/restaurant/menu", label: "Menu" },
    ],
  },
  {
    section: "Inventory",
    items: [
      { href: "/inventory/items", label: "Stock Items" },
      { href: "/inventory/purchase-orders", label: "Purchase Orders" },
      { href: "/inventory/suppliers", label: "Suppliers" },
    ],
  },
  {
    section: "Billing",
    items: [{ href: "/billing/invoices", label: "Invoices" }],
  },
  {
    section: "Admin",
    items: [{ href: "/staff", label: "Staff" }],
  },
];

export function Sidebar({ fullName, role }: { fullName: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-4">
        <div className="text-sm font-semibold text-gray-900">Hotel &amp; Restaurant MS</div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV.map((group) => (
          <div key={group.section} className="mb-3">
            {group.section && (
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {group.section}
              </div>
            )}
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-md px-2 py-1.5 text-sm ${
                    active ? "bg-slate-900 text-white" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-gray-100 px-4 py-3">
        <div className="text-xs font-medium text-gray-800">{fullName}</div>
        <div className="text-[11px] capitalize text-gray-500">{role.replace(/_/g, " ")}</div>
        <button
          className="mt-2 text-xs text-gray-500 hover:text-gray-800"
          onClick={async () => {
            await signOut();
            router.push("/login");
            router.refresh();
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
