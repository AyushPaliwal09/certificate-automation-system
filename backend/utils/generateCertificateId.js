
import crypto from "crypto";

const generateCertificateId = () => {
  const randomCode = crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase();

  return `CERT-${Date.now()}-${randomCode}`;
};

export default generateCertificateId;
