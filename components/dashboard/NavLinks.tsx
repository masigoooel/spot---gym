"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICON = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const ITEMS = [
  {
    href: "/dashboard",
    label: "ringkasan",
    icon: (
      <svg {...ICON}>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/dashboard/progres",
    label: "progres",
    icon: (
      <svg {...ICON}>
        <path d="M3 3v18h18" />
        <path d="M7 15l4-4 3 3 5-6" />
      </svg>
    ),
  },
  {
    href: "/dashboard/riwayat",
    label: "riwayat sesi",
    icon: (
      <svg {...ICON}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    href: "/dashboard/pr",
    label: "personal record",
    icon: (
      <svg {...ICON}>
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
        <path d="M17 6h3a3 3 0 0 1-3 4M7 6H4a3 3 0 0 0 3 4" />
      </svg>
    ),
  },
  {
    href: "/dashboard/profil",
    label: "profil",
    icon: (
      <svg {...ICON}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
];

// menu dengan halaman aktif. usePathname butuh <Suspense> di route dinamis,
// jadi layout memakai NavList (tanpa penanda aktif) sebagai fallback-nya.
export function NavLinks() {
  return <NavList pathname={usePathname()} />;
}

// di hp jadi satu baris yang bisa digeser; di layar lebar jadi menu samping
export function NavList({ pathname }: { pathname?: string }) {
  return (
    <nav aria-label="navigasi utama">
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:overflow-visible md:px-0">
        {ITEMS.map((item) => {
          // cocokkan per segmen: /dashboard/pr tidak boleh ikut menyala di /dashboard/progres
          const active =
            pathname !== undefined &&
            (pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)));
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 whitespace-nowrap rounded-xl px-3.5 text-sm transition-colors ${
                  active
                    ? "bg-spot-raised font-semibold text-spot-text"
                    : "font-medium text-spot-muted hover:text-spot-text"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
