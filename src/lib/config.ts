const clanTag = (process.env.CLAN_TAG?.trim().toUpperCase() || "#2RVQ9YGRY");

if (!/^#[A-Z0-9]{3,15}$/.test(clanTag)) {
  throw new Error("A variável CLAN_TAG contém uma tag inválida.");
}

export const APP_CONFIG = {
  name: "Inglorious",
  clanTag,
  timeZone: process.env.APP_TIME_ZONE || "America/Sao_Paulo",
  currencyLocale: "pt-BR",
} as const;
