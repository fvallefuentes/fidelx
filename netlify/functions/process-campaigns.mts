// Netlify Scheduled Function — s'exécute toutes les 5 minutes
// Appelle la route API interne qui traite les campagnes planifiées
export default async () => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.URL;
  const secret = process.env.CAMPAIGNS_SECRET;

  if (!appUrl || !secret) {
    console.error("[process-campaigns] NEXT_PUBLIC_APP_URL ou CAMPAIGNS_SECRET manquant");
    return;
  }

  try {
    const res = await fetch(`${appUrl}/api/campaigns/process-due`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    console.log("[process-campaigns] résultat:", data);
  } catch (err) {
    console.error("[process-campaigns] erreur:", err);
  }
};

export const config = {
  schedule: "*/5 * * * *",
};
