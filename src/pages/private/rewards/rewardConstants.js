export const PRESET_IMAGES = [
  { id: "trophy", label: "Trophy", src: "/rewards/milestone-trophy.jpg" },
  { id: "star", label: "Star", src: "/rewards/milestone-star.jpg" },
  { id: "medal", label: "Medal", src: "/rewards/milestone-medal.jpg" },
  { id: "rocket", label: "Rocket", src: "/rewards/milestone-rocket.jpg" },
]

export const THEMES = [
  { id: "joy", label: "Joy", className: "rw-gradient-joy" },
  { id: "cool", label: "Cool", className: "rw-gradient-cool" },
  { id: "sunrise", label: "Sunrise", className: "rw-gradient-sunrise" },
]

export const AUDIENCE_ROLE_OPTIONS = [
  { value: "DEALER", label: "Dealer" },
  { value: "SALES", label: "Sales employee" },
  { value: "RAM_AGRI_SALES", label: "Ram Agri sales" },
  { value: "RAM_AGRI_SALES_MANAGER", label: "Ram Agri sales manager" },
  { value: "RAM_AGRI_SALES_OFFICE_MANAGER", label: "Ram Agri office manager" },
  { value: "AGRI_INPUT_DEALER", label: "Agri input dealer" },
]

export const PROGRESS_METRIC_OPTIONS = [
  { value: "order_count", label: "Order count" },
  { value: "plants_sold", label: "Plants sold" },
  { value: "order_value", label: "Order value (₹)" },
  { value: "manual", label: "Manual only" },
]

export const emptyMilestone = () => ({
  id: "",
  title: "",
  description: "",
  target: 100,
  reward: "",
  imageKey: "medal",
  image: PRESET_IMAGES[2].src,
})

export const emptyProgram = () => ({
  id: "",
  name: "",
  audience: "",
  audienceLabel: "",
  targetRoles: ["DEALER"],
  theme: "joy",
  unit: "orders",
  progressMetric: "order_count",
  isActive: true,
  milestones: [],
})

export const themeClass = (themeId) =>
  THEMES.find((t) => t.id === themeId)?.className ?? "rw-gradient-joy"

export const imageSrcFromKey = (key) =>
  PRESET_IMAGES.find((p) => p.id === key)?.src ?? PRESET_IMAGES[2].src
