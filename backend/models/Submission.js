
import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    college: {
      type: String,
      required: true,
      trim: true,
    },

    department: {
      type: String,
      required: true,
      trim: true,
    },

    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    certificateId: {
      type: String,
      required: true,
      unique: true,
    },

    status: {
      type: String,
      enum: ["issued", "revoked"],
      default: "issued",
    },
  },
  {
    timestamps: true,
  }
);

const Submission = mongoose.model(
  "Submission",
  submissionSchema
);

export default Submission;
