
import express from "express";
import {
  createSubmission,
} from "../controllers/certificateController.js";

const router = express.Router();

router.post("/submit", createSubmission);

export default router