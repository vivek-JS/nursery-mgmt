import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import Slide from "@mui/material/Slide"
import { makeStyles } from "tss-react/mui"
import { CalenderDatePicker, InputField, PageLoader } from "components"
import { useFormik } from "formik"
import { Autocomplete, Grid, InputAdornment } from "@mui/material"
//import { NetworkManager, API } from "network/core"
//import calendarIcon from "assets/icons/calendar.svg"
//import moment from "moment"
import Checkbox from "@mui/material/Checkbox"
import { NetworkManager, API } from "network/core"
import moment from "moment"
import { GENDERS } from "utils/consts"
import * as Yup from "yup"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import { Toast } from "helpers/toasts/toastHelper"
import { GET_API_DATE } from "utils/dateUtils"
import { PatientDispatcher } from "redux/dispatcher/PatientState"

import { useSelector } from "react-redux"
const label = { inputProps: { "aria-label": "Checkbox demo" } }

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="down" ref={ref} {...props} />
})
// const ONLY_CHAR_REGEX = /^[a-zA-Z_ ]+$/
export default function DoctorsModal({
  particular,
  setParticular,
  prescription,
  setPrescription,
  open,
  handleClose,
  checkedInPatient,
  deseases,
  setDeases,
  date,
  getAppointments,
  selectedPatientId,
  setAmount
}) {
  const headerData = useSelector((state) => state)
  const data = headerData?.userData?.userData
  const { classes } = useStyles()
  const [selectedTab, setSelectedTab] = useState("PP")
  const [patientData, setpatientData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [inventoryData, setInventoryData] = useState([])

  const [followUpDate, setFollowUpDate] = useState(null)

  // const [patientList, setPatientList] = useState([])
  useEffect(() => {
    if (checkedInPatient?.patientId || selectedPatientId) {
      getPatient()
      getAppointmentsDetails()
    }
  }, [checkedInPatient?.patientId, selectedPatientId])
  useEffect(() => {
    getInventory()
  }, [])

  const getAppointmentsDetails = async () => {
    setLoading(true)
    const instance = NetworkManager(API.APPOINTMENT.APPOINTMENT_LIST)
    const result = await instance.request({}, { appointmentId: checkedInPatient?.appointmentId })
    console.log(result)
    setLoading(false)
  }
  const getPatient = async () => {
    setLoading(true)

    const instance = NetworkManager(API.PATIENT.GET_PATIENT_DETAILS)
    const data = await instance.request({}, { patientId: checkedInPatient?.patientId })
    setpatientData(data.data.data)

    // const instance = NetworkManager(API.PATIENT.PATIENT_LIST)
    // const user = await instance.request({}, [checkedInPatient?.patient_id || selectedPatientId])
    // setpatientData(user?.data)
    setLoading(false)
  }
  const getInventory = async () => {
    const instance = NetworkManager(API.INVENTORY.GET_INVENTORY)
    setLoading(true)
    const result = await instance.request({})

    if (result.data.status === "Success") {
      //  handleClose()
      setInventoryData(
        result?.data?.data?.map((inventory) => {
          return { label: inventory?.itemName, ...inventory }
        })
      )
    } else {
      setInventoryData([])
    }
    setLoading(false)
  }
  const addFollowUp = async (state, days, followUpDate) => {
    let payload = null
    if (state === true) {
      payload = {
        date: followUpDate,
        patientId: checkedInPatient?.patientId || selectedPatientId
      }
    } else {
      payload = {
        date: days ? GET_API_DATE(moment(date).add(days, "days").toDate()) : date,
        patientId: checkedInPatient?.patientId || selectedPatientId
      }
    }

    setFollowUpDate(payload?.date)

    const instance = NetworkManager(API.FOLLOW_UP.ADD_FOLLOW_UP)

    const result = await instance.request(payload)

    if (result) {
      if (result?.errors) {
        return
      }
      Toast.info(
        days != 0
          ? `Follow up appointment created succesfully after ${days}`
          : `Follow up appointment created succesfully for ${moment(date, "DD-MM-YYYY").format(
              "DD-MMM-YYYY"
            )}`
      )
      //   handleClose()
    }
  }
  const changeStatus = async () => {
    setLoading(true)

    const instance = NetworkManager(API.APPOINTMENT.CHANGE_STATUS)

    let totalChargePerItem = data?.details?.doctorFee

    for (let i = 0; i < particular?.length; i++) {
      const chargePerItem = particular[i].charge_per_item
      totalChargePerItem += chargePerItem
    }

    setAmount(totalChargePerItem)

    const payload = {
      appointmentId: checkedInPatient?.appointmentId,
      disease: deseases.deseas,
      sugarFasting: deseases.sugarFasting,
      sugarAfterMeal: deseases.sugarAfterMeal,
      bloodPressureSystolic: deseases.bloodPressureSystolic,
      bloodPressureDiastolic: deseases.bloodPressureDiastolic,
      description: deseases.decsription,
      particulars: particular,
      prescriptions: prescription,
      appointmentStatus: 3,
      nextFollowUpDate: followUpDate
    }
    const result = await instance.request(payload)
    if (result.status.success) {
      getAppointments()
      setParticular([
        {
          item: "",
          qtyUsed: "",
          charge_per_item: ""
        }
      ])
      setPrescription([
        {
          presc: "",
          drug: "",
          unit: "",
          brkPre: false,
          brkPost: false,
          lunchPre: false,
          lunchPost: false,
          dnPre: false,
          dnPost: false,
          unitToTake: "1"
        }
      ])
      setDeases([])
      PatientDispatcher.checkInActive(null)
      handleClose()
      setLoading(false)
      Toast.success("Patient exited succesfully.")
    }
  }
  let diff = moment.duration(moment().diff(moment(patientData?.dob)))
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      // Age: `${diff.years()} Yrs ${diff.months()} Mths`,
      Age: `${diff.years()} Yrs`,
      suger: "",
      bp: 0,
      deseas: "",
      patient_name: patientData?.name,
      gender: patientData?.gender,
      // weight: patientData?.weight || "",
      description: ""
    },
    validationSchema: Yup.object().shape({
      deseas: Yup.string().required("Deseas Name is required.")
    }),
    onSubmit: () => {
      // addPatient()
      // Do something with values
      //handleAddEmployee(values)
    }
  })
  const { values } = formik || {}
  const chip = (txt) => {
    return <div className={classes.chip}>{txt}</div>
  }
  const changeTab = (tab) => {
    setSelectedTab(tab)
  }

  const changeParticulars = (index, value, key) => {
    let cpyPart = [...particular]
    cpyPart[index][key] = value
    if (key === "qtyUsed") {
      cpyPart[index]["charge_per_item"] = value * cpyPart[index].charge
    }

    setParticular(cpyPart)
  }
  const changeParticularsAllValues = (index, value) => {
    let cpyPart = [...particular]
    cpyPart[index] = {
      item: value?.itemName,
      qtyUsed: 1,
      charge: value?.charges,
      charge_per_item: value?.charges,
      itemId: value?._id
    }
    setParticular(cpyPart)
  }
  const deletePerticulars = (index) => {
    let cpyPart = [...particular]
    cpyPart.splice(index, 1)
    setParticular(cpyPart)
  }
  const changePrescription = (index, value, key, is_checkbox) => {
    let cpyPart = [...prescription]
    if (key === "unitToTake") {
      cpyPart[index][key] = value
    } else {
      cpyPart[index][key] = is_checkbox ? !cpyPart[index][key] : value
    }
    setPrescription(cpyPart)
  }
  const deletePrescription = (index) => {
    let cpyPart = [...prescription]
    cpyPart.splice(index, 1)
    setPrescription(cpyPart)
  }
  const changeDesease = (value, key) => {
    let cpyPart = { ...deseases }
    cpyPart[key] = value
    setDeases(cpyPart)
  }
  const { healthProfile } = patientData || {}

  return (
    <Dialog
      PaperProps={{ sx: { width: "970px", minHeight: "600px" } }}
      maxWidth="md"
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={handleClose}
      aria-describedby="alert-dialog-slide-description">
      <DialogContent>
        {loading && <PageLoader />}
        <form className={classes.form} onSubmit={formik.handleSubmit}>
          <div className={classes.container}>
            <Grid container justifyContent="space-between">
              <Grid
                className={`${classes.tgbtn} ${selectedTab !== "PP" && classes.unSelectedTab}`}
                item
                xs={5.9}
                onClick={() => changeTab("PP")}>
                <span>Patient Profile</span>
                <div>{chip("Follow Up")}</div>
              </Grid>
              <Grid
                onClick={() => changeTab("TP")}
                className={`${classes.tgbtn} ${selectedTab !== "TP" && classes.unSelectedTab}`}
                item
                xs={5.9}>
                Treatment
              </Grid>
            </Grid>
            {selectedTab === "PP" ? (
              <>
                <Grid container className={classes.details}>
                  <Grid className={classes.headingTxt}>Patient Profile</Grid>
                  <Grid container className={classes.mgnTop}>
                    <Grid item xs={3} className={classes.subHeadingTxt}>
                      Patinet name
                    </Grid>
                    <Grid item xs={3} className={classes.subHeadingTxt}>
                      Age
                    </Grid>
                    <Grid item xs={3} className={classes.subHeadingTxt}>
                      Sex
                    </Grid>
                    {/* <Grid item xs={3} className={classes.subHeadingTxt}>
                      Weight
                    </Grid> */}
                  </Grid>
                  <Grid container className={classes.mgnTop}>
                    <Grid item xs={3} className={classes.info}>
                      {values?.patient_name}
                    </Grid>
                    <Grid item xs={3} className={classes.info}>
                      {values?.Age}
                    </Grid>
                    <Grid item xs={3} className={classes.info}>
                      {GENDERS[values?.gender]}
                    </Grid>
                    {/* <Grid item xs={3} className={classes.info}>
                      {values?.weight}
                    </Grid> */}
                  </Grid>
                </Grid>
                <Grid container className={classes.details}>
                  <Grid className={classes.headingTxt}>Current Status</Grid>
                  <Grid container className={classes.mgnTop}>
                    <Grid item xs={3} className={classes.subHeadingTxt}>
                      Allergies
                    </Grid>
                    <Grid item xs={3} className={classes.subHeadingTxt}>
                      Habits
                    </Grid>
                    <Grid item xs={3} className={classes.subHeadingTxt}>
                      Current Treatment
                    </Grid>
                  </Grid>
                  <Grid container className={classes.mgnTop}>
                    <Grid item xs={3} className={classes.info}>
                      {healthProfile?.allergies?.length > 0
                        ? healthProfile?.allergies?.map((allergy, index) => (
                            <div key={index + 1}>{allergy.name || "N/A"}</div>
                          ))
                        : "N/A"}
                    </Grid>

                    <Grid item xs={3} className={classes.info}>
                      {healthProfile?.habits?.length > 0
                        ? healthProfile?.habits?.map((allergy, index) => (
                            <div key={index + 1}>{allergy.name || "N/A"}</div>
                          ))
                        : "N/A"}{" "}
                    </Grid>
                    <Grid item xs={3} className={classes.info}>
                      {healthProfile?.currentTreatment?.length > 0
                        ? healthProfile?.currentTreatment?.map((allergy, index) => (
                            <div key={index + 1}>
                              <div key={index + 1}>{allergy.name || "N/A"}</div>
                            </div>
                          ))
                        : "N/A"}{" "}
                    </Grid>
                  </Grid>
                </Grid>
                <Grid container className={classes.details}>
                  <Grid className={classes.headingTxt}>Patient History</Grid>
                  <Grid container className={classes.mgnTop}>
                    <Grid item xs={3} className={classes.subHeadingTxt}>
                      Previous Diseases
                    </Grid>
                    <Grid item xs={3} className={classes.subHeadingTxt}>
                      Surgery
                    </Grid>
                  </Grid>
                  <Grid container className={classes.mgnTop}>
                    <Grid item xs={3} className={classes.info}>
                      {healthProfile?.previousDisease?.length > 0
                        ? healthProfile?.previousDisease?.map((allergy, index) => (
                            <div key={index + 1}>{allergy.name || "N/A"}</div>
                          ))
                        : "N/A"}{" "}
                    </Grid>
                    <Grid container item xs={3} className={classes.info}>
                      <Grid item xs={3} className={classes.info}>
                        {healthProfile?.surgery?.length > 0
                          ? healthProfile?.surgery?.map((allergy, index) => (
                              <div key={index + 1}>{allergy.name || "N/A"}</div>
                            ))
                          : "N/A"}{" "}
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </>
            ) : (
              <>
                <Grid container className={classes.details}>
                  <Grid className={classes.headingTxt}>Examination and Dignosed</Grid>

                  <Grid container className={classes.mgnTop} spacing={2}>
                    <Grid item xs={3} className={`${classes.subHeadingTxt} ${classes.info}`}>
                      Blood Pressure Systolic
                      <InputField
                        id="bloodPressureSystolic"
                        type="number"
                        value={deseases?.bloodPressureSystolic}
                        onChange={(value) =>
                          changeDesease(value.target.value, "bloodPressureSystolic")
                        }
                      />
                    </Grid>
                    <Grid item xs={3} className={`${classes.subHeadingTxt} ${classes.info}`}>
                      Blood Pressure Diastolic
                      <InputField
                        id="bloodPressureDiastolic"
                        type="number"
                        value={deseases?.bloodPressureDiastolic}
                        onChange={(value) =>
                          changeDesease(value.target.value, "bloodPressureDiastolic")
                        }
                      />
                    </Grid>
                    <Grid item xs={3} className={`${classes.subHeadingTxt} ${classes.info}`}>
                      Suger Fasting
                      <InputField
                        id="sugarFasting"
                        type="number"
                        value={deseases?.sugarFasting}
                        onChange={(value) => changeDesease(value.target.value, "sugarFasting")}
                      />
                    </Grid>
                    <Grid item xs={3} className={`${classes.subHeadingTxt} ${classes.info}`}>
                      Suger After Meal
                      <InputField
                        id="sugarAfterMeal"
                        type="number"
                        value={deseases?.sugarAfterMeal}
                        onChange={(value) => changeDesease(value.target.value, "sugarAfterMeal")}
                      />
                    </Grid>
                  </Grid>
                  <Grid container className={classes.mgnTop}>
                    <Grid item xs={3} className={classes.subHeadingTxt}>
                      Disease
                    </Grid>
                    {/* <Grid item xs={3} className={classes.subHeadingTxt}>
                      Blood Pressure
                    </Grid>
                    <Grid item xs={3} className={classes.subHeadingTxt}>
                      Suger
                    </Grid> */}
                  </Grid>
                  <Grid container className={classes.mgnTop}>
                    <Grid item xs={3} className={classes.info}>
                      <InputField
                        id="deseas"
                        type="text"
                        placeholder="Diseases"
                        //placeholder="Address*"
                        value={deseases?.deseas}
                        onChange={(value) => changeDesease(value.target.value, "deseas")}
                        // onBlur={handleBlur("deseas")}
                        // error={touched.deseas && errors.deseas}
                        // helperText={touched.deseas && errors.deseas}
                      />{" "}
                    </Grid>
                    {/* <Grid container item xs={3} className={classes.info}>
                      <InputField
                        id="bp"
                        type="number"
                        placeholder="Blood Pressure"
                        //placeholder="Address*"
                        value={deseases?.bp}
                        onChange={(value) => changeDesease(value.target.value, "bp")}
                      // onBlur={handleBlur("bp")}
                      // error={touched.bp && errors.bp}
                      // helperText={touched.bp && errors.bp}
                      />{" "}
                    </Grid>
                    <Grid item xs={3} className={classes.info}>
                      <InputField
                        id="suger"
                        type="number"
                        placeholder="Suger"
                        //placeholder="Address*"
                        value={deseases?.suger}
                        onChange={(value) => changeDesease(value.target.value, "suger")}
                      // onBlur={handleBlur("suger")}
                      // error={touched.suger && errors.suger}
                      // helperText={touched.suger && errors.suger}
                      />{" "}
                    </Grid> */}
                  </Grid>
                  <Grid container>
                    <InputField
                      id="description"
                      placeholder="Description(optional)"
                      //placeholder="Address*"

                      value={deseases.decsription}
                      onChange={(value) => changeDesease(value.target.value, "decsription")}
                      //   onBlur={handleBlur("description")}
                      //   error={touched.description && errors.description}
                      //   helperText={touched.description && errors.description}
                      fullWidth
                    />{" "}
                  </Grid>
                  <Grid container className={classes.mgnTop}>
                    <Grid item xs={4} className={classes.subHeadingTxt}>
                      Particular
                    </Grid>
                    <Grid item xs={3} className={classes.subHeadingTxt}>
                      QTY
                    </Grid>
                    <Grid item xs={3} className={classes.subHeadingTxt}>
                      Charges
                    </Grid>
                  </Grid>
                  {particular?.map((particular, index) => {
                    return (
                      <Grid container key={index + 1} className={classes.mgnTop}>
                        <Grid item xs={4} className={classes.info1}>
                          <Autocomplete
                            disablePortal
                            id="combo-box-demo"
                            options={inventoryData}
                            onChange={(props, option) => {
                              changeParticularsAllValues(index, option, "item")
                            }}
                            value={particular?.item}
                            renderInput={(params) => (
                              <InputField
                                {...params}
                                id="deseas"
                                type="text"
                                placeholder="Particular"
                                //placeholder="Address*"
                                value={particular?.item}
                                onChange={(value) => {
                                  changeParticulars(index, value.target.value, "item")
                                }}
                              />
                            )}
                          />{" "}
                        </Grid>
                        <Grid item xs={3} className={classes.info}>
                          <InputField
                            id="deseas"
                            type="number"
                            placeholder="QTY"
                            //placeholder="Address*"
                            value={particular?.qtyUsed}
                            onChange={(value) =>
                              changeParticulars(index, value.target.value, "qtyUsed")
                            }
                            // onBlur={handleBlur("deseas")}
                          />{" "}
                        </Grid>
                        <Grid item xs={3} className={classes.info}>
                          <InputField
                            id="deseas"
                            type="number"
                            placeholder="Charges"
                            //placeholder="Address*"
                            value={particular?.charge_per_item}
                            onChange={(value) =>
                              changeParticulars(index, value.target.value, "charge_per_item")
                            }
                            InputProps={{
                              startAdornment: (
                                <InputAdornment
                                  style={{
                                    width: 4
                                  }}
                                  position="start">
                                  ₹
                                </InputAdornment>
                              )
                            }}

                            // onBlur={handleBlur("deseas")}
                          />{" "}
                        </Grid>
                        {index > 0 && (
                          <Grid item xs={2} className={`${classes.info} ${classes.deleteIcon}`}>
                            <DeleteOutlineIcon
                              onClick={() => {
                                deletePerticulars(index)
                              }}
                            />{" "}
                          </Grid>
                        )}
                      </Grid>
                    )
                  })}

                  <Button
                    type="submit"
                    className={`${classes.agree} ${classes.addBtn}`}
                    onClick={() => {
                      setParticular([...particular, { item: "", qtyUsed: "" }])
                    }}>
                    Add
                  </Button>
                </Grid>
                <Grid container className={classes.details}>
                  <Grid className={classes.headingTxt}>Prescription</Grid>
                  <Grid container className={classes.mgnTop}>
                    <Grid item xs={6} className={classes.rx}>
                      RX,
                    </Grid>
                    <Grid container item xs={6} className={classes.rx}>
                      <Grid item xs={3}>
                        <div className={classes.bf}>Breakfast</div>
                        <Grid container justifyContent={"space-evenly"}>
                          <div className={classes.pre}>Pre</div>
                          <div className={classes.pre}>Post</div>
                        </Grid>
                      </Grid>
                      <Grid item xs={3}>
                        <div className={classes.bf}>Lunch</div>
                        <Grid container justifyContent={"space-evenly"}>
                          <div className={classes.pre}>Pre</div>
                          <div className={classes.pre}>Post</div>
                        </Grid>{" "}
                      </Grid>
                      <Grid item xs={3}>
                        <div className={classes.bf}>Dinner</div>
                        <Grid container justifyContent={"space-evenly"}>
                          <div className={classes.pre}>Pre</div>
                          <div className={classes.pre}>Post</div>
                        </Grid>{" "}
                      </Grid>
                      <Grid item xs={3}>
                        <div className={classes.bf}>Dosage</div>
                        <Grid container justifyContent={"space-evenly"}>
                          <div className={classes.pre}>1/2</div>
                          <div className={classes.pre}>1</div>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                  {prescription?.map((pres, index) => {
                    return (
                      <Grid key={index + 1} container className={classes.mgnTop}>
                        <Grid container item xs={6} className={classes.rx}>
                          <Grid item xs={4} className={classes.info2}>
                            <Autocomplete
                              disablePortal
                              id="combo-box-demo"
                              options={inventoryData}
                              onChange={(props, option) => {
                                changePrescription(index, option?.label, "presc")
                              }}
                              value={pres.presc}
                              renderInput={(params) => (
                                <InputField
                                  {...params}
                                  id="deseas"
                                  type="text"
                                  placeholder="Prescription"
                                  //placeholder="Address*"
                                  value={pres.presc}
                                  onChange={(value) =>
                                    changePrescription(index, value.target.value, "presc")
                                  }

                                  ///       error={touched.deseas && errors.deseas}
                                  //     helperText={touched.deseas && errors.deseas}
                                />
                              )}
                            />{" "}
                          </Grid>{" "}
                          <Grid item xs={4} className={classes.info}>
                            <InputField
                              id="deseas"
                              type="text"
                              placeholder="Drug"
                              //placeholder="Address*"
                              value={pres.drug}
                              onChange={(value) =>
                                changePrescription(index, value.target.value, "drug")
                              }
                              //   onBlur={handleBlur("deseas")}
                              //   error={touched.deseas && errors.deseas}
                              //   helperText={touched.deseas && errors.deseas}
                            />{" "}
                          </Grid>{" "}
                          <Grid item xs={4} className={classes.info}>
                            <InputField
                              id="deseas"
                              type="number"
                              placeholder="Unit"
                              //placeholder="Address*"
                              value={pres.unit}
                              onChange={(value) =>
                                changePrescription(index, value.target.value, "unit")
                              }
                              //   onBlur={handleBlur("deseas")}
                              //   error={touched.deseas && errors.deseas}
                              //   helperText={touched.deseas && errors.deseas}
                            />{" "}
                          </Grid>{" "}
                        </Grid>
                        <Grid container item xs={6} className={classes.rx}>
                          <Grid item xs={3}>
                            <Grid
                              container
                              justifyContent={"space-evenly"}
                              className={classes.checkBoxContainer}>
                              <Checkbox
                                onChange={(value) =>
                                  changePrescription(index, value.target.value, "brkPre", true)
                                }
                                checked={pres?.brkPre}
                                {...label}
                              />
                              <Checkbox
                                onChange={(value) =>
                                  changePrescription(index, value.target.value, "brkPost", true)
                                }
                                checked={pres?.brkPost}
                                {...label}
                              />
                            </Grid>
                          </Grid>
                          <Grid item xs={3}>
                            <Grid
                              container
                              justifyContent={"space-evenly"}
                              className={classes.checkBoxContainer}>
                              <Checkbox
                                onChange={(value) =>
                                  changePrescription(index, value.target.value, "lunchPre", true)
                                }
                                checked={pres?.lunchPre}
                                {...label}
                              />
                              <Checkbox
                                onChange={(value) =>
                                  changePrescription(index, value.target.value, "lunchPost", true)
                                }
                                checked={pres?.lunchPost}
                                {...label}
                              />
                            </Grid>{" "}
                          </Grid>
                          <Grid item xs={3}>
                            <Grid
                              container
                              justifyContent={"space-evenly"}
                              className={classes.checkBoxContainer}>
                              <Checkbox
                                onChange={(value) =>
                                  changePrescription(index, value.target.value, "dnPre", true)
                                }
                                checked={pres?.dnPre}
                                {...label}
                              />
                              <Checkbox
                                onChange={(value) =>
                                  changePrescription(index, value.target.value, "dnPost", true)
                                }
                                checked={pres?.dnPost}
                                {...label}
                              />
                            </Grid>{" "}
                          </Grid>
                          <Grid item xs={3}>
                            <Grid
                              container
                              justifyContent={"space-evenly"}
                              className={classes.checkBoxContainer}>
                              <Checkbox
                                onChange={() => changePrescription(index, "1/2", "unitToTake")}
                                checked={pres?.unitToTake === "1/2"}
                                {...label}
                              />
                              <Checkbox
                                onChange={() => changePrescription(index, "1", "unitToTake")}
                                checked={pres?.unitToTake === "1"}
                                {...label}
                              />
                              <Grid
                                item
                                xs={2}
                                className={`${classes.info} ${classes.deleteIcon} ${
                                  index === 0 && classes.noVisible
                                }`}>
                                <DeleteOutlineIcon
                                  onClick={() => {
                                    deletePrescription(index)
                                  }}
                                />{" "}
                              </Grid>
                            </Grid>{" "}
                          </Grid>
                        </Grid>
                      </Grid>
                    )
                  })}

                  <Button
                    type="submit"
                    className={`${classes.agree} ${classes.addBtn}`}
                    onClick={() => {
                      setPrescription([
                        ...prescription,
                        {
                          presc: "",
                          drug: "",
                          unit: "",
                          brkPre: false,
                          brkPost: false,
                          lunchPre: false,
                          lunchPost: false,
                          dnPre: false,
                          unitToTake: "1"
                        }
                      ])
                    }}>
                    Add
                  </Button>
                </Grid>
              </>
            )}
          </div>
        </form>
      </DialogContent>
      <DialogActions className={classes.DialogActions}>
        <Grid className={classes.nextAppointment} justifyContent="center" alignItems="center">
          <span>Next Follow Up</span>
          <div className={classes.numberBox} onClick={() => addFollowUp(false, 3, null)}>
            3
          </div>
          <div className={classes.numberBox} onClick={() => addFollowUp(false, 7, null)}>
            7
          </div>
          <div className={classes.numberBox} onClick={() => addFollowUp(false, 15, null)}>
            15
          </div>
          <div className={classes.numberBox} onClick={() => addFollowUp(false, 30, null)}>
            30
          </div>
          <div className={classes.numberBox}>
            <CalenderDatePicker
              date={date}
              setDate={(val) => {
                addFollowUp(true, 0, moment(val).format("YYYY-MM-DD"))
              }}
              isCalenderIcon={true}
            />
          </div>
        </Grid>
        <div>
          <Button
            onClick={() => {
              //resetForm()
              handleClose()
            }}
            className={classes.cancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            className={`${classes.agree}`}
            onClick={selectedTab === "PP" ? () => setSelectedTab("TP") : () => changeStatus()}>
            {selectedTab === "PP" ? "Next" : "Out"}
          </Button>
        </div>
      </DialogActions>
    </Dialog>
  )
}

