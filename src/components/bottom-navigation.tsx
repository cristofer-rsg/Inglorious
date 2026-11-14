"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const items = [
  { href: "/", icon: "⌂", label: "Início" },
  { href: "/ranking", icon: "♛", label: "Ranking" },
  { href: "/performance", icon: "◈", label: "Desempenho" },
  { href: "/rules", icon: "⚖", label: "Regras" },
  { href: "/clan-time", icon: "◷", label: "Tempo de Clã" },
];

export default function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const currentPath = useRef(pathname);
  const pending = useRef(false);

  useEffect(() => {
    currentPath.current = pathname;
    pending.current = false;
    touchStart.current = null;
  }, [pathname]);

  useEffect(() => {
    items.forEach((item) => router.prefetch(item.href));
    const onStart = (event: TouchEvent) => {
      if (currentPath.current.startsWith("/admin") || currentPath.current === "/login" || event.touches.length !== 1 || pending.current) {
        touchStart.current = null;
        return;
      }
      const target = event.target;
      if (target instanceof Element && target.closest("input,textarea,select,[contenteditable='true'],[data-no-swipe],.horizontal-scroll,[data-swipe-ignore]")) {
        touchStart.current = null;
        return;
      }
      touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    };
    const onEnd = (event: TouchEvent) => {
      const start = touchStart.current;
      touchStart.current = null;
      if (!start || event.changedTouches.length !== 1 || pending.current) return;
      const path = currentPath.current;
      if (path.startsWith("/admin") || path === "/login") return;
      const dx = event.changedTouches[0].clientX - start.x;
      const dy = event.changedTouches[0].clientY - start.y;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      const index = items.findIndex((item) => item.href === "/" ? path === "/" : path === item.href || path.startsWith(item.href + "/"));
      const current = index >= 0 ? index : path.startsWith("/history") ? 1 : 0;
      const next = dx < 0 ? Math.min(items.length - 1, current + 1) : Math.max(0, current - 1);
      if (next !== current) {
        pending.current = true;
        router.push(items[next].href, { scroll: false });
      }
    };
    const onCancel = () => { touchStart.current = null; };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onCancel);
    };
  }, [router]);

  if (pathname.startsWith("/admin") || pathname === "/login") return null;
  return (
    <nav className="mobile-bottom-nav" aria-label="Navegação principal">
      <span className="mobile-nav-swipe-arrow" aria-hidden="true">‹</span>
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link className={active ? "mobile-nav-item active" : "mobile-nav-item"} href={item.href} key={item.href} aria-current={active ? "page" : undefined} prefetch>
            <span className="mobile-nav-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
      <span className="mobile-nav-swipe-arrow" aria-hidden="true">›</span>
    </nav>
  );
}
