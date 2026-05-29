import { Router } from "express";
import { db, visitsTable } from "@workspace/db";
import { LogVisitBody } from "@workspace/api-zod";

const router = Router();

async function pingGoogleSheet(visit: {
  id: number;
  page: string;
  ipAddress: string;
  timeSpentSeconds: number | null;
  noCount: number | null;
  finalAnswer: string | null;
  visitedAt: Date;
}) {
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: visit.id,
        page: visit.page,
        ip: visit.ipAddress,
        timeSpentSeconds: visit.timeSpentSeconds,
        noCount: visit.noCount,
        finalAnswer: visit.finalAnswer,
        visitedAt: visit.visitedAt.toISOString(),
      }),
    });
  } catch {
    // fire-and-forget — never block the response
  }
}

router.post("/analytics/visit", async (req, res) => {
  const parsed = LogVisitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { page, timeSpentSeconds, userAgent, noCount, finalAnswer } = parsed.data;

  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  const [visit] = await db
    .insert(visitsTable)
    .values({
      page,
      timeSpentSeconds,
      ipAddress: ip,
      userAgent: userAgent ?? null,
      noCount: noCount ?? null,
      finalAnswer: finalAnswer ?? null,
    })
    .returning();

  req.log.info({ visitId: visit.id, page, ip }, "Visit logged");

  void pingGoogleSheet(visit);

  res.json({
    id: visit.id,
    page: visit.page,
    timeSpentSeconds: visit.timeSpentSeconds,
    ipAddress: visit.ipAddress,
    userAgent: visit.userAgent,
    noCount: visit.noCount,
    finalAnswer: visit.finalAnswer,
    visitedAt: visit.visitedAt.toISOString(),
  });
});

router.get("/analytics/visits", async (req, res) => {
  const visits = await db.select().from(visitsTable);
  res.json(
    visits.map((v) => ({
      id: v.id,
      page: v.page,
      timeSpentSeconds: v.timeSpentSeconds,
      ipAddress: v.ipAddress,
      userAgent: v.userAgent,
      noCount: v.noCount,
      finalAnswer: v.finalAnswer,
      visitedAt: v.visitedAt.toISOString(),
    }))
  );
});

export default router;
