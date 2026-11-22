
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import certificateRoutes from "./routes/certificateRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import formRoutes from "./routes/formRoutes.js";
import submissionRoutes from "./routes/submissionRoutes.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Certificate Automation API is running!",
  });
});

app.use("/api/events", eventRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/submissions", submissionRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
