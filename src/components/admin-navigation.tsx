import Link from "next/link";

const links = [
  { href: "/admin#overview", label: "Visão geral", icon: "⌂" },
  { href: "/admin#analytics", label: "Analytics", icon: "▥" },
  { href: "/admin#events", label: "Lançamentos", icon: "✎" },
  { href: "/admin/performance", label: "Desempenho", icon: "◈" },
  { href: "/history", label: "Histórico", icon: "▤" },
];

export default function AdminNavigation() {
  return (
    <nav className="admin-navigation" aria-label="Navegação administrativa">
      {links.map((link) => (
        <Link className="admin-nav-link" href={link.href} key={link.href}>
          <span aria-hidden="true">{link.icon}</span>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
