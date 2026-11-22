
import mongoose from "mongoose";

import Form from "../models/Form.js";
import Submission from "../models/Submission.js";
import generateCertificateId from "../utils/generateCertificateId.js";

// POST: Submit a published form
export const createSubmission = async (req, res) => {
  try {
    const { formId } = req.params;
    const { answers } = req.body || {};

    // 1. Validate Form ID
    if (!mongoose.Types.ObjectId.isValid(formId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid form ID.",
      });
    }

    // 2. Validate answers object
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

    // 3. Find published form
    const form = await Form.findOne({
      _id: formId,
      status: "published",
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Published form not found.",
      });
    }

    // 4. Validate submitted field keys
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

    // 5. Validate each dynamic field
    for (const field of form.fields) {
      const value = answers[field.fieldKey];

      const isEmpty =
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0);

      // Required field validation
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
              message: `Please enter a valid ${field.label}.`,
            });
          }

          validatedAnswers[field.fieldKey] =
            value.trim().toLowerCase();
          break;
        }

        case "number": {
          if (
            value === "" ||
            !Number.isFinite(Number(value))
          ) {
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
              message: `Please select a valid option for ${field.label}.`,
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
              message: `Please select valid options for ${field.label}.`,
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

    // 6. Generate unique Certificate ID
    const certificateId = generateCertificateId();

    // 7. Save submission in MongoDB
    const submission = await Submission.create({
      form: form._id,
      event: form.event,
      answers: validatedAnswers,
      certificateId,
      status: "submitted",
    });

    // 8. Send success response
    return res.status(201).json({
      success: true,
      message: "Form submitted successfully!",
      data: {
        submissionId: submission._id,
        certificateId: submission.certificateId,
        answers: submission.answers,
        status: submission.status,
      },
    });
  } catch (error) {
    console.error("Create Submission Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit form.",
    });
  }
};
