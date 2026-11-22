
import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    form: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form",
      required: true,
    },

    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    answers: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    certificateId: {
      type: String,
      unique: true,
      sparse: true,
    },

    certificateUrl: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["submitted", "issued", "failed", "revoked"],
      default: "submitted",
    },
  },
  {
    timestamps: true,
  }
);

const Submission = mongoose.model("Submission", submissionSchema);

export default Submission;
