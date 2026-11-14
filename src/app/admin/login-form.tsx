"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
          ? result.error
          : "Não foi possível entrar.";
        setError(message);
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="admin-login" onSubmit={submit}>
      <label htmlFor="admin-username">Usuário administrativo</label>
      <input id="admin-username" name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required maxLength={120} />
      <label htmlFor="admin-password">Senha</label>
      <input id="admin-password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={256} />
      {error && <p className="admin-error" role="alert">{error}</p>}
      <button type="submit" disabled={loading}>{loading ? "Verificando..." : "Entrar na administração"}</button>
    </form>
  );
}
