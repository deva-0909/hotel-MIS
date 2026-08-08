"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { updateOwnRole } from "@/app/actions/staff";
import type { Database } from "@/lib/database.types";

type StaffRole = Database["public"]["Enums"]["staff_role"];

const ROLES: StaffRole[] = [
  "admin",
  "front_office",
  "restaurant_manager",
  "waiter",
  "chef",
  "housekeeping",
  "inventory_manager",
  "accountant",
];

const NAV: { section: string; items: { href: string; label: string; roles?: StaffRole[] }[] }[] = [
  { section: "", items: [{ href: "/", label: "Dashboard" }] },
  {
    section: "Front Office",
    items: [
      { href: "/rooms", label: "Rooms", roles: ["front_office", "housekeeping"] },
      { href: "/reservations", label: "Reservations", roles: ["front_office"] },
      { href: "/guests", label: "Guests", roles: ["front_office"] },
    ],
  },
  {
    section: "Restaurant",
    items: [
      { href: "/restaurant/tables", label: "Tables", roles: ["restaurant_manager", "waiter"] },
      { href: "/restaurant/orders", label: "Orders", roles: ["restaurant_manager", "waiter", "chef"] },
      { href: "/restaurant/menu", label: "Menu", roles: ["restaurant_manager"] },
    ],
  },
  {
    section: "Inventory",
    items: [
      { href: "/inventory/items", label: "Stock Items", roles: ["inventory_manager"] },
      { href: "/inventory/purchase-orders", label: "Purchase Orders", roles: ["inventory_manager"] },
      { href: "/inventory/suppliers", label: "Suppliers", roles: ["inventory_manager"] },
    ],
  },
  {
    section: "Billing",
    items: [{ href: "/billing/invoices", label: "Invoices", roles: ["accountant", "front_office"] }],
  },
  {
    section: "Admin",
    items: [{ href: "/staff", label: "Staff", roles: ["admin"] }],
  },
];

export function Sidebar({ fullName, role }: { fullName: string; role: StaffRole }) {
  const pathname = usePathname();
  const router = useRouter();
  const [switching, startSwitching] = useTransition();

  const visibleNav = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => role === "admin" || !item.roles || item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-4">
        <div className="text-sm font-semibold text-gray-900">Hotel &amp; Restaurant MS</div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {visibleNav.map((group) => (
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
        <select
          value={role}
          disabled={switching}
          onChange={(e) => {
            const next = e.target.value as StaffRole;
            startSwitching(async () => {
              await updateOwnRole(next);
              router.refresh();
            });
          }}
          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs capitalize focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.replace(/_/g, " ")}
            </option>
          ))}
        </select>
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
