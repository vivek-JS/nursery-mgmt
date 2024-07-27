import React from "react"
import { Grid, IconButton } from "@mui/material"
import { Formik, Form, FieldArray } from "formik"
import Button from "@mui/material/Button"
import AddIcon from "@mui/icons-material/Add"
import DeleteIcon from "@mui/icons-material/Delete"
import { useStyles } from "../commonStyles"
import FormField from "components/FormField"
import { useSelector } from "react-redux"
import * as Yup from "yup"
import { LocalizationProvider, TimePicker } from "@mui/x-date-pickers"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { InputField } from "components"
import { usePrivateLayoutController } from "../../../../layout/privateLayout/privateLayout.controller"
import { useIsLoggedIn } from "hooks/state"

import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { parse } from "date-fns"

const CommonSettings = () => {
  const styles = useStyles()
  const headerData = useSelector((state) => state)
  const data = headerData?.userData?.userData

  const isLoggedIn = useIsLoggedIn()

  const { handleLogout } = usePrivateLayoutController(isLoggedIn)

  // Helper function to parse time string to Date object
  const parseTime = (timeString) => {
    if (!timeString) return null
    return parse(timeString, "HH:mm", new Date())
  }

  const formikConfig = {
    initialValues: {
      timepp: data.details.tpp || "",
      openingHours: data.details.openingHours
        ? data.details.openingHours.map((slot) => ({
            startTime: parseTime(slot.startTime),
            endTime: parseTime(slot.endTime)
          }))
        : [{ startTime: null, endTime: null }],
      casePaperFee: data.details.casePaperFee || "",
      casePaperValidity: data.details.casePaperValidity || "",
      doctorFee: data.details.doctorFee || "",
      followupFee: data.details.followupFee || ""
    },
    validationSchema: Yup.object().shape({
      openingHours: Yup.array()
        .of(
          Yup.object().shape({
            startTime: Yup.date().nullable().required("Opening Time is required"),
            endTime: Yup.date().nullable().required("Closing Time is required")
          })
        )
        .min(1, "At least one time slot is required")
    }),
    onSubmit: async (values, { setSubmitting }) => {
      const formattedOpeningHours = values.openingHours.map((slot) => ({
        startTime: slot.startTime?.toTimeString().slice(0, 5),
        endTime: slot.endTime?.toTimeString().slice(0, 5)
      }))

      const payload = {
        tpp: values.timepp,
        openingHours: formattedOpeningHours,
        casePaperFee: values.casePaperFee,
        casePaperValidity: values.casePaperValidity,
        doctorFee: values.doctorFee,
        followupFee: values.followupFee
      }

      const instance = NetworkManager(API.HOSPITAL.UPDATE_HOSPITAL)
      const response = await instance.request(payload)

      if (response.code === 200) {
        Toast.success("Changes Updated successfully")
        handleLogout()
      } else {
        Toast.error("Falied to update")
      }
      setSubmitting(false)
    }
  }

  return (
    <div>
      <Formik
        initialValues={formikConfig.initialValues}
        validationSchema={formikConfig.validationSchema}
        onSubmit={formikConfig.onSubmit}>
        {(formik) => (
          <Form onSubmit={formik.handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={10} md={7} sx={styles.textbox}>
                <FormField
                  label={"Time per patient"}
                  placeholder="Time per patient"
                  formik={formik}
                  name={"timepp"}
                  required
                />

                <FieldArray name="openingHours">
                  {({ push, remove }) => (
                    <>
                      {formik.values.openingHours.map((slot, index) => (
                        <Grid container key={index} style={{ marginTop: 16 }} alignItems="center">
                          <Grid container item xs={11} spacing={1}>
                            <Grid item xs={6}>
                              <LocalizationProvider dateAdapter={AdapterDateFns}>
                                <TimePicker
                                  label="Start Time*"
                                  value={slot.startTime}
                                  onChange={(value) => {
                                    const newOpeningHours = [...formik.values.openingHours]
                                    newOpeningHours[index] = {
                                      ...newOpeningHours[index],
                                      startTime: value
                                    }
                                    formik.setFieldValue("openingHours", newOpeningHours)
                                  }}
                                  renderInput={(params) => (
                                    <InputField
                                      {...params}
                                      fullWidth
                                      error={
                                        formik.touched.openingHours?.[index]?.startTime &&
                                        formik.errors.openingHours?.[index]?.startTime
                                      }
                                      helperText={
                                        formik.touched.openingHours?.[index]?.startTime &&
                                        formik.errors.openingHours?.[index]?.startTime
                                      }
                                    />
                                  )}
                                />
                              </LocalizationProvider>
                            </Grid>
                            <Grid item xs={6}>
                              <LocalizationProvider dateAdapter={AdapterDateFns}>
                                <TimePicker
                                  label="End Time*"
                                  value={slot.endTime}
                                  onChange={(value) => {
                                    const newOpeningHours = [...formik.values.openingHours]
                                    newOpeningHours[index] = {
                                      ...newOpeningHours[index],
                                      endTime: value
                                    }
                                    formik.setFieldValue("openingHours", newOpeningHours)
                                  }}
                                  renderInput={(params) => (
                                    <InputField
                                      {...params}
                                      fullWidth
                                      error={
                                        formik.touched.openingHours?.[index]?.endTime &&
                                        formik.errors.openingHours?.[index]?.endTime
                                      }
                                      helperText={
                                        formik.touched.openingHours?.[index]?.endTime &&
                                        formik.errors.openingHours?.[index]?.endTime
                                      }
                                    />
                                  )}
                                />
                              </LocalizationProvider>
                            </Grid>
                          </Grid>
                          <Grid item xs={1}>
                            <IconButton
                              onClick={() => remove(index)}
                              disabled={formik.values.openingHours.length === 1}>
                              <DeleteIcon />
                            </IconButton>
                          </Grid>
                        </Grid>
                      ))}
                      <Grid container justifyContent="flex-end" style={{ marginTop: 16 }}>
                        <Button
                          startIcon={<AddIcon />}
                          onClick={() => push({ startTime: null, endTime: null })}>
                          Add Time Slot
                        </Button>
                      </Grid>
                    </>
                  )}
                </FieldArray>

                <FormField
                  label={"Case paper fee"}
                  placeholder="Case paper fee"
                  formik={formik}
                  name={"casePaperFee"}
                  required
                />

                <FormField
                  label={"Followup fee"}
                  placeholder="Followup fee"
                  formik={formik}
                  name={"followupFee"}
                  required
                />

                <FormField
                  label={"Case paper validity"}
                  placeholder="Case paper validity"
                  formik={formik}
                  name={"casePaperValidity"}
                  required
                />

                <FormField
                  label={"Doctor fee"}
                  placeholder="Doctor fee"
                  formik={formik}
                  name={"doctorFee"}
                  required
                />

                <Grid container item xs={4}>
                  <Button type="submit" className={styles.submitBtn}>
                    Save
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </Form>
        )}
      </Formik>
    </div>
  )
}

export default CommonSettings
