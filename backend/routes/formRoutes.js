import express from "express";

import {
  createForm,
  getAllForms,
  getFormById,
  updateForm,
  deleteForm,
  getPublicForm,
  publishForm,
  closeForm,
} from "../controllers/formController.js";

const router = express.Router();

// Public route must be declared before /:formId
router.get("/public/:formId", getPublicForm);

// Admin routes (add auth middleware before these in production)
router.post("/", createForm);
router.get("/", getAllForms);
router.get("/:formId", getFormById);
router.put("/:formId", updateForm);
router.delete("/:formId", deleteForm);
router.patch("/:formId/publish", publishForm);
router.patch("/:formId/close", closeForm);

export default router;
