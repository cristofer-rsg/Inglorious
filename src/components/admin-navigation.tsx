import Link from "next/link";

const links = [
  { href: "/admin", label: "Visão geral", icon: "⌂" },
  { href: "/admin/analytics", label: "Analytics", icon: "▥" },
  { href: "/history", label: "Histórico", icon: "▤" },
];

export default function AdminNavigation({ current }: { current: string }) {
  return (
    <nav className="admin-navigation" aria-label="Navegação administrativa">
      {links.map((link) => (
        <Link className={current === link.href ? "admin-nav-link active" : "admin-nav-link"} href={link.href} key={link.href} aria-current={current === link.href ? "page" : undefined}>
          <span aria-hidden="true">{link.icon}</span>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
