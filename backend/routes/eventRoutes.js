
import express from "express";

import {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} from "../controllers/eventController.js";

const router = express.Router();

router.post("/", createEvent);
router.get("/", getAllEvents);
router.get("/:eventId", getEventById);
router.put("/:eventId", updateEvent);
router.delete("/:eventId", deleteEvent);

export default router;
