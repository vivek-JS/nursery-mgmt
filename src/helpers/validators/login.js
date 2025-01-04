import * as Yup from "yup"

export const LoginValidator = {
  initialValues: {
    phoneNumber: "",
    password: ""
  },
  validationSchema: Yup.object().shape({
    //  password: Yup.string().required("Password is Required").min(8)
  })
}
