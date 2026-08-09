/** Stage colors & shared MUI sx for Plant Pipeline admin UI */
export const STAGES = {
  lab: {
    id: "lab",
    label: "Lab",
    subtitle: "Outward from tissue culture",
    color: "#0d9488",
    bg: "rgba(13, 148, 136, 0.08)",
    border: "rgba(13, 148, 136, 0.35)",
  },
  primary: {
    id: "primary",
    label: "Primary",
    subtitle: "Hardening shed — inward & outward",
    color: "#059669",
    bg: "rgba(5, 150, 105, 0.08)",
    border: "rgba(5, 150, 105, 0.35)",
  },
  secondary: {
    id: "secondary",
    label: "Secondary",
    subtitle: "Lagwad, sowing & inward",
    color: "#d97706",
    bg: "rgba(217, 119, 6, 0.08)",
    border: "rgba(217, 119, 6, 0.35)",
  },
  dispatch: {
    id: "dispatch",
    label: "Dispatch",
    subtitle: "Orders & vehicle load",
    color: "#2563eb",
    bg: "rgba(37, 99, 235, 0.08)",
    border: "rgba(37, 99, 235, 0.35)",
  },
};

export const pageShellSx = {
  minHeight: "100%",
  background: "linear-gradient(165deg, #ecfdf5 0%, #f8fafc 42%, #fffbeb 100%)",
  pb: 4,
};

export const heroPaperSx = {
  p: { xs: 2, md: 2.5 },
  borderRadius: 3,
  border: "1px solid rgba(5, 150, 105, 0.12)",
  background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
  boxShadow: "0 4px 24px rgba(5, 150, 105, 0.08)",
};

export const contentPaperSx = {
  borderRadius: 3,
  border: "1px solid",
  borderColor: "divider",
  overflow: "hidden",
  boxShadow: "0 2px 12px rgba(15, 23, 42, 0.04)",
  bgcolor: "#fff",
};

export const tableHeadSx = {
  bgcolor: "#f8fafc",
  "& th": {
    fontWeight: 700,
    fontSize: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "text.secondary",
    borderBottom: "2px solid",
    borderColor: "divider",
    py: 1.5,
  },
};

export const tableRowSx = {
  "&:hover": { bgcolor: "rgba(5, 150, 105, 0.03)" },
  "& td": { py: 1.25, fontSize: "0.875rem" },
};

export function stageCounts(batchDoc) {
  if (!batchDoc) {
    return { lab: 0, primaryIn: 0, primaryOut: 0, secondaryIn: 0, dispatch: 0 };
  }
  return {
    lab: batchDoc.outward?.length ?? 0,
    primaryIn: batchDoc.primaryInward?.length ?? 0,
    primaryOut: batchDoc.primaryOutward?.length ?? 0,
    secondaryIn: batchDoc.secondaryInward?.length ?? 0,
    dispatch: batchDoc.secondaryOutward?.length ?? 0,
  };
}
