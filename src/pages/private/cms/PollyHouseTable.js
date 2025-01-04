import React, { useState, useEffect } from "react"
import { Edit2Icon, Plus, Search } from "lucide-react"
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material"
import { NetworkManager, API } from "network/core"
import { PageLoader } from "components"
import debounce from "lodash.debounce"

const PollyHouseTable = () => {
  const [houses, setHouses] = useState([])
  const [loading, setLoading] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingHouse, setEditingHouse] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    location: ""
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [refresh, setRefresh] = useState(false)

  useEffect(() => {
    const debouncedSearch = debounce((value) => {
      setDebouncedSearchTerm(value)
      setCurrentPage(1)
    }, 500)

    if (searchTerm) {
      debouncedSearch(searchTerm)
    }

    return () => debouncedSearch.cancel()
  }, [searchTerm])

  useEffect(() => {
    getPollyHouses()
  }, [debouncedSearchTerm, currentPage, refresh])

  const getPollyHouses = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.POLLY_HOUSE.GET_HOUSES)
      const response = await instance.request(
        {},
        {
          page: currentPage,
          limit: 10,
          search: debouncedSearchTerm
        }
      )

      if (response.data?.data) {
        setHouses(response.data.data.data)
        setTotalPages(Math.ceil(response.data.data.pagination.total / 10))
      }
    } catch (error) {
      console.error("Error fetching polly houses:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const instance = NetworkManager(
        editingHouse ? API.POLLY_HOUSE.UPDATE_HOUSE : API.POLLY_HOUSE.CREATE_HOUSE
      )
      const payload = editingHouse ? { ...formData, id: editingHouse._id } : formData

      const response = await instance.request(payload)

      if (response.data) {
        setIsFormOpen(false)
        setEditingHouse(null)
        setFormData({ name: "", location: "" })
        setRefresh(!refresh)
      }
    } catch (error) {
      console.error("Error saving polly house:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusToggle = async (id, currentStatus) => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.POLLY_HOUSE.TOGGLE_STATUS)
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

  return (
    <div className="p-6">
      {loading && <PageLoader />}

      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-4 w-1/3">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search polly houses..."
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
          Add Polly House
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
                Capacity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
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
            {houses.map((house) => (
              <tr key={house._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">{house.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{house.location}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleStatusToggle(house._id, house.isActive)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      house.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                    {house.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={() => {
                      setEditingHouse(house)
                      setFormData({
                        name: house.name,
                        location: house.location
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
        {/* Pagination */}
        <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Page <span className="font-medium">{currentPage}</span> of{" "}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (page) => page === 1 || page === totalPages || Math.abs(currentPage - page) <= 1
                  )
                  .map((page, index, array) => (
                    <React.Fragment key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                          ...
                        </span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                        }`}>
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingHouse(null)
          setFormData({ name: "", location: "" })
        }}
        maxWidth="sm"
        fullWidth>
        <DialogTitle className="bg-gray-50">
          {editingHouse ? "Edit Polly House" : "Add New Polly House"}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent className="mt-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">House Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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
                setEditingHouse(null)
                setFormData({ name: "", location: "" })
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md">
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">
              {editingHouse ? "Update" : "Create"}
            </button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  )
}

export default PollyHouseTable
