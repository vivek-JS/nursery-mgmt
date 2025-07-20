import * as Yup from "yup"

export const LoginValidator = {
  initialValues: {
    phoneNumber: "",
    password: ""
  },
  validationSchema: Yup.object().shape({
    phoneNumber: Yup.string().required("Phone Number is Required"),
    password: Yup.string().required("Password is Required").min(1, "Password is Required")
  })
}
