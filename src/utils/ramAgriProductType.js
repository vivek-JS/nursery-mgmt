export const RAM_AGRI_PRODUCT_TYPES = ["seed", "chemical", "gift"];

const LABELS = {
  seed: "Seed",
  chemical: "Chemical",
  gift: "Gift",
};

const LABELS_PLURAL = {
  seed: "Seeds",
  chemical: "Chemicals",
  gift: "Gifts",
};

const LABELS_MARATHI = {
  seed: "बियाणे",
  chemical: "रसायने",
  gift: "भेटवस्तू",
};

export function normalizeRamAgriProductType(value) {
  const normalized = String(value || "seed").trim().toLowerCase();
  if (normalized === "chemical" || normalized === "chemicals") return "chemical";
  if (normalized === "gift" || normalized === "gifts") return "gift";
  return "seed";
}

export function getRamAgriProductTypeLabel(type) {
  return LABELS[normalizeRamAgriProductType(type)] || LABELS.seed;
}

export function getRamAgriProductTypeLabelPlural(type) {
  return LABELS_PLURAL[normalizeRamAgriProductType(type)] || LABELS_PLURAL.seed;
}

export function getRamAgriProductTypeMarathiLabel(type) {
  return LABELS_MARATHI[normalizeRamAgriProductType(type)] || LABELS_MARATHI.seed;
}

export function getRamAgriProductTypeRadioLabel(type) {
  const key = normalizeRamAgriProductType(type);
  return `${LABELS[key]} · ${LABELS_MARATHI[key]}`;
}
