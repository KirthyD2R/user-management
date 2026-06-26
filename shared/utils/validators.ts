export const validateEmail = (value: string): string => {
  if (!value.trim()) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ? ""
    : "Enter a valid email address";
};

export const validatePhone = (value: string): string => {
  if (!value.trim()) return "";
  // Accepts: 10-digit Indian mobile (6-9 start), optional +91 or 0 prefix
  return /^(\+91|0)?[6-9]\d{9}$/.test(value.replace(/\s/g, ""))
    ? ""
    : "Enter a valid 10-digit mobile number";
};

export const validateGstin = (value: string): string => {
  if (!value.trim()) return "";
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value.trim().toUpperCase())
    ? ""
    : "Enter a valid 15-character GSTIN";
};

export const validatePan = (value: string): string => {
  if (!value.trim()) return "";
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value.trim().toUpperCase())
    ? ""
    : "Enter a valid 10-character PAN";
};
