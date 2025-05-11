import React, { useState, useEffect } from "react"
import { X, Calendar } from "lucide-react"
import { API, NetworkManager } from "network/core"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import moment from "moment"

// Custom styles for the DatePicker - add this to your CSS file or as a styled component
const datePickerStyles = `
  .custom-datepicker {
    width: 100%;
    padding: 0.5rem;
    border-radius: 0.375rem;
    border: 1px solid #e5e7eb;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .custom-datepicker:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
  }

  .react-datepicker {
    font-family: inherit;
    border-radius: 0.5rem;
    border: none;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  .react-datepicker__header {
    background-color: #3b82f6;
    border-bottom: none;
    border-top-left-radius: 0.5rem;
    border-top-right-radius: 0.5rem;
    padding-top: 0.75rem;
  }

  .react-datepicker__day-name, .react-datepicker__day {
    width: 2rem;
    line-height: 2rem;
    margin: 0.166rem;
  }

  .react-datepicker__current-month {
    color: white;
    font-weight: 600;
    font-size: 1rem;
  }

  .react-datepicker__day-name {
    color: rgba(255, 255, 255, 0.8);
  }

  .react-datepicker__day--selected {
    background-color: #3b82f6;
    border-radius: 0.25rem;
  }

  .react-datepicker__day--keyboard-selected {
    background-color: rgba(59, 130, 246, 0.5);
    border-radius: 0.25rem;
  }

  .react-datepicker__day:hover {
    background-color: rgba(59, 130, 246, 0.1);
    border-radius: 0.25rem;
  }

  .react-datepicker__navigation {
    top: 0.75rem;
  }

  .react-datepicker__navigation--previous {
    left: 1rem;
  }

  .react-datepicker__navigation--next {
    right: 1rem;
  }

  .date-picker-wrapper {
    position: relative;
  }

  .calendar-icon {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #6b7280;
    pointer-events: none;
  }
`

const AddManualSlotModal = ({ isOpen, onClose, plants, selectedYear, onSuccess }) => {
  const [selectedPlant, setSelectedPlant] = useState("")
  const [selectedSubtype, setSelectedSubtype] = useState("")
  const [startDate, setStartDate] = useState(new Date())
  const [endDate, setEndDate] = useState(new Date())
  const [totalPlants, setTotalPlants] = useState(0)
  const [subtypes, setSubtypes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    // Reset subtype when plant changes
    setSelectedSubtype("")

    // Update subtypes based on selected plant
    if (selectedPlant) {
      const plant = plants.find((p) => p._id === selectedPlant)
      if (plant) {
        setSubtypes(plant.subtypes)
      } else {
        setSubtypes([])
      }
    } else {
      setSubtypes([])
    }
  }, [selectedPlant, plants])

  // Enhanced date picker component with custom styles
  const CustomDatePickerInput = React.forwardRef(({ value, onClick, label, placeholder }, ref) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="date-picker-wrapper">
        <input
          className="custom-datepicker"
          onClick={onClick}
          ref={ref}
          value={value}
          placeholder={placeholder}
          readOnly
        />
        <div className="calendar-icon">
          <Calendar className="w-5 h-5" />
        </div>
      </div>
    </div>
  ))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    // Validate form
    if (!selectedPlant || !selectedSubtype || !startDate || !endDate || totalPlants <= 0) {
      setError("Please fill all the fields correctly")
      return
    }

    // Validate dates
    if (endDate < startDate) {
      setError("End date must be after start date")
      return
    }

    // Format dates to dd-mm-yyyy
    const formattedStartDate = moment(startDate).format("DD-MM-YYYY")
    const formattedEndDate = moment(endDate).format("DD-MM-YYYY")

    setLoading(true)
    try {
      const instance = NetworkManager(API.slots.ADD_MANUAL_SLOT)
      const payload = {
        plantId: selectedPlant,
        subtypeId: selectedSubtype,
        startDay: formattedStartDate,
        endDay: formattedEndDate,
        totalPlants: parseInt(totalPlants)
      }

      const response = await instance.request(payload)

      if (response?.data?.success) {
        setSuccess("Slot added successfully")
        // Reset form
        setSelectedPlant("")
        setSelectedSubtype("")
        setStartDate(new Date())
        setEndDate(new Date())
        setTotalPlants(0)

        // Call success callback after a brief delay
        setTimeout(() => {
          onSuccess()
        }, 1500)
      } else {
        setError(response?.data?.message || "Failed to add slot")
      }
    } catch (error) {
      setError(error.message || "An error occurred")
      console.error("Error adding manual slot:", error)
    }
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <style>{datePickerStyles}</style>
      <div className="bg-white rounded-lg w-full max-w-md overflow-hidden shadow-xl">
        {/* Modal Header */}
        <div className="bg-blue-600 px-4 py-3 flex justify-between items-center">
          <h3 className="text-lg font-medium text-white">Add Manual Slot</h3>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded-full p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md flex items-center">
              <span className="text-sm">{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Plant Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Plant</label>
              <select
                value={selectedPlant}
                onChange={(e) => setSelectedPlant(e.target.value)}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 bg-white"
                required>
                <option value="">Select a plant</option>
                {plants.map((plant) => (
                  <option key={plant._id} value={plant._id}>
                    {plant.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subtype Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtype</label>
              <select
                value={selectedSubtype}
                onChange={(e) => setSelectedSubtype(e.target.value)}
                disabled={!selectedPlant}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                required>
                <option value="">Select a subtype</option>
                {subtypes.map((subtype) => (
                  <option key={subtype._id} value={subtype._id}>
                    {subtype.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date - Enhanced */}
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              dateFormat="dd-MM-yyyy"
              customInput={
                <CustomDatePickerInput label="Start Date" placeholder="Select start date" />
              }
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              popperClassName="date-picker-popper"
              popperPlacement="bottom-start"
              required
            />

            {/* End Date - Enhanced */}
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              dateFormat="dd-MM-yyyy"
              minDate={startDate}
              customInput={<CustomDatePickerInput label="End Date" placeholder="Select end date" />}
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              popperClassName="date-picker-popper"
              popperPlacement="bottom-start"
              required
            />

            {/* Total Plants */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Plants</label>
              <input
                type="number"
                min="1"
                value={totalPlants}
                onChange={(e) => setTotalPlants(e.target.value)}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 px-4 rounded-md text-white font-medium transition-all duration-200 ${
                loading
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              }`}>
              {loading ? "Adding..." : "Add Slot"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddManualSlotModal
