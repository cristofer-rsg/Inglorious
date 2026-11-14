import Link from "next/link";

const links = [
  { href: "/", label: "Início", icon: "⌂" },
  { href: "/ranking", label: "Ranking", icon: "♛" },
  { href: "/performance", label: "Desempenho", icon: "◈" },
  { href: "/history", label: "Histórico", icon: "▤" },
  { href: "/clan-time", label: "Tempo de Clã", icon: "◷" },
  { href: "/rules", label: "Regras", icon: "⚖" },
  { href: "/admin", label: "Gerenciar aplicativo", icon: "⚙" },
];

export default function SiteNav({ active }: { active: string }) {
  return (
    <aside className="sidebar">
      <div className="side-label">MENU PRINCIPAL</div>
      {links.filter((link) => link.href !== "/admin").map((link) => (
        <Link className={active === link.href ? "nav-item active" : "nav-item"} href={link.href} key={link.href}>
          <span className="nav-icon">{link.icon}</span><span>{link.label}</span>
          {active === link.href ? <span className="active-bar" /> : null}
        </Link>
      ))}
      <div className="side-divider" />
      <div className="side-label">ADMINISTRAÇÃO</div>
      <Link className={active === "/admin" ? "nav-item active" : "nav-item"} href="/admin">
        <span className="nav-icon">⚙</span><span>Gerenciar aplicativo</span>
        {active === "/admin" ? <span className="active-bar" /> : null}
      </Link>
      <div className="sidebar-foot"><span className="shield">◆</span><span><b>INGLORIOUS</b><small>Temporada do clã</small></span></div>
    </aside>
  );
}
