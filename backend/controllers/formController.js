import mongoose from "mongoose";
import Form from "../models/Form.js";
import Event from "../models/Event.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeFields = (fields = []) =>
  fields.map((field, index) => ({
    ...field,
    label: field.label?.trim(),
    fieldKey: field.fieldKey?.trim(),
    order: Number.isFinite(field.order) ? field.order : index,
    sectionId: field.sectionId || "section-1",
    options: Array.isArray(field.options)
      ? field.options.map((option) => String(option).trim()).filter(Boolean)
      : [],
  }));

const validateFormPayload = (fields, sections) => {
  if (!Array.isArray(fields) || fields.length === 0) {
    return "At least one question is required.";
  }

  const keys = fields.map((field) => field.fieldKey);
  if (
    keys.some((key) => !key) ||
    new Set(keys).size !== keys.length
  ) {
    return "Question keys must be present and unique.";
  }

  const hasName = fields.some(
    (field) =>
      field.fieldKey === "fullName" &&
      field.type === "text" &&
      field.required === true
  );
  const hasEmail = fields.some(
    (field) =>
      field.fieldKey === "email" &&
      field.type === "email" &&
      field.required === true
  );

  if (!hasName || !hasEmail) {
    return "Required Full Name (text) and Email (email) questions are mandatory for certificates.";
  }

  const allowedTypes = [
    "text", "email", "number", "textarea", "dropdown",
    "radio", "checkbox", "date", "time", "file",
    "linearScale", "rating",
  ];

  for (const field of fields) {
    if (!field.label) return "Every question must have a label.";
    if (!allowedTypes.includes(field.type)) {
      return `Unsupported question type: ${field.type}`;
    }
    if (
      ["dropdown", "radio", "checkbox"].includes(field.type) &&
      (!Array.isArray(field.options) || field.options.length === 0)
    ) {
      return `Add at least one option to "${field.label}".`;
    }
  }

  if (!Array.isArray(sections) || sections.length === 0) {
    return "At least one section is required.";
  }

  const sectionIds = new Set(sections.map((section) => section.sectionId));
  if (sectionIds.size !== sections.length || sectionIds.has(undefined)) {
    return "Section IDs must be present and unique.";
  }

  for (const field of fields) {
    if (!sectionIds.has(field.sectionId)) {
      return `Question "${field.label}" refers to a section that does not exist.`;
    }
  }

  return null;
};

// POST /api/forms
export const createForm = async (req, res) => {
  try {
    const {
      title,
      description = "",
      eventId,
      fields,
      sections,
      coverImage = "",
      theme,
      settings,
      certificateTemplate = "default",
    } = req.body;

    if (!title?.trim() || !eventId || !isValidId(eventId)) {
      return res.status(400).json({
        success: false,
        message: "A valid title and event are required.",
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found.",
      });
    }

    const normalizedFields = normalizeFields(fields);
    const normalizedSections =
      Array.isArray(sections) && sections.length
        ? sections
        : [{
            sectionId: "section-1",
            title: "Section 1",
            description: "",
            order: 0,
          }];

    const validationError = validateFormPayload(
      normalizedFields,
      normalizedSections
    );

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const form = await Form.create({
      title: title.trim(),
      description: description.trim(),
      event: event._id,
      fields: normalizedFields,
      sections: normalizedSections,
      coverImage,
      theme,
      settings,
      certificateTemplate,
      status: "draft",
    });

    return res.status(201).json({
      success: true,
      message: "Form created successfully.",
      data: form,
    });
  } catch (error) {
    console.error("Create Form Error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create form.",
    });
  }
};

// GET /api/forms (admin)
export const getAllForms = async (req, res) => {
  try {
    const forms = await Form.find()
      .populate("event", "title date venue status")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: forms.length,
      data: forms,
    });
  } catch (error) {
    console.error("Get Forms Error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch forms.",
    });
  }
};

// GET /api/forms/:formId (admin editor)
export const getFormById = async (req, res) => {
  try {
    if (!isValidId(req.params.formId)) {
      return res.status(400).json({ success: false, message: "Invalid form ID." });
    }

    const form = await Form.findById(req.params.formId)
      .populate("event", "title description date venue status");

    if (!form) {
      return res.status(404).json({ success: false, message: "Form not found." });
    }

    return res.status(200).json({ success: true, data: form });
  } catch (error) {
    console.error("Get Form Error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch form." });
  }
};

