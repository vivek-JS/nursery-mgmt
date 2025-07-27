import React, { useState, useEffect } from "react"
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer"
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material"
import { FileText, Download, Printer } from "lucide-react"

// Register fonts
Font.register({
  family: "DejaVu Sans",
  src: "https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxK.ttf"
})

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 30,
    fontFamily: "DejaVu Sans"
  },
  header: {
    marginBottom: 20,
    borderBottom: "2px solid #1f2937",
    paddingBottom: 10
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#1f2937"
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#6b7280",
    marginBottom: 10
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#374151"
  },
  infoValue: {
    fontSize: 12,
    color: "#1f2937"
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#1f2937",
    borderBottom: "1px solid #d1d5db",
    paddingBottom: 5
  },
  table: {
    display: "table",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderColor: "#d1d5db"
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row"
  },
  tableColHeader: {
    width: "25%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: "#d1d5db",
    backgroundColor: "#f3f4f6"
  },
  tableCol: {
    width: "25%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: "#d1d5db"
  },
  tableCellHeader: {
    margin: "auto",
    marginTop: 5,
    fontSize: 10,
    fontWeight: "bold",
    color: "#374151",
    textAlign: "center"
  },
  tableCell: {
    margin: "auto",
    marginTop: 5,
    fontSize: 10,
    color: "#1f2937",
    textAlign: "center"
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    paddingTop: 10,
    borderTop: "2px solid #d1d5db"
  },
  totalItem: {
    flexDirection: "column",
    alignItems: "center"
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 5
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1f2937"
  },
  pageBreak: {
    pageBreakBefore: "always"
  }
})

