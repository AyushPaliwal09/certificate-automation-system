
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

const COLORS = {
  navy: "#14243A",
  gold: "#B18A3B",
  lightGold: "#D6BD7B",
  text: "#444444",
  paper: "#FCFAF3",
};

const generateCertificatePDF = async (submission, res) => {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margins: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
  });

  const pageWidth = 841.89;
  const pageHeight = 595.28;

  const certificateId = submission.certificateId;
  const answers = submission.answers || {};
  const event = submission.event;

  const baseUrl = process.env.BASE_URL;

  const verificationUrl =
    `${baseUrl}/api/certificates/verify/${certificateId}`;

  // Generate QR code
  const qrBuffer = await QRCode.toBuffer(verificationUrl, {
    width: 250,
    margin: 1,
    errorCorrectionLevel: "H",
  });

  // Dynamic student name
  const studentName =
    answers.fullName || "Student";

  // Dynamic event details
  const eventName =
    event?.title || "College Event";

  const eventDate = event?.date
    ? new Date(event.date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "N/A";

  res.setHeader("Content-Type", "application/pdf");

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${certificateId}.pdf"`
  );

  doc.pipe(res);

  // Background
  doc.rect(0, 0, pageWidth, pageHeight)
    .fill(COLORS.paper);

  // Outer border
  doc.lineWidth(4)
    .strokeColor(COLORS.gold)
    .rect(18, 18, pageWidth - 36, pageHeight - 36)
    .stroke();

  // Inner border
  doc.lineWidth(1.5)
    .strokeColor(COLORS.lightGold)
    .rect(27, 27, pageWidth - 54, pageHeight - 54)
    .stroke();

  // Header
  doc.font("Times-Bold")
    .fontSize(15)
    .fillColor(COLORS.gold)
    .text(
      process.env.COLLEGE_NAME || "YOUR COLLEGE NAME",
      70,
      65,
      {
        width: pageWidth - 140,
        align: "center",
      }
    );

  // Certificate heading
  doc.font("Times-Bold")
    .fontSize(38)
    .fillColor(COLORS.navy)
    .text("CERTIFICATE", 50, 105, {
      width: pageWidth - 100,
      align: "center",
      characterSpacing: 3,
    });

  doc.font("Helvetica")
    .fontSize(15)
    .fillColor(COLORS.gold)
    .text("OF PARTICIPATION", 50, 155, {
      width: pageWidth - 100,
      align: "center",
      characterSpacing: 4,
    });

  // Intro text
  doc.font("Helvetica")
    .fontSize(14)
    .fillColor(COLORS.text)
    .text("This certificate is proudly presented to", 50, 205, {
      width: pageWidth - 100,
      align: "center",
    });

  // Student name
  doc.font("Times-Bold")
    .fontSize(34)
    .fillColor(COLORS.navy)
    .text(studentName, 70, 240, {
      width: pageWidth - 140,
      align: "center",
      lineBreak: false,
    });

  // Decorative underline
  doc.moveTo(260, 286)
    .lineTo(pageWidth - 260, 286)
    .lineWidth(2)
    .strokeColor(COLORS.gold)
    .stroke();

  // Event details
  doc.font("Helvetica")
    .fontSize(13)
    .fillColor(COLORS.text)
    .text("For successfully participating in", 50, 305, {
      width: pageWidth - 100,
      align: "center",
    });

  doc.font("Times-Bold")
    .fontSize(23)
    .fillColor(COLORS.navy)
    .text(eventName, 70, 330, {
      width: pageWidth - 140,
      align: "center",
    });

  // Event date
  doc.font("Helvetica")
    .fontSize(11)
    .fillColor(COLORS.text)
    .text(`Event Date: ${eventDate}`, 50, 380, {
      width: pageWidth - 100,
      align: "center",
    });

  // Certificate ID
  doc.font("Helvetica")
    .fontSize(9)
    .fillColor(COLORS.text)
    .text(`Certificate ID: ${certificateId}`, 50, 410, {
      width: pageWidth - 100,
      align: "center",
    });

  // Signature sections
  doc.moveTo(100, 490)
    .lineTo(240, 490)
    .lineWidth(1)
    .strokeColor(COLORS.gold)
    .stroke();

  doc.font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(COLORS.navy)
    .text("Event Coordinator", 100, 498, {
      width: 140,
      align: "center",
    });

  doc.moveTo(pageWidth - 240, 490)
    .lineTo(pageWidth - 100, 490)
    .lineWidth(1)
    .strokeColor(COLORS.gold)
    .stroke();

  doc.font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(COLORS.navy)
    .text("Principal", pageWidth - 240, 498, {
      width: 140,
      align: "center",
    });

  
  // QR Code
  doc.image(qrBuffer, pageWidth / 2 - 32, 455, {
    width: 64,
    height: 64,
  });

  doc.font("Helvetica")
    .fontSize(7)
    .fillColor(COLORS.text)
    .text("SCAN TO VERIFY", pageWidth / 2 - 45, 521, {
      width: 90,
      align: "center",
    });

  // Wait until PDF response finishes
  await new Promise((resolve, reject) => {
    res.once("finish", resolve);
    res.once("error", reject);
    doc.once("error", reject);

    doc.end();
  });
};

export default generateCertificatePDF;
