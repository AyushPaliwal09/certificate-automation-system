
import mongoose from "mongoose";

// Question validation schema
const validationSchema = new mongoose.Schema(
  {
    minLength: { type: Number, default: null },
    maxLength: { type: Number, default: null },
    min: { type: Number, default: null },
    max: { type: Number, default: null },
    pattern: { type: String, default: "" },
  },
  { _id: false }
);

// Question schema
const fieldSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    trim: true,
  },

  description: {
    type: String,
    default: "",
  },

  fieldKey: {
    type: String,
    required: true,
    trim: true,
  },

  type: {
    type: String,
    enum: [
      "text",
      "email",
      "number",
      "textarea",
      "dropdown",
      "radio",
      "checkbox",
      "date",
      "time",
      "file",
      "linearScale",
      "rating",
    ],
    required: true,
  },

  placeholder: {
    type: String,
    default: "",
  },

  options: {
    type: [String],
    default: [],
  },

  required: {
    type: Boolean,
    default: false,
  },

  image: {
    type: String,
    default: "",
  },

  order: {
    type: Number,
    default: 0,
  },

  sectionId: {
    type: String,
    default: "section-1",
  },

  validation: {
    type: validationSchema,
    default: () => ({}),
  },

  scale: {
    min: { type: Number, default: 1 },
    max: { type: Number, default: 5 },
    minLabel: { type: String, default: "" },
    maxLabel: { type: String, default: "" },
  },
});

// Section schema
const sectionSchema = new mongoose.Schema({
  sectionId: {
    type: String,
    required: true,
  },

  title: {
    type: String,
    default: "Untitled Section",
  },

  description: {
    type: String,
    default: "",
  },

  order: {
    type: Number,
    default: 0,
  },
});

// Theme schema
const themeSchema = new mongoose.Schema(
  {
    primaryColor: {
      type: String,
      default: "#687653",
    },

    backgroundColor: {
      type: String,
      default: "#F7F6F0",
    },

    fontFamily: {
      type: String,
      default: "Inter",
    },

    headerImage: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

// Form settings
const settingsSchema = new mongoose.Schema(
  {
    acceptResponses: {
      type: Boolean,
      default: true,
    },

    responseLimit: {
      type: Number,
      default: null,
    },

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    allowMultipleSubmissions: {
      type: Boolean,
      default: true,
    },

    showProgressBar: {
      type: Boolean,
      default: true,
    },

    shuffleQuestions: {
      type: Boolean,
      default: false,
    },

    confirmationMessage: {
      type: String,
      default: "Your response has been recorded.",
    },
  },
  { _id: false }
);

// Main Form schema
const formSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    coverImage: {
      type: String,
      default: "",
    },

    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    // Existing flat question structure retained
    fields: {
      type: [fieldSchema],
      validate: {
        validator: (fields) => fields.length > 0,
        message: "At least one question is required.",
      },
    },

    // Sections for multi-page forms
    sections: {
      type: [sectionSchema],
      default: () => [
        {
          sectionId: "section-1",
          title: "Section 1",
          description: "",
          order: 0,
        },
      ],
    },

    theme: {
      type: themeSchema,
      default: () => ({}),
    },

    settings: {
      type: settingsSchema,
      default: () => ({}),
    },

    status: {
      type: String,
      enum: ["draft", "published", "closed"],
      default: "draft",
    },

    certificateTemplate: {
      type: String,
      default: "default",
    },
  },
  {
    timestamps: true,
  }
);

const Form = mongoose.model("Form", formSchema);

export default Form;
