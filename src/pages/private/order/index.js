import React, { useState } from 'react';
import { Grid, Button, TextField, Chip } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import format from 'date-fns/format';

const sampleOrders = [
    {
        _id: '1',
        farmer: {
            _id: 'f1',
            name: 'Rajesh Kumar'
        },
        typeOfPlants: 'Mango',
        numberOfPlants: 100,
        modeOfPayment: 'UPI',
        rate: 250,
        advance: 5000,
        dateOfAdvance: new Date('2024-01-15'),
        bankName: 'SBI',
        receiptPhoto: 'receipt1.jpg',
        paymentStatus: 'FULL',
        payment: [
            { paidAmount: 25000, createdAt: new Date('2024-01-15') }
        ]
    },
    {
        _id: '2',
        farmer: {
            _id: 'f2',
            name: 'Suresh Patel'
        },
        typeOfPlants: 'Apple',
        numberOfPlants: 75,
        modeOfPayment: 'CASH',
        rate: 300,
        advance: 3000,
        dateOfAdvance: new Date('2024-02-01'),
        paymentStatus: 'PARTIAL',
        payment: [
            { paidAmount: 3000, createdAt: new Date('2024-02-01') }
        ]
    },
    {
        _id: '3',
        farmer: {
            _id: 'f3',
            name: 'Amit Shah'
        },
        typeOfPlants: 'Orange',
        numberOfPlants: 150,
        modeOfPayment: 'UPI',
        rate: 200,
        advance: 0,
        paymentStatus: 'PENDING',
        payment: []
    },
    {
        _id: '4',
        farmer: {
            _id: 'f4',
            name: 'Priya Singh'
        },
        typeOfPlants: 'Guava',
        numberOfPlants: 200,
        modeOfPayment: 'BANK',
        rate: 175,
        advance: 10000,
        dateOfAdvance: new Date('2024-01-20'),
        bankName: 'HDFC',
        paymentStatus: 'PARTIAL',
        payment: [
            { paidAmount: 10000, createdAt: new Date('2024-01-20') }
        ]
    },

];