const useStyles = makeStyles()(() => ({
  DialogActions: {
    boxSizing: "border-box",
    height: 90,
    paddingRight: 60,
    paddingLeft: 60,
    display: "flex",
    justifyContent: "space-between"
  },
  cancel: {
    color: "#3A4BB6",
    fontWeight: 600,
    fontSize: 16,
    marginRight: 16
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  hr: {
    border: "1px solid #3A4BB6"
  },
  form: {
    // marginTop: 24
  },
  txt: {
    fontSize: 16,
    fontWeight: 600
  },
  agree: {
    borderRadius: 5,
    background: "#4E43D6",
    color: "#FFFFFF",
    fontWeight: 600,
    fontSize: 16,
    "&:hover": {
      backgroundColor: "#8F88E5 !important",
      borderColor: "#d8dcf3",
      boxShadow: "none"
    }
  },
  addBtn: {
    height: 20,
    marginTop: 5,
    fontWeight: 400,
    fontSize: 12
  },
  idDiv: {
    background: "linear-gradient(90deg, #F23A41 0%, #6E3AA8 100%)",
    border: "1px solid #FFF",
    borderRadius: 3,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 160,
    height: 32,
    color: "#FFFFFF"
  },
  multiSelect: {
    backgroundColor: "#EEEEEE",
    borderRadius: 4,
    width: 180,
    marginRight: 10,
    marginLeft: 10,
    height: "45px !important"
  },
  container: {
    borderRadius: 3,
    padding: 5,
    background: "#F0F0F0"
  },
  tgbtn: {
    borderRadius: "5px",
    border: "1px solid #000",
    background: "#3A4BB6",
    height: 36,
    display: "flex",
    alignItems: "center",
    padding: "0px 10px",
    fontSize: 16,
    fontWeight: 700,
    color: "#FFFFFF",
    cursor: "pointer"
  },
  chip: {
    fontSize: 10,
    fontWeight: 400,
    borderRadius: "26px",
    background: "rgba(255, 255, 255, 0.75)",
    color: "black",
    padding: 5,
    marginLeft: 25
  },
  unSelectedTab: {
    background: "#FFFFFF",
    color: "#3A4BB6"
  },
  details: {
    padding: "10px 17px",
    background: "#FFFFFF",
    marginTop: 20,
    borderRadius: 5
  },
  headingTxt: {
    color: "#3A4BB6",
    fontSize: "13px",
    fontStyle: "normal",
    fontWeight: "700",
    lineHeight: "normal"
  },
  subHeadingTxt: {
    color: "#757575",
    fontSize: "15px",
    fontWeight: "500",
    lineHeight: "normal"
  },
  mgnTop: {
    marginTop: 8
  },
  info: {
    fontSize: "16px",
    fontWeight: "600",
    "& .MuiTextField-root": {
      minHeight: "unset",
      marginBottom: 5
    },
    "& div": {
      height: "25px !important",
      width: 120
    }
  },
  info1: {
    fontSize: "16px",
    fontWeight: "600",
    "& .MuiAutocomplete-root .MuiAutocomplete-input": {
      paddingTop: "1.5px !important"
    },
    "& .MuiAutocomplete-root .MuiAutocomplete-endAdornment": { right: "-181px !important" },
    "& .MuiTextField-root": {
      minHeight: "unset",
      marginBottom: 5
    },
    "& .MuiOutlinedInput-root": {
      height: 26
    },
    "& div": {
      //   height: "25px !important",
      width: 210
    }
  },
  info2: {
    fontSize: "16px",
    fontWeight: "600",
    "& .MuiAutocomplete-root .MuiAutocomplete-input": {
      paddingTop: "1.5px !important"
    },
    "& .MuiAutocomplete-root .MuiAutocomplete-endAdornment": {
      right: "5px !important",
      width: "unset !important"
    },
    "& .MuiTextField-root": {
      minHeight: "unset",
      marginBottom: 5
    },
    "& .MuiOutlinedInput-root": {
      height: 26
    },
    "& div": {
      //   height: "25px !important",
      width: 120
    }
  },
  rx: {
    fontSize: 15,
    fontWeight: 700,
    color: "#757575"
  },
  bf: {
    fontSize: 13,
    fontWeight: 500,
    color: "#757575",
    textAlign: "center"
  },
  pre: {
    fontSize: 9,
    fontWeight: 500
  },
  checkBoxContainer: {
    "& span": {
      padding: 0
    }
  },
  nextAppointment: {
    padding: 5,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#3A4BB6",
    color: "#FFFFFF",
    borderRadius: 5
  },
  numberBox: {
    background: "#FFFFFF",
    color: "#3A4BB6",
    fontSize: 20,
    fontWeight: 500,
    marginLeft: 10,
    borderRadius: 4,
    cursor: "pointer",
    // height: 30,
    width: 30,
    textAlign: "center",
    "&:hover": {
      background: "lightgray"
    }
  },
  deleteIcon: {
    cursor: "pointer"
  },
  noVisible: {
    visibility: "hidden"
  }
}))
