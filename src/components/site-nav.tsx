import Link from "next/link";

const links = [
  { href: "/", label: "Início" },
  { href: "/ranking", label: "Ranking" },
  { href: "/performance", label: "Desempenho" },
  { href: "/members", label: "Membros" },
  { href: "/history", label: "Histórico" },
  { href: "/rules", label: "Regras" },
  { href: "/admin", label: "Admin" },
];

export default function SiteNav({ active }: { active: string }) {
  return (
    <nav className="site-nav" aria-label="Navegação principal">
      {links.map((link) => (
        <Link className={active === link.href ? "active" : ""} href={link.href} key={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
