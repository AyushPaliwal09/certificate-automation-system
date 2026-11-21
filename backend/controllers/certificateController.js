
import mongoose from "mongoose";
import Submission from "../models/Submission.js";
import Event from "../models/Event.js";
import generateCertificateId from "../utils/generateCertificateId.js";

export const createSubmission = async (req, res) => {
  try {
    const {
      fullName,
      email,
      college,
      department,
      eventId,
    } = req.body;

    // Validate required fields
    if (
      !fullName?.trim() ||
      !email?.trim() ||
      !college?.trim() ||
      !department?.trim() ||
      !eventId
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address.",
      });
    }

    // Validate Event ID
    if (!mongoose.isValidObjectId(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID.",
      });
    }

    // Check event availability
    const event = await Event.findOne({
      _id: eventId,
      isActive: true,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found or inactive.",
      });
    }

    // Generate unique certificate ID
    const certificateId = generateCertificateId();

    // Save submission
    const submission = await Submission.create({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      college: college.trim(),
      department: department.trim(),
      event: event._id,
      certificateId,
    });

    return res.status(201).json({
      success: true,
      message: "Form submitted successfully!",
      data: {
        submissionId: submission._id,
        fullName: submission.fullName,
        email: submission.email,
        eventName: event.title,
        certificateId: submission.certificateId,
        status: submission.status,
      },
    });

  } catch (error) {
    console.error("Submission Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit form.",
    });
  }
}