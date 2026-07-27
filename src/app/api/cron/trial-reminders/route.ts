import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCronSecret } from "@/lib/api/validation";
import { sendTrialEmail, type TrialStage } from "@/lib/email/trial";
import { resolvePlanState } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/cron/trial-reminders
 *
 * Relances d'essai. Cadence attendue : une fois par jour.
 *
 * Trois étapes : J-7, J-2 et J+1 (le lendemain de l'expiration). Chaque étape
 * n'est envoyée qu'une fois grâce à `trialRemindersSent` — un rattrapage ou un
 * double appel du cron ne renvoie pas les mêmes e-mails.
 *
 * On ne relance jamais un compte devenu payant entre-temps : l'état effectif
 * est recalculé pour chaque utilisateur avant l'envoi.
 */
export async function GET(req: Request) {
  const cronAuthError = requireCronSecret(req);
  if (cronAuthError) return cronAuthError;

  const now = new Date();
  const day = 86_400_000;

  // Fenêtre utile : de 8 jours avant l'échéance à 2 jours après.
  const candidates = await prisma.user.findMany({
    where: {
      trialEndsAt: { gte: new Date(now.getTime() - 2 * day), lte: new Date(now.getTime() + 8 * day) },
    },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      trialEndsAt: true,
      manualPlanUntil: true,
      trialRemindersSent: true,
    },
  });

  const results = { J7: 0, J2: 0, END: 0, ignores: 0, echecs: 0 };

  for (const user of candidates) {
    if (!user.trialEndsAt || !user.email) continue;

    // Un compte passé au payant n'a plus rien à voir avec ces relances.
    const state = resolvePlanState(user, now);
    if (state !== "TRIAL" && state !== "DORMANT") {
      results.ignores++;
      continue;
    }

    const msLeft = user.trialEndsAt.getTime() - now.getTime();
    const daysLeft = Math.ceil(msLeft / day);

    let stage: TrialStage | null = null;
    if (state === "TRIAL" && daysLeft <= 7 && daysLeft > 2) stage = "J7";
    else if (state === "TRIAL" && daysLeft <= 2 && daysLeft > 0) stage = "J2";
    else if (state === "DORMANT" && msLeft > -2 * day) stage = "END";

    if (!stage || user.trialRemindersSent.includes(stage)) {
      results.ignores++;
      continue;
    }

    const firstName = (user.name || "").split(" ")[0] || "";
    const sent = await sendTrialEmail(user.email, stage, firstName);

    if (!sent) {
      results.echecs++;
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { trialRemindersSent: { push: stage } },
    });
    results[stage]++;
  }

  return NextResponse.json({ ok: true, examines: candidates.length, ...results });
}
