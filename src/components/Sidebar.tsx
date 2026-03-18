"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const navItems = [
  { href: "/evaluations/new", label: "マッチング評価", icon: "⚡" },
  { href: "/evaluations", label: "評価履歴", icon: "🗒" },
  { href: "/projects", label: "案件管理", icon: "📋" },
  { href: "/candidates", label: "候補者管理", icon: "👥" },
  { href: "/dashboard", label: "ダッシュボード", icon: "📊" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col fixed left-0 top-0">
      <div className="px-5 py-6 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">SES Agents</h1>
        <p className="text-sm text-gray-400 mt-0.5">営業支援システム</p>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-5 border-t border-gray-100">
        <div className="px-2 py-2 mb-2">
          <p className="text-sm font-medium text-gray-800 truncate">{session?.user?.name}</p>
          <p className="text-sm text-gray-400 truncate">{session?.user?.email}</p>
          <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
            {session?.user?.role === "admin" ? "管理者" : session?.user?.role === "manager" ? "マネージャー" : "営業"}
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left px-3 py-2.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
        >
          ログアウト
        </button>
      </div>
    </aside>
  );
}