const EnhancedDeliveryChallan = ({ open, onClose, dispatchData }) => {
  const [groupedOrders, setGroupedOrders] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && dispatchData) {
      groupOrdersByFarmer()
    }
  }, [open, dispatchData])

  const groupOrdersByFarmer = () => {
    if (!dispatchData?.orderIds) return

    const grouped = {}

    dispatchData.orderIds.forEach((order) => {
      const farmerId = order.details?.farmer?._id || order.details?.farmer?.mobileNumber
      const farmerName = order.details?.farmer?.name || "Unknown Farmer"

      if (!grouped[farmerId]) {
        grouped[farmerId] = {
          farmerId,
          farmerName,
          mobileNumber: order.details?.farmer?.mobileNumber || "",
          village: order.details?.farmer?.village || "",
          orders: [],
          totalAmount: 0,
          paidAmount: 0,
          remainingAmount: 0
        }
      }

      grouped[farmerId].orders.push(order)
      grouped[farmerId].totalAmount += order.total || 0
      grouped[farmerId].paidAmount += order.PaidAmt || 0
      grouped[farmerId].remainingAmount += order.remainingAmt || 0
    })

    setGroupedOrders(grouped)
  }

  const FarmerPage = ({ farmerData, isFirstPage = false }) => (
    <Page size="A4" style={[styles.page, !isFirstPage && styles.pageBreak]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Delivery Challan / डिलिवरी चलन</Text>
        <Text style={styles.subtitle}>
          Dispatch #{dispatchData?.transportId} • {dispatchData?.driverName}
        </Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date: {new Date().toLocaleDateString("en-IN")}</Text>
          <Text style={styles.infoValue}>Page {isFirstPage ? "1" : "2"}</Text>
        </View>
      </View>

      {/* Farmer Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Farmer Details / शेतकरी तपशील</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name / नाव:</Text>
          <Text style={styles.infoValue}>{farmerData.farmerName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mobile / मोबाईल:</Text>
          <Text style={styles.infoValue}>{farmerData.mobileNumber}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Village / गाव:</Text>
          <Text style={styles.infoValue}>{farmerData.village}</Text>
        </View>
      </View>

      {/* Plant Details Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Plant Details / रोपांचे तपशील</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Order #</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Plant Type</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Quantity</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Rate</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Total</Text>
            </View>
          </View>

          {farmerData.orders.map((order, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>#{order.order}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{order.plantType}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{order.quantity?.toLocaleString()}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>₹{order.rate?.toLocaleString()}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>₹{order.total?.toLocaleString()}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Payment Details Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Details / पेमेंट तपशील</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Order #</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Total Amount</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Paid Amount</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>Remaining</Text>
            </View>
          </View>

          {farmerData.orders.map((order, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>#{order.order}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>₹{order.total?.toLocaleString()}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>₹{order.PaidAmt?.toLocaleString() || 0}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>₹{order.remainingAmt?.toLocaleString() || 0}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Totals */}
      <View style={styles.totalsRow}>
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>Total Amount / एकूण रक्कम</Text>
          <Text style={styles.totalValue}>₹{farmerData.totalAmount?.toLocaleString()}</Text>
        </View>
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>Paid Amount / भरलेली रक्कम</Text>
          <Text style={[styles.totalValue, { color: "#059669" }]}>
            ₹{farmerData.paidAmount?.toLocaleString()}
          </Text>
        </View>
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>Remaining Amount / उर्वरित रक्कम</Text>
          <Text style={[styles.totalValue, { color: "#dc2626" }]}>
            ₹{farmerData.remainingAmount?.toLocaleString()}
          </Text>
        </View>
      </View>
    </Page>
  )

  const DeliveryChallanDocument = () => (
    <Document>
      {Object.values(groupedOrders).map((farmerData, index) => (
        <FarmerPage key={farmerData.farmerId} farmerData={farmerData} isFirstPage={index === 0} />
      ))}
    </Document>
  )

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        className: "max-h-[90vh] overflow-y-auto"
      }}>
      <DialogTitle className="bg-green-50 border-b border-green-100 flex items-center gap-2">
        <FileText className="text-green-600" size={24} />
        <span className="text-green-800">Enhanced Delivery Challan</span>
      </DialogTitle>

      <DialogContent className="space-y-4 mt-4">
        {Object.values(groupedOrders).length > 0 ? (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Dispatch Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Transport ID:</span>
                  <div className="font-medium">{dispatchData?.transportId}</div>
                </div>
                <div>
                  <span className="text-blue-700">Driver:</span>
                  <div className="font-medium">{dispatchData?.driverName}</div>
                </div>
                <div>
                  <span className="text-blue-700">Total Orders:</span>
                  <div className="font-medium">{dispatchData?.orderIds?.length || 0}</div>
                </div>
                <div>
                  <span className="text-blue-700">Farmers:</span>
                  <div className="font-medium">{Object.keys(groupedOrders).length}</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Farmer Groups</h3>
              <div className="space-y-3">
                {Object.values(groupedOrders).map((farmerData) => (
                  <div
                    key={farmerData.farmerId}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{farmerData.farmerName}</h4>
                        <p className="text-sm text-gray-500">
                          {farmerData.mobileNumber} • {farmerData.village}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          {farmerData.orders.length} orders
                        </div>
                        <div className="font-semibold text-gray-900">
                          ₹{farmerData.totalAmount?.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Total:</span>
                        <div className="font-medium">
                          ₹{farmerData.totalAmount?.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Paid:</span>
                        <div className="font-medium text-green-600">
                          ₹{farmerData.paidAmount?.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Remaining:</span>
                        <div className="font-medium text-red-600">
                          ₹{farmerData.remainingAmount?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="text-gray-400 mx-auto mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
            <p className="text-gray-500">No orders are available for this dispatch.</p>
          </div>
        )}
      </DialogContent>

      <DialogActions className="bg-gray-50 px-6 py-4">
        <Button
          onClick={onClose}
          variant="outlined"
          className="border-gray-300 text-gray-700 hover:bg-gray-50">
          Close
        </Button>
        {Object.values(groupedOrders).length > 0 && (
          <Button
            variant="contained"
            className="bg-green-600 text-white hover:bg-green-700"
            startIcon={<Download />}>
            Download PDF
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default EnhancedDeliveryChallan
