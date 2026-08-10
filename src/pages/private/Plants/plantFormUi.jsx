import React from "react"

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export const emptySubtypeValues = {
  name: "",
  description: "",
  rates: [""],
  monthlyRates: [],
  raisingRate: 0,
  buffer: 0,
  plantReadyDays: 0,
  slotDays: "",
  slotStartDate: "",
  slotEndDate: "",
  slotCapacity: "",
  isBillable: true,
}

export const Button = ({ children, variant = "default", size = "default", className = "", ...props }) => {
  const baseStyles =
    "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:pointer-events-none disabled:opacity-50 transform hover:scale-105 active:scale-95"
  const variants = {
    default: "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-purple-700",
    outline: "border-2 border-gray-200 bg-white/80 backdrop-blur-sm hover:bg-white hover:border-blue-300 hover:text-blue-600 shadow-md hover:shadow-lg",
    danger: "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg hover:shadow-xl hover:from-red-600 hover:to-pink-600",
    success: "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:shadow-xl hover:from-green-600 hover:to-emerald-600",
  }
  const sizes = {
    default: "h-11 px-6 py-2 text-sm",
    sm: "h-9 rounded-lg px-4 text-xs",
    lg: "h-12 px-8 py-3 text-base",
  }

  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export const Dialog = ({ open, onOpenChange, children, maxWidth = "max-w-2xl" }) =>
  open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className={`z-50 w-full ${maxWidth} rounded-3xl bg-white/95 backdrop-blur-xl p-6 shadow-2xl border border-white/20 animate-in fade-in-0 zoom-in-95 duration-300`}>
        {children}
      </div>
    </div>
  ) : null

export const DialogContent = ({ children, ...props }) => (
  <div className="max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" {...props}>
    {children}
  </div>
)

export const DialogHeader = ({ children }) => <div className="mb-6">{children}</div>

export const DialogTitle = ({ children }) => (
  <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{children}</h2>
)

export const DialogFooter = ({ children }) => (
  <div className="mt-6 flex justify-end space-x-3">{children}</div>
)

export const Input = ({ className = "", error, touched, ...props }) => (
  <div className="space-y-1">
    <input
      className={`flex h-12 w-full rounded-xl border-2 bg-white/80 backdrop-blur-sm px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50 hover:shadow-xl ${
        error && touched ? "border-red-400 focus-visible:ring-red-500/50" : "border-gray-200 hover:border-gray-300"
      } ${className}`}
      {...props}
    />
    {error && touched && <div className="text-xs text-red-500 font-medium animate-in slide-in-from-top-1 duration-200">{error}</div>}
  </div>
)

export const Label = ({ className = "", ...props }) => (
  <label
    className={`text-sm font-semibold text-gray-700 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
    {...props}
  />
)
