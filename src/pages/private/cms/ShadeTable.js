import React, { useState, useEffect } from "react"
import { NetworkManager, API } from "network/core"
import { Edit2Icon, Plus, Search } from "lucide-react"
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material"
import { PageLoader } from "components"
import debounce from "lodash.debounce"

const ShadeTable = () => {
  const [shades, setShades] = useState([])
  const [loading, setLoading] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingShade, setEditingShade] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    number: ""
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [refresh, setRefresh] = useState(false)

  useEffect(() => {
    if (searchTerm) {
      debouncedSearchChange(searchTerm)
    }
  }, [searchTerm])

  useEffect(() => {
    getShades()
  }, [debouncedSearchTerm, currentPage, refresh])

  const debouncedSearchChange = debounce((value) => {
    setDebouncedSearchTerm(value)
    setCurrentPage(1) // Reset to first page on new search
  }, 500)

  const getShades = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.SHADE.GET_SHADES)
      const params = {
        page: currentPage,
        limit: 10,
        search: debouncedSearchTerm
      }

      const response = await instance.request({}, params)

      if (response.data?.data) {
        setShades(response.data.data.data)
        setTotalPages(Math.ceil(response.data.data.pagination.total / 10))
      }
    } catch (error) {
      console.error("Error fetching shades:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const instance = NetworkManager(
        editingShade ? API.SHADE.UPDATE_SHADE : API.SHADE.CREATE_SHADE
      )
      const payload = editingShade ? { ...formData, id: editingShade._id } : formData

      const response = await instance.request(payload)

      if (response.data) {
        setIsFormOpen(false)
        setEditingShade(null)
        setFormData({ name: "", number: "" })
        setRefresh(!refresh)
      }
    } catch (error) {
      console.error("Error saving shade:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusToggle = async (id, currentStatus) => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.SHADE.TOGGLE_STATUS)
      await instance.request({
        id,
        isActive: !currentStatus
      })
      setRefresh(!refresh)
    } catch (error) {
      console.error("Error toggling status:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePaginationClick = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  return (
    <div className="p-6">
      {loading && <PageLoader />}

      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-4 w-1/3">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search shades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-md pl-10"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <Plus size={20} />
          Add Shade
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {shades.map((shade) => (
              <tr key={shade._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">{shade.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{shade.number}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleStatusToggle(shade._id, shade.isActive)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      shade.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                    {shade.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={() => {
                      setEditingShade(shade)
                      setFormData({
                        name: shade.name,
                        number: shade.number
                      })
                      setIsFormOpen(true)
                    }}
                    className="text-indigo-600 hover:text-indigo-900 mr-4">
                    <Edit2Icon size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex justify-center">
        <nav className="flex items-center space-x-2">
          <button
            onClick={() => handlePaginationClick(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded-md bg-white border disabled:opacity-50">
            Previous
          </button>
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index + 1}
              onClick={() => handlePaginationClick(index + 1)}
              className={`px-3 py-1 rounded-md ${
                currentPage === index + 1 ? "bg-blue-600 text-white" : "bg-white border"
              }`}>
              {index + 1}
            </button>
          ))}
          <button
            onClick={() => handlePaginationClick(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded-md bg-white border disabled:opacity-50">
            Next
          </button>
        </nav>
      </div>

      {/* Form Dialog */}
      <Dialog
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingShade(null)
          setFormData({ name: "", number: "" })
        }}
        maxWidth="sm"
        fullWidth>
        <DialogTitle className="bg-gray-50">
          {editingShade ? "Edit Shade" : "Add New Shade"}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent className="mt-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Shade Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Shade Number</label>
                <input
                  type="text"
                  required
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>
            </div>
          </DialogContent>
          <DialogActions className="p-4 border-t">
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false)
                setEditingShade(null)
                setFormData({ name: "", number: "" })
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md">
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">
              {editingShade ? "Update" : "Create"}
            </button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  )
}

export default ShadeTable