// PUT /api/forms/:formId (admin editor)
export const updateForm = async (req, res) => {
  try {
    const { formId } = req.params;
    if (!isValidId(formId)) {
      return res.status(400).json({ success: false, message: "Invalid form ID." });
    }

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ success: false, message: "Form not found." });
    }

    if (form.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Only draft forms can be edited. Close or duplicate the form to make another version.",
      });
    }

    const {
      title,
      description,
      eventId,
      fields,
      sections,
      coverImage,
      theme,
      settings,
      certificateTemplate,
    } = req.body;

    const nextFields = normalizeFields(fields ?? form.fields);
    const nextSections = sections ?? form.sections;

    const validationError = validateFormPayload(nextFields, nextSections);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    if (eventId !== undefined) {
      if (!isValidId(eventId)) {
        return res.status(400).json({ success: false, message: "Invalid event ID." });
      }
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ success: false, message: "Event not found." });
      }
      form.event = event._id;
    }

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ success: false, message: "Form title cannot be empty." });
      }
      form.title = title.trim();
    }

    if (description !== undefined) form.description = description;
    if (fields !== undefined) form.fields = nextFields;
    if (sections !== undefined) form.sections = nextSections;
    if (coverImage !== undefined) form.coverImage = coverImage;
    if (theme !== undefined) form.theme = theme;
    if (settings !== undefined) form.settings = settings;
    if (certificateTemplate !== undefined) {
      form.certificateTemplate = certificateTemplate;
    }

    await form.save();

    return res.status(200).json({
      success: true,
      message: "Form updated successfully.",
      data: form,
    });
  } catch (error) {
    console.error("Update Form Error:", error);
    return res.status(500).json({ success: false, message: "Unable to update form." });
  }
};

// DELETE /api/forms/:formId (draft only)
export const deleteForm = async (req, res) => {
  try {
    const { formId } = req.params;
    if (!isValidId(formId)) {
      return res.status(400).json({ success: false, message: "Invalid form ID." });
    }

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ success: false, message: "Form not found." });
    }

    if (form.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Only draft forms can be deleted.",
      });
    }

    await form.deleteOne();
    return res.status(200).json({
      success: true,
      message: "Draft form deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Form Error:", error);
    return res.status(500).json({ success: false, message: "Unable to delete form." });
  }
};

// GET /api/forms/public/:formId (student)
export const getPublicForm = async (req, res) => {
  try {
    const { formId } = req.params;
    if (!isValidId(formId)) {
      return res.status(400).json({ success: false, message: "Invalid form ID." });
    }

    const form = await Form.findOne({
      _id: formId,
      status: "published",
      "settings.acceptResponses": { $ne: false },
    }).populate("event", "title description date venue");

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found or responses are closed.",
      });
    }

    const now = new Date();
    if (form.settings?.startDate && now < form.settings.startDate) {
      return res.status(403).json({
        success: false,
        message: "This form is not accepting responses yet.",
      });
    }

    if (form.settings?.endDate && now > form.settings.endDate) {
      return res.status(403).json({
        success: false,
        message: "The response period for this form has ended.",
      });
    }

    return res.status(200).json({ success: true, data: form });
  } catch (error) {
    console.error("Get Public Form Error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch form." });
  }
};

// PATCH /api/forms/:formId/publish
export const publishForm = async (req, res) => {
  try {
    const { formId } = req.params;
    if (!isValidId(formId)) {
      return res.status(400).json({ success: false, message: "Invalid form ID." });
    }

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ success: false, message: "Form not found." });
    }

    if (form.status === "published") {
      return res.status(200).json({
        success: true,
        message: "Form is already published.",
        data: form,
      });
    }

    if (form.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "A closed form cannot be published.",
      });
    }

    const validationError = validateFormPayload(form.fields, form.sections);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    form.status = "published";
    await form.save();

    return res.status(200).json({
      success: true,
      message: "Form published successfully.",
      data: form,
    });
  } catch (error) {
    console.error("Publish Form Error:", error);
    return res.status(500).json({ success: false, message: "Unable to publish form." });
  }
};

// PATCH /api/forms/:formId/close
export const closeForm = async (req, res) => {
  try {
    const { formId } = req.params;
    if (!isValidId(formId)) {
      return res.status(400).json({ success: false, message: "Invalid form ID." });
    }

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ success: false, message: "Form not found." });
    }

    form.status = "closed";
    if (form.settings) form.settings.acceptResponses = false;
    await form.save();

    return res.status(200).json({
      success: true,
      message: "Form closed successfully.",
      data: form,
    });
  } catch (error) {
    console.error("Close Form Error:", error);
    return res.status(500).json({ success: false, message: "Unable to close form." });
  }
};
