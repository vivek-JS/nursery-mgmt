import * as Yup from "yup"

export const FPValidator = {
  initialValues: {
    email: ""
  },
  validationSchema: Yup.object().shape({
    email: Yup.string().required("Email is required")
  })
}

export const RPValidator = {
  initialValues: {
    password: "",
    confirmPassword: ""
  },
  validationSchema: Yup.object().shape({})
}
