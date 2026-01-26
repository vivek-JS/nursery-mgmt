import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Package } from 'lucide-react';
import axiosInstance from '../../../services/axiosConfig';
import { formatDisplayDate } from '../../../utils/dateUtils';

const OutwardDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [outward, setOutward] = useState(null);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    fetchOutward();
  }, [id]);

  const fetchOutward = async () => {
    try {
      const response = await axiosInstance.get(`/inventory/outward/${id}`);
      if (response.data.success) {
        setOutward(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching outward:', error);
      alert('Error loading outward details');
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async () => {
    if (!window.confirm('Issue this stock? This will reduce inventory.')) return;

    setIssuing(true);
    try {
      await axiosInstance.post(`/inventory/outward/${id}/issue`);
      alert('Stock issued successfully! Inventory has been updated.');
      fetchOutward();
    } catch (error) {
      console.error('Error issuing stock:', error);
      alert(error.response?.data?.message || 'Error issuing stock');
    } finally {
      setIssuing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!outward) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <p className="text-xl text-gray-600">Outward entry not found</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      issued: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/u/inventory/outward')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Outward List</span>
          </button>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-start">
              <div className="flex items-start space-x-4">
                <div className="p-4 bg-orange-100 rounded-xl">
                  <Send className="w-10 h-10 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">{outward.outwardNumber}</h1>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(outward.status)}`}>
                      {outward.status.toUpperCase()}
                    </span>
                    <span className="text-gray-600">
                      {formatDisplayDate(outward.outwardDate)}
                    </span>
                  </div>
                </div>
              </div>

              {outward.status === 'draft' && (
                <button
                  onClick={handleIssue}
                  disabled={issuing}
                  className="flex items-center space-x-2 bg-orange-500 text-white px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                  <span>{issuing ? 'Issuing...' : 'Issue Stock'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Outward Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Purpose</p>
                <p className="font-semibold text-gray-800 capitalize">{outward.purpose}</p>
              </div>
              {outward.purposeDetails && (
                <div>
                  <p className="text-sm text-gray-500">Purpose Details</p>
                  <p className="font-semibold text-gray-800">{outward.purposeDetails}</p>
                </div>
              )}
              {outward.department && (
                <div>
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="font-semibold text-gray-800">{outward.department}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Recipient Details</h2>
            <div className="space-y-3">
              {outward.recipientName && (
                <div>
                  <p className="text-sm text-gray-500">Recipient Name</p>
                  <p className="font-semibold text-gray-800">{outward.recipientName}</p>
                </div>
              )}
              {outward.recipientPhone && (
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-semibold text-gray-800">{outward.recipientPhone}</p>
                </div>
              )}
              {outward.destination && (
                <div>
                  <p className="text-sm text-gray-500">Destination</p>
                  <p className="font-semibold text-gray-800">{outward.destination}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Package className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-800">Items ({outward.items?.length || 0})</h2>
          </div>
          <div className="space-y-3">
            {outward.items?.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500">Product</p>
                    <p className="font-semibold text-gray-800">{item.product?.name || 'N/A'}</p>
                    <p className="text-xs text-gray-500">Batch: {item.batch?.batchNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Quantity</p>
                    <p className="font-semibold text-gray-800">
                      {item.quantity} {item.unit?.abbreviation}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        {outward.notes && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="font-semibold text-gray-800 mb-2">Notes</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{outward.notes}</p>
          </div>
        )}

        {/* Issue Information */}
        {outward.status === 'issued' && outward.issuedBy && (
          <div className="bg-green-50 rounded-2xl shadow-lg p-6 mt-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Issue Information</h2>
            <p className="text-gray-700">
              Issued by: {outward.issuedBy.name} on{' '}
              {formatDisplayDate(outward.issuedDate)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutwardDetails;


