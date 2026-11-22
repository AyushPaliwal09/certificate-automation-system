
import mongoose from "mongoose";

import Form from "../models/Form.js";
import Submission from "../models/Submission.js";

import generateCertificateId from "../utils/generateCertificateId.js";
import generateCertificatePDF from "../services/pdfGenerator.js";

// ==========================================
// CREATE STUDENT SUBMISSION
// ==========================================

export const createSubmission = async (req, res) => {
  try {
    const { formId } = req.params;
    const { answers } = req.body || {};

    // Validate Form ID
    if (!mongoose.isValidObjectId(formId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid form ID.",
      });
    }

    // Validate answers
    if (
      !answers ||
      typeof answers !== "object" ||
      Array.isArray(answers)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid form answers.",
      });
    }

    // Find published form
    const form = await Form.findOne({
      _id: formId,
      status: "published",
    }).populate("event");

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Published form not found.",
      });
    }

    if (!form.event) {
      return res.status(404).json({
        success: false,
        message: "Associated event not found.",
      });
    }

    // Validate submitted field keys
    const allowedKeys = new Set(
      form.fields.map((field) => field.fieldKey)
    );

    for (const key of Object.keys(answers)) {
      if (!allowedKeys.has(key)) {
        return res.status(400).json({
          success: false,
          message: `Invalid field: ${key}`,
        });
      }
    }

    const validatedAnswers = {};

    // Validate dynamic fields
    for (const field of form.fields) {
      const value = answers[field.fieldKey];

      const isEmpty =
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0);

      if (field.required && isEmpty) {
        return res.status(400).json({
          success: false,
          message: `${field.label} is required.`,
        });
      }

      if (isEmpty) continue;

      switch (field.type) {
        case "text":
        case "textarea": {
          if (typeof value !== "string" || !value.trim()) {
            return res.status(400).json({
              success: false,
              message: `${field.label} must be valid text.`,
            });
          }

          validatedAnswers[field.fieldKey] = value.trim();
          break;
        }

        case "email": {
          if (
            typeof value !== "string" ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
          ) {
            return res.status(400).json({
              success: false,
              message: `Invalid ${field.label}.`,
            });
          }

          validatedAnswers[field.fieldKey] =
            value.trim().toLowerCase();
          break;
        }

        case "number": {
          if (!Number.isFinite(Number(value))) {
            return res.status(400).json({
              success: false,
              message: `${field.label} must be a valid number.`,
            });
          }

          validatedAnswers[field.fieldKey] = Number(value);
          break;
        }

        case "date": {
          if (
            typeof value !== "string" ||
            Number.isNaN(Date.parse(value))
          ) {
            return res.status(400).json({
              success: false,
              message: `${field.label} must be a valid date.`,
            });
          }

          validatedAnswers[field.fieldKey] = value;
          break;
        }

        case "dropdown":
        case "radio": {
          if (
            typeof value !== "string" ||
            !field.options.includes(value)
          ) {
            return res.status(400).json({
              success: false,
              message: `Invalid option for ${field.label}.`,
            });
          }

          validatedAnswers[field.fieldKey] = value;
          break;
        }

        case "checkbox": {
          if (
            !Array.isArray(value) ||
            value.some(
              (item) =>
                typeof item !== "string" ||
                !field.options.includes(item)
            )
          ) {
            return res.status(400).json({
              success: false,
              message: `Invalid options for ${field.label}.`,
            });
          }

          validatedAnswers[field.fieldKey] = value;
          break;
        }

        default:
          return res.status(400).json({
            success: false,
            message: `Unsupported field type: ${field.type}`,
          });
      }
    }

    // Generate certificate ID
    const certificateId = generateCertificateId();

    // Save submission
    const submission = await Submission.create({
      form: form._id,
      event: form.event._id,
      answers: validatedAnswers,
      certificateId,
      status: "submitted",
    });

    return res.status(201).json({
      success: true,
      message: "Form submitted successfully!",
      data: {
        submissionId: submission._id,
        certificateId: submission.certificateId,
        answers: submission.answers,
        eventName: form.event.title,
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
};


// ==========================================
// DOWNLOAD CERTIFICATE
// ==========================================

export const downloadCertificate = async (req, res) => {
  let submission;

  try {
    const { submissionId } = req.params;

    if (!mongoose.isValidObjectId(submissionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID.",
      });
    }

    submission = await Submission.findById(submissionId)
      .populate("event", "title date venue")
      .populate("form");

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Certificate record not found.",
      });
    }

    if (submission.status === "revoked") {
      return res.status(403).json({
        success: false,
        message: "Certificate has been revoked.",
      });
    }

    if (!submission.event) {
      return res.status(404).json({
        success: false,
        message: "Associated event not found.",
      });
    }

    // Update status before sending the PDF
    submission.status = "issued";
    await submission.save();

    console.log("Certificate status updated:", submission.certificateId);

    // Generate and stream PDF
    await generateCertificatePDF(submission, res);

    console.log("Certificate downloaded:", submission.certificateId);

  } catch (error) {
    console.error("Download Certificate Error:", error);

    // Rollback status if PDF generation fails
    if (submission && !res.writableFinished) {
      await Submission.findByIdAndUpdate(submission._id, {
        status: "submitted",
      }).catch((dbError) => {
        console.error("Status rollback failed:", dbError);
      });
    }

    if (res.headersSent) {
      return res.destroy(error);
    }

    return res.status(500).json({
      success: false,
      message: "Certificate generation failed.",
    });
  }
};



// ==========================================
// VERIFY CERTIFICATE
// ==========================================

export const verifyCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;

    const submission = await Submission.findOne({
      certificateId,
    }).populate("event", "title date venue");

    if (!submission) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: "Certificate not found.",
      });
    }

    if (submission.status !== "issued") {
      return res.status(200).json({
        success: true,
        valid: false,
        message:
          submission.status === "revoked"
            ? "Certificate has been revoked."
            : "Certificate has not been issued yet.",
        data: {
          certificateId: submission.certificateId,
          status: submission.status,
        },
      });
    }

    return res.status(200).json({
      success: true,
      valid: true,
      message: "Certificate is authentic.",
      data: {
        fullName: submission.answers?.fullName || "N/A",
        email: submission.answers?.email || "N/A",
        eventName: submission.event?.title || "N/A",
        eventDate: submission.event?.date || null,
        certificateId: submission.certificateId,
        issuedAt: submission.updatedAt,
        status: submission.status,
      },
    });

  } catch (error) {
    console.error("Verification Error:", error);

    return res.status(500).json({
      success: false,
      message: "Verification failed.",
    });
  }
};
