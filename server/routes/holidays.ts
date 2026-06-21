import { Router } from "express";

import { getHolidayImpact } from "../services/holidayService";

const router = Router();

router.get("/impact", async (req, res, next) => {
  try {
    res.json(
      await getHolidayImpact(
        typeof req.query.at === "string" ? req.query.at : undefined,
      ),
    );
  } catch (error) {
    next(error);
  }
});

export default router;
