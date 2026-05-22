import express from 'express';
import jwt from "jsonwebtoken";
import {
  dashboardSummary,
  stockReport,
  movementReport,
  exportSalesCsv,
  downloadReportPdf
} from "../controllers/reportController.js";
import { protect } from "../middleware/authMiddleware.js";
import env from "../config/env.js";

const router = express.Router();

// ← changed router.use() to router.get() for all these
router.get("/dashboard",        protect, dashboardSummary);
router.get("/stock",            protect, stockReport);
router.get("/movement",         protect, movementReport);
router.get("/sales/export.csv", protect, exportSalesCsv);

// PDF download: supports Bearer token AND ?token= query param
router.get("/download-pdf", (req, res, next) => {
  if (req.headers.authorization) {
    return protect(req, res, next);
  }
  if (req.query.token) {
    try {
      const decoded = jwt.verify(req.query.token, env.jwtSecret);
      req.user = { _id: decoded.id };
      return next();
    } catch {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  }
  return res.status(401).json({ message: "Unauthorized" });
}, downloadReportPdf);

export default router;