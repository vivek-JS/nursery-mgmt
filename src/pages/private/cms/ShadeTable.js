import React, { useState, useEffect } from "react"
import { NetworkManager, API } from "network/core"
import { Edit2Icon, Plus, Search } from "lucide-react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
} from "@mui/material"
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
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [refresh, setRefresh] = useState(false)

  useEffect(() => {
    if (searchTerm) {
      debouncedSearchChange(searchTerm)
    }
  }, [searchTerm])

  useEffect(() => {
    getShades()
  }, [debouncedSearchTerm, page, rowsPerPage, refresh])

  const debouncedSearchChange = debounce((value) => {
    setDebouncedSearchTerm(value)
    setPage(0)
  }, 500)

  const getShades = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.SHADE.GET_SHADES)
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: debouncedSearchTerm,
      }

      const response = await instance.request({}, params)

      if (response.data?.data) {
        setShades(Array.isArray(response.data.data.data) ? response.data.data.data : [])
        setTotalCount(Number(response.data.data.pagination?.total) || 0)
      } else {
        setShades([])
        setTotalCount(0)
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
            {shades.length === 0 && !loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">
                  No shades found.
                </td>
              </tr>
            ) : null}
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
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Rows per page"
        />
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
