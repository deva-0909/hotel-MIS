"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { updateOwnRole, updateOwnProperty } from "@/app/actions/staff";
import type { Database } from "@/lib/database.types";

type StaffRole = Database["public"]["Enums"]["staff_role"];

const ROLES: StaffRole[] = [
  "admin",
  "front_office",
  "housekeeping",
  "restaurant_manager",
  "waiter",
  "chef",
  "inventory_manager",
  "engineering",
  "hr",
  "accountant",
  "crm_marketing",
  "banquet",
  "spa_laundry",
  "travel_desk",
];

type NavItem = { code: string; href: string; label: string; roles?: StaffRole[] };

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Organization",
    items: [
      { code: "CO", href: "/organization/corporate", label: "Corporate Dashboard", roles: ["admin"] },
      { code: "RG", href: "/organization/regional", label: "Regional Dashboard", roles: ["admin"] },
      { code: "PP", href: "/organization/properties", label: "Properties", roles: ["admin"] },
      { code: "KI", href: "/organization/kitchens", label: "Kitchens", roles: ["admin"] },
      { code: "DV", href: "/organization/devices", label: "Devices", roles: ["admin"] },
      { code: "CT", href: "/organization/templates", label: "Corporate Templates", roles: ["admin"] },
      { code: "PR", href: "/", label: "Property Dashboard" },
      { code: "RA", href: "/roles-access", label: "Roles & Access", roles: ["admin"] },
      { code: "ST", href: "/staff", label: "Staff Accounts", roles: ["admin"] },
    ],
  },
  {
    section: "Live Views",
    items: [
      { code: "RC", href: "/live/room-calendar", label: "Room Calendar", roles: ["front_office", "housekeeping"] },
      { code: "PB", href: "/live/purchase-board", label: "Purchase Approval Board", roles: ["inventory_manager"] },
      { code: "AR", href: "/live/asset-registry", label: "Asset Registry", roles: ["engineering"] },
      { code: "AT", href: "/live/attendance", label: "Attendance Calendar", roles: ["hr"] },
      { code: "MM", href: "/restaurant/menu", label: "Menu Management", roles: ["restaurant_manager"] },
      { code: "GI", href: "/live/gst-invoice", label: "GST Invoice", roles: ["accountant"] },
    ],
  },
  {
    section: "Process Flows",
    items: [
      { code: "GJ", href: "/journeys/guest", label: "Guest Journey" },
      { code: "RJ", href: "/journeys/restaurant", label: "Restaurant Journey" },
      { code: "IJ", href: "/journeys/inventory", label: "Inventory Journey" },
    ],
  },
  {
    section: "Departments",
    items: [
      { code: "FO", href: "/departments/front-office", label: "Front Office", roles: ["front_office"] },
      { code: "HK", href: "/departments/housekeeping", label: "Housekeeping", roles: ["housekeeping"] },
      { code: "RS", href: "/departments/restaurant", label: "Restaurant", roles: ["restaurant_manager", "waiter"] },
      { code: "KT", href: "/departments/kitchen", label: "Kitchen", roles: ["chef"] },
      { code: "SP", href: "/departments/stores-purchase", label: "Stores & Purchase", roles: ["inventory_manager"] },
      { code: "EM", href: "/departments/engineering", label: "Engineering & Maintenance", roles: ["engineering"] },
      { code: "HR", href: "/departments/hr", label: "Human Resources", roles: ["hr"] },
      { code: "AC", href: "/departments/accounts", label: "Accounts & Finance", roles: ["accountant"] },
      { code: "CM", href: "/departments/crm", label: "CRM & Marketing", roles: ["crm_marketing"] },
      { code: "BQ", href: "/departments/banquet", label: "Banquet & Events", roles: ["banquet"] },
      { code: "SL", href: "/departments/spa-laundry", label: "Spa & Laundry", roles: ["spa_laundry"] },
      { code: "TD", href: "/departments/travel-desk", label: "Travel Desk", roles: ["travel_desk"] },
    ],
  },
];

export function Sidebar({
  fullName,
  role,
  propertyId,
  properties,
}: {
  fullName: string;
  role: StaffRole;
  propertyId: string | null;
  properties: { id: string; name: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [switching, startSwitching] = useTransition();
  const [switchingProperty, startSwitchingProperty] = useTransition();

  const visibleNav = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => role === "admin" || !item.roles || item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-black/10 bg-white">
      <div className="border-b border-black/10 px-4 py-4">
        <div className="font-serif text-base text-gray-900">Hospitality ERP</div>
        <div className="text-[11px] text-gray-400">Hotel &amp; Restaurant MS</div>
      </div>

      <nav className="flex-1 px-2 py-3">
        {visibleNav.map((group) => (
          <div key={group.section} className="mb-4">
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {group.section}
            </div>
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                    active ? "bg-accent-soft text-accent" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`flex h-5 w-6 shrink-0 items-center justify-center rounded border text-[10px] font-medium ${
                      active ? "border-accent/40 text-accent" : "border-gray-300 text-gray-500"
                    }`}
                  >
                    {item.code}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-black/10 px-4 py-3">
        <div className="text-xs font-medium text-gray-800">{fullName}</div>

        {properties.length > 0 && (
          <select
            value={propertyId ?? ""}
            disabled={switchingProperty}
            onChange={(e) => {
              const next = e.target.value;
              startSwitchingProperty(async () => {
                await updateOwnProperty(next);
                router.refresh();
              });
            }}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

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
          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-xs capitalize focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
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
