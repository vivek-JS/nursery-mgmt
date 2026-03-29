import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  TextField,
  Button,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  MenuItem,
  useMediaQuery,
  useTheme,
  IconButton,
  Autocomplete,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { NetworkManager, API } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import { useSelector } from "react-redux";

const defaultExpenseOptions = ["ऑफिस जेवण", "पेट्रोल", "किराणा", "इतर"];
const getLocalDateString = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function CashierPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const userData = useSelector((state) => state?.userData?.userData || state?.app?.user || {});
  const [tab, setTab] = useState(0);

  // Order payments tab state
  const [orderIdInput, setOrderIdInput] = useState("");
  const [cashAmountInput, setCashAmountInput] = useState("");
  const [remarkInput, setRemarkInput] = useState("");
  const [orderRows, setOrderRows] = useState([]);
  const [orderLookupLoading, setOrderLookupLoading] = useState(false);
  const [orderSearchLoading, setOrderSearchLoading] = useState(false);
  const [submitBulkLoading, setSubmitBulkLoading] = useState(false);
  const [orderSearchOptions, setOrderSearchOptions] = useState([]);
  const [selectedOrderOption, setSelectedOrderOption] = useState(null);

  // Itar kharch tab state
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [expenseRows, setExpenseRows] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [todayLoading, setTodayLoading] = useState(false);
  const [todaySummary, setTodaySummary] = useState({
    paymentCount: 0,
    paymentAmount: 0,
    expenseCount: 0,
    expenseAmount: 0,
    recentRows: [],
  });

  const totalOrderCash = useMemo(
    () => orderRows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [orderRows]
  );
  const totalExpenses = useMemo(
    () => expenseRows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [expenseRows]
  );

  const fetchOrderByBusinessId = async (enteredOrderId) => {
    const entered = String(enteredOrderId || "").trim();
    if (!entered) return null;
    const instance = NetworkManager(API.ORDER.GET_ORDERS);
    const response = await instance.request({}, { search: entered, limit: 50, page: 1, dispatched: false });
    const rows = response?.data?.data?.data || response?.data?.data || [];
    return (rows || []).find((o) => String(o?.orderId || "").trim() === entered) || null;
  };

  useEffect(() => {
    const entered = String(orderIdInput || "").trim();
    if (!entered || entered.length < 2) {
      setOrderSearchOptions([]);
      if (selectedOrderOption && String(selectedOrderOption?.orderId || "") !== entered) {
        setSelectedOrderOption(null);
      }
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setOrderSearchLoading(true);
        const instance = NetworkManager(API.ORDER.GET_ORDERS);
        const response = await instance.request({}, { search: entered, limit: 10, page: 1, dispatched: false });
        const rows = response?.data?.data?.data || response?.data?.data || [];
        const options = (rows || [])
          .filter((o) => o?._id && o?.orderId)
          .map((o) => ({
            _id: o._id,
            orderId: o.orderId,
            farmerName: o?.farmer?.name || "N/A",
            village: o?.farmer?.village || "N/A",
          }));
        setOrderSearchOptions(options);
      } catch (_e) {
        setOrderSearchOptions([]);
      } finally {
        setOrderSearchLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [orderIdInput, selectedOrderOption]);

  const handleAddOrderPaymentRow = async () => {
    if (!orderIdInput.trim()) return Toast.error("ऑर्डर आयडी टाका");
    if (!cashAmountInput || Number(cashAmountInput) <= 0) return Toast.error("रक्कम योग्य टाका");
    try {
      setOrderLookupLoading(true);
      const selected = selectedOrderOption
        ? {
            _id: selectedOrderOption._id,
            orderId: selectedOrderOption.orderId,
            farmer: { name: selectedOrderOption.farmerName, village: selectedOrderOption.village },
          }
        : await fetchOrderByBusinessId(orderIdInput);
      if (!selected) {
        Toast.error("ऑर्डर सापडला नाही");
        return;
      }
      if (orderRows.some((row) => row.orderMongoId === selected._id)) {
        Toast.error("हा ऑर्डर आधीच जोडला आहे");
        return;
      }
      setOrderRows((prev) => [
        ...prev,
        {
          orderMongoId: selected._id,
          orderId: selected.orderId,
          farmerName: selected?.farmer?.name || "N/A",
          village: selected?.farmer?.village || "N/A",
          amount: Number(cashAmountInput),
          remark: remarkInput || "",
        },
      ]);
      setOrderIdInput("");
      setSelectedOrderOption(null);
      setOrderSearchOptions([]);
      setCashAmountInput("");
      setRemarkInput("");
    } catch (e) {
      Toast.error(e?.response?.data?.message || "ऑर्डर लोड करण्यात समस्या");
    } finally {
      setOrderLookupLoading(false);
    }
  };

  const handleRemoveOrderRow = (index) => {
    setOrderRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitBulkOrderPayments = async () => {
    if (orderRows.length === 0) return Toast.error("किमान 1 एंट्री जोडा");
    try {
      setSubmitBulkLoading(true);
      const payload = {
        totalAmount: totalOrderCash,
        modeOfPayment: "Cash",
        source: "PLANT",
        remark: "Cashier bulk cash entry",
        allocations: orderRows.map((r) => ({
          orderId: r.orderMongoId,
          amount: Number(r.amount),
          orderType: "ORDER",
        })),
      };
      const instance = NetworkManager(API.ORDER.POST_BULK_PAYMENT);
      await instance.request(payload);
      Toast.success("Bulk cash payment एंट्री सेव झाली");
      setOrderRows([]);
      await fetchTodayEntries();
    } catch (e) {
      Toast.error(e?.response?.data?.message || "Bulk payment सेव होत नाही");
    } finally {
      setSubmitBulkLoading(false);
    }
  };

  const loadExpenseCategories = useCallback(async () => {
    try {
      const instance = NetworkManager(API.CASHIER.GET_ITAR_KHARCH_CATEGORIES);
      const response = await instance.request();
      const list = Array.isArray(response?.data) ? response.data : response?.data?.data || [];
      setExpenseCategories(list.length ? list : defaultExpenseOptions);
    } catch (_e) {
      setExpenseCategories(defaultExpenseOptions);
    }
  }, []);

  const handleAddExpenseRow = () => {
    if (!expenseCategory) return Toast.error("खर्च प्रकार निवडा");
    if (!expenseAmount || Number(expenseAmount) <= 0) return Toast.error("रक्कम योग्य टाका");
    setExpenseRows((prev) => [
      ...prev,
      {
        category: expenseCategory,
        amount: Number(expenseAmount),
        note: expenseNote || "",
      },
    ]);
    setExpenseAmount("");
    setExpenseNote("");
  };

  const handleRemoveExpenseRow = (index) => {
    setExpenseRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitExpenses = async () => {
    if (expenseRows.length === 0) return Toast.error("किमान 1 खर्च एंट्री जोडा");
    try {
      setExpenseLoading(true);
      const instance = NetworkManager(API.CASHIER.CREATE_ITAR_KHARCH_BULK);
      await instance.request({ entries: expenseRows });
      Toast.success("इतर खर्च एंट्री सेव झाली");
      setExpenseRows([]);
      await fetchTodayEntries();
    } catch (e) {
      Toast.error(e?.response?.data?.message || "इतर खर्च सेव होत नाही");
    } finally {
      setExpenseLoading(false);
    }
  };

  React.useEffect(() => {
    if (tab === 1 && !expenseCategories.length) loadExpenseCategories();
  }, [tab, expenseCategories.length, loadExpenseCategories]);

  const fetchTodayEntries = useCallback(async () => {
    const today = getLocalDateString();
    try {
      setTodayLoading(true);
      const paymentInstance = NetworkManager(API.ORDER.GET_BULK_PAYMENTS);
      const expenseInstance = NetworkManager(API.CASHIER.GET_ITAR_KHARCH_LIST);
      const [paymentResponse, expenseResponse] = await Promise.all([
        paymentInstance.request({}, { startDate: today, endDate: today, source: "PLANT", mine: true, limit: 100 }),
        expenseInstance.request({}, { startDate: today, endDate: today, mine: true, limit: 100 }),
      ]);

      const paymentPayload = paymentResponse?.data?.data || {};
      const expensePayload = expenseResponse?.data?.data || {};
      const paymentRows = Array.isArray(paymentPayload?.data) ? paymentPayload.data : [];
      const expenseRowsToday = Array.isArray(expensePayload?.data) ? expensePayload.data : [];

      const userId = String(userData?._id || "");
      const filteredPaymentRows = userId
        ? paymentRows.filter((row) => String(row?.createdBy?._id || row?.createdBy || "") === userId)
        : paymentRows;
      const filteredExpenseRows = userId
        ? expenseRowsToday.filter((row) => String(row?.createdBy?._id || row?.createdBy || "") === userId)
        : expenseRowsToday;

      const paymentAmount =
        Number(paymentPayload?.totalAmountSum) ||
        filteredPaymentRows.reduce((sum, row) => sum + Number(row?.totalAmount || 0), 0);
      const expenseAmount =
        Number(expensePayload?.totalAmountSum) ||
        filteredExpenseRows.reduce((sum, row) => sum + Number(row?.amount || 0), 0);

      const recentPaymentRows = filteredPaymentRows.map((row) => ({
        id: row?._id,
        type: "payment",
        title: row?.allocations?.[0]?.orderNumber ? `ऑर्डर ${row.allocations[0].orderNumber}` : "Bulk Payment",
        subTitle: row?.createdBy?.name || "Cashier",
        amount: Number(row?.totalAmount || 0),
        time: row?.paymentDate || row?.createdAt,
      }));
      const recentExpenseRows = filteredExpenseRows.map((row) => ({
        id: row?._id,
        type: "expense",
        title: row?.category || "इतर खर्च",
        subTitle: row?.note || "-",
        amount: Number(row?.amount || 0),
        time: row?.entryDate || row?.createdAt,
      }));

      const recentRows = [...recentPaymentRows, ...recentExpenseRows]
        .sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime())
        .slice(0, 8);

      setTodaySummary({
        paymentCount: filteredPaymentRows.length,
        paymentAmount,
        expenseCount: filteredExpenseRows.length,
        expenseAmount,
        recentRows,
      });
    } catch (_e) {
      setTodaySummary({
        paymentCount: 0,
        paymentAmount: 0,
        expenseCount: 0,
        expenseAmount: 0,
        recentRows: [],
      });
    } finally {
      setTodayLoading(false);
    }
  }, [userData?._id]);

  useEffect(() => {
    fetchTodayEntries();
  }, [fetchTodayEntries]);

  return (
    <Box sx={{ p: isMobile ? 1 : 2 }}>
      <Paper sx={{ p: isMobile ? 1.2 : 2, borderRadius: 2 }}>
        <Typography sx={{ fontWeight: 800, fontSize: isMobile ? "1rem" : "1.1rem", mb: 1 }}>
          कॅशियर पॅनेल
        </Typography>
        <Tabs value={tab} onChange={(_, next) => setTab(next)} variant={isMobile ? "fullWidth" : "standard"}>
          <Tab label="ऑर्डर पेमेंट" />
          <Tab label="इतर खर्च" />
        </Tabs>
      </Paper>
      <Paper sx={{ mt: 1.2, p: isMobile ? 1.1 : 1.6, borderRadius: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography sx={{ fontWeight: 800 }}>आजच्या नोंदी</Typography>
          <Button size="small" onClick={fetchTodayEntries} disabled={todayLoading}>
            Refresh
          </Button>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 1 }}>
          <Box sx={{ p: 1, borderRadius: 1, bgcolor: "rgba(25,118,210,0.1)" }}>
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>पेमेंट एंट्री</Typography>
            <Typography sx={{ fontWeight: 800 }}>{todaySummary.paymentCount}</Typography>
          </Box>
          <Box sx={{ p: 1, borderRadius: 1, bgcolor: "rgba(25,118,210,0.1)" }}>
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>पेमेंट एकूण</Typography>
            <Typography sx={{ fontWeight: 800 }}>₹{Number(todaySummary.paymentAmount).toLocaleString()}</Typography>
          </Box>
          <Box sx={{ p: 1, borderRadius: 1, bgcolor: "rgba(255,152,0,0.12)" }}>
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>खर्च एंट्री</Typography>
            <Typography sx={{ fontWeight: 800 }}>{todaySummary.expenseCount}</Typography>
          </Box>
          <Box sx={{ p: 1, borderRadius: 1, bgcolor: "rgba(255,152,0,0.12)" }}>
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>खर्च एकूण</Typography>
            <Typography sx={{ fontWeight: 800 }}>₹{Number(todaySummary.expenseAmount).toLocaleString()}</Typography>
          </Box>
        </Box>
        <Divider sx={{ my: 1 }} />
        <Typography sx={{ fontWeight: 700, mb: 0.8, fontSize: "0.85rem" }}>आजचे अलीकडील रेकॉर्ड</Typography>
        {todaySummary.recentRows.length ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>प्रकार</TableCell>
                <TableCell>तपशील</TableCell>
                <TableCell align="right">रक्कम</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {todaySummary.recentRows.map((row) => (
                <TableRow key={`${row.type}-${row.id}`}>
                  <TableCell>{row.type === "payment" ? "पेमेंट" : "खर्च"}</TableCell>
                  <TableCell>
                    {row.title}
                    <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{row.subTitle}</Typography>
                  </TableCell>
                  <TableCell align="right">₹{Number(row.amount).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Typography sx={{ color: "text.secondary", fontSize: "0.85rem" }}>आजची एंट्री नाही</Typography>
        )}
      </Paper>

      {tab === 0 && (
        <Paper sx={{ mt: 1.5, p: isMobile ? 1.2 : 2, borderRadius: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>ऑर्डर पेमेंट एंट्री</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr auto", gap: 1 }}>
            <Autocomplete
              size="small"
              options={orderSearchOptions}
              loading={orderSearchLoading}
              value={selectedOrderOption}
              inputValue={orderIdInput}
              onInputChange={(_, nextInput) => setOrderIdInput(nextInput || "")}
              onChange={(_, selected) => {
                setSelectedOrderOption(selected || null);
                if (selected?.orderId) {
                  setOrderIdInput(selected.orderId);
                }
              }}
              getOptionLabel={(option) => option?.orderId || ""}
              isOptionEqualToValue={(option, value) => option?._id === value?._id}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option._id}>
                  {option.orderId} - {option.farmerName} ({option.village})
                </Box>
              )}
              renderInput={(params) => <TextField {...params} label="ऑर्डर आयडी शोधा" />}
            />
            <TextField label="कॅश रक्कम" type="number" value={cashAmountInput} onChange={(e) => setCashAmountInput(e.target.value)} size="small" />
            <TextField label="टिप्पणी (ऐच्छिक)" value={remarkInput} onChange={(e) => setRemarkInput(e.target.value)} size="small" />
            <Button variant="contained" onClick={handleAddOrderPaymentRow} disabled={orderLookupLoading}>
              जोडा
            </Button>
          </Box>
          {selectedOrderOption && (
            <Box sx={{ mt: 1, px: 1, py: 0.75, borderRadius: 1, bgcolor: "rgba(25,118,210,0.08)" }}>
              <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
                शेतकरी: {selectedOrderOption.farmerName} | गाव: {selectedOrderOption.village}
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 1.5 }} />
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ऑर्डर</TableCell>
                <TableCell>शेतकरी</TableCell>
                <TableCell>गाव</TableCell>
                <TableCell align="right">रक्कम</TableCell>
                <TableCell align="right">काढा</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orderRows.map((row, i) => (
                <TableRow key={`${row.orderId}-${i}`}>
                  <TableCell>{row.orderId}</TableCell>
                  <TableCell>{row.farmerName}</TableCell>
                  <TableCell>{row.village}</TableCell>
                  <TableCell align="right">₹{Number(row.amount).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="error" onClick={() => handleRemoveOrderRow(i)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {orderRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography sx={{ color: "text.secondary", fontSize: "0.85rem" }}>एंट्री नाही</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Box sx={{ mt: 1.2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography sx={{ fontWeight: 700 }}>एकूण कॅश: ₹{totalOrderCash.toLocaleString()}</Typography>
            <Button variant="contained" color="success" disabled={submitBulkLoading || !orderRows.length} onClick={handleSubmitBulkOrderPayments}>
              अंतिम सबमिट
            </Button>
          </Box>
          <Typography sx={{ mt: 1, color: "text.secondary", fontSize: "0.8rem" }}>
            नोंद: ही नोंद `Pending` म्हणून सेव होईल. अंतिम मंजुरी Accountant/Super Admin कडून होईल.
          </Typography>
        </Paper>
      )}

      {tab === 1 && (
        <Paper sx={{ mt: 1.5, p: isMobile ? 1.2 : 2, borderRadius: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>इतर खर्च एंट्री</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr auto", gap: 1 }}>
            <TextField select label="खर्च प्रकार" value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} size="small">
              {(expenseCategories.length ? expenseCategories : defaultExpenseOptions).map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="रक्कम" type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} size="small" />
            <TextField label="टिप्पणी" value={expenseNote} onChange={(e) => setExpenseNote(e.target.value)} size="small" />
            <Button variant="contained" onClick={handleAddExpenseRow}>
              जोडा
            </Button>
          </Box>

          <Divider sx={{ my: 1.5 }} />
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>प्रकार</TableCell>
                <TableCell>टिप्पणी</TableCell>
                <TableCell align="right">रक्कम</TableCell>
                <TableCell align="right">काढा</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenseRows.map((row, i) => (
                <TableRow key={`${row.category}-${i}`}>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>{row.note || "-"}</TableCell>
                  <TableCell align="right">₹{Number(row.amount).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="error" onClick={() => handleRemoveExpenseRow(i)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {expenseRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography sx={{ color: "text.secondary", fontSize: "0.85rem" }}>एंट्री नाही</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Box sx={{ mt: 1.2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography sx={{ fontWeight: 700 }}>एकूण खर्च: ₹{totalExpenses.toLocaleString()}</Typography>
            <Button variant="contained" color="success" disabled={expenseLoading || !expenseRows.length} onClick={handleSubmitExpenses}>
              अंतिम सबमिट
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
}

