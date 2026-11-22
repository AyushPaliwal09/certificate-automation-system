
import express from "express";

import {
  createSubmission,
  downloadCertificate,
  verifyCertificate,
} from "../controllers/certificateController.js";

const router = express.Router();

// Student submits dynamic form
router.post("/submit/:formId", createSubmission);

// Download generated certificate PDF
router.get("/:submissionId/download", downloadCertificate);

// Verify certificate using Certificate ID
router.get("/verify/:certificateId", verifyCertificate);

export default router;