const OrderTable = ({ onSave }) => {
    const { classes } = useStyles();
    const [orders, setOrders] = useState(sampleOrders);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({
        numberOfPlants: '',
        rate: '',
        advance: '',
        dateOfAdvance: null
    });

    const getDynamicStyle = (span, totalColumns, gap) => ({
        width: `calc(${(span / totalColumns) * 100}% - ${gap}px)`,
        marginRight: gap + 'px'
    });

    const handleEdit = (order) => {
        setEditingId(order._id);
        setEditData({
            numberOfPlants: order.numberOfPlants,
            rate: order.rate,
            advance: order.advance || '',
            dateOfAdvance: order.dateOfAdvance || null
        });
    };

    const handleSave = (orderId) => {
        const updatedOrders = orders.map(order => {
            if (order._id === orderId) {
                return {
                    ...order,
                    ...editData
                };
            }
            return order;
        });
        setOrders(updatedOrders);

        onSave && onSave(orderId, editData);
        setEditingId(null);
    };

    const getPaymentStatusChip = (status) => {
        let color = 'error';
        if (status === 'FULL') color = 'success';
        else if (status === 'PARTIAL') color = 'warning';

        return (
            <Chip
                label={status}
                color={color}
                sx={{ width: 100 }}
            />
        );
    };

    const calculateTotal = (plants, rate) => {
        return (plants * rate).toFixed(2);
    };

    return (
        <Grid container className={classes.inventoryContainer}>
            <Grid container className={classes.tableHead}>
                <Grid item style={getDynamicStyle(2, 16, 14, true)} className={classes.label}>
                    Farmer Name
                </Grid>
                <Grid item style={getDynamicStyle(2, 16, 14, true)} className={classes.label}>
                    Plant Type
                </Grid>
                <Grid item style={getDynamicStyle(1, 16, 14, true)} className={classes.label}>
                    Plants
                </Grid>
                <Grid item style={getDynamicStyle(1, 16, 14, true)} className={classes.label}>
                    Rate
                </Grid>
                <Grid item style={getDynamicStyle(2, 16, 14, true)} className={classes.label}>
                    Total Amount
                </Grid>
                <Grid item style={getDynamicStyle(1, 16, 14, true)} className={classes.label}>
                    Advance
                </Grid>
                <Grid item style={getDynamicStyle(2, 16, 14, true)} className={classes.label}>
                    Advance Date
                </Grid>
                <Grid item style={getDynamicStyle(1, 16, 14, true)} className={classes.label}>
                    Status
                </Grid>
                <Grid item style={getDynamicStyle(2, 16, 14, true)} className={`${classes.label} ${classes.noMarginRight}`}>
                    Actions
                </Grid>
            </Grid>

            {orders.map((order) => (
                <Grid container className={classes.tableRow} key={order._id}>
                    <Grid item style={getDynamicStyle(2, 16, 14)} className={`${classes.tableCell} ${classes.nameClass}`}>
                        {order.farmer.name}
                    </Grid>
                    <Grid item style={getDynamicStyle(2, 16, 14)} className={classes.tableCell}>
                        {order.typeOfPlants}
                    </Grid>
                    <Grid item style={getDynamicStyle(1, 16, 14)} className={classes.tableCell}>
                        {editingId === order._id ? (
                            <TextField
                                value={editData.numberOfPlants}
                                onChange={(e) => setEditData({ ...editData, numberOfPlants: e.target.value })}
                                variant="outlined"
                                size="small"
                                type="number"
                            />
                        ) : (
                            order.numberOfPlants
                        )}
                    </Grid>
                    <Grid item style={getDynamicStyle(1, 16, 14)} className={classes.tableCell}>
                        {editingId === order._id ? (
                            <TextField
                                value={editData.rate}
                                onChange={(e) => setEditData({ ...editData, rate: e.target.value })}
                                variant="outlined"
                                size="small"
                                type="number"
                            />
                        ) : (
                            order.rate
                        )}
                    </Grid>
                    <Grid item style={getDynamicStyle(2, 16, 14)} className={classes.tableCell}>
                        ₹{calculateTotal(order.numberOfPlants, order.rate)}
                    </Grid>
                    <Grid item style={getDynamicStyle(1, 16, 14)} className={classes.tableCell}>
                        {editingId === order._id ? (
                            <TextField
                                value={editData.advance}
                                onChange={(e) => setEditData({ ...editData, advance: e.target.value })}
                                variant="outlined"
                                size="small"
                                type="number"
                            />
                        ) : (
                            order.advance || '-'
                        )}
                    </Grid>
                    <Grid item style={getDynamicStyle(2, 16, 14)} className={classes.tableCell}>
                        {editingId === order._id ? (
                            <LocalizationProvider dateAdapter={AdapterDateFns}>
                                <DatePicker
                                    value={editData.dateOfAdvance}
                                    onChange={(date) => setEditData({ ...editData, dateOfAdvance: date })}
                                    renderInput={(params) => <TextField {...params} size="small" />}
                                />
                            </LocalizationProvider>
                        ) : (
                            order.dateOfAdvance ? format(new Date(order.dateOfAdvance), 'dd-MM-yyyy') : '-'
                        )}
                    </Grid>
                    <Grid item style={getDynamicStyle(1, 16, 14)} className={classes.tableCell}>
                        {getPaymentStatusChip(order.paymentStatus)}
                    </Grid>
                    <Grid item style={getDynamicStyle(2, 16, 14)} className={`${classes.tableCell} ${classes.noMarginRight} ${classes.actionCell}`}>
                        {editingId === order._id ? (
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => handleSave(order._id)}
                                className={classes.actionButton}
                            >
                                Save
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => handleEdit(order)}
                                className={classes.actionButton}
                            >
                                Edit
                            </Button>
                        )}
                    </Grid>
                </Grid>
            ))}
        </Grid>
    );
};

const useStyles = makeStyles()(() => ({
    inventoryContainer: {
        padding: 5,
        background: "#F0F0F0",
        marginTop: 12
    },
    noMarginRight: {
        marginRight: 0
    },
    label: {
        height: 35,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingLeft: 5,
        fontSize: 17,
        fontWeight: 700,
        flexDirection: "column",
        background: "#FFF",
        color: "#3A4BB6",
        marginRight: "0.7%"
    },
    tableHead: {
        boxShadow: "0px 3px 3px 0px rgba(0, 0, 0, 0.15)",
        color: "black",
        background: "#FFF"
    },
    tableCell: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingLeft: 5,
        flexDirection: "column",
        background: "#FFF",
        height: 43,
        fontWeight: 500,
        fontSize: 17,
        marginRight: "0.7%",
        '& .MuiTextField-root': {
            width: '90%',
            '& .MuiOutlinedInput-input': {
                padding: '8px'
            }
        }
    },
    tableRow: {
        marginTop: 4
    },
    nameClass: {
        alignItems: "flex-start",
        paddingLeft: 10
    },
    actionCell: {
        flexDirection: "row",
        gap: 8,
        justifyContent: "center"
    },
    actionButton: {
        height: 30,
        fontSize: 14,
        boxShadow: 'none',
        '&:hover': {
            boxShadow: 'none'
        }
    }
}));

export default OrderTable;