import * as Yup from "yup"

export const PrescriptionHeaderValidator = {
  initialValues: {
    doctor_name:"",
    reg_no:"",
    medical_degree:"",
    mobile_no:"",
    clinik_name: "",
    address:"",
  },
  validationSchema: Yup.object().shape({
    doctor_name: Yup.string()
                    .required("Doctor Name is Required")
                    .matches(/^[A-Za-z]+$/, "Doctor Name must contain only alphabetic characters"),
    reg_no:Yup.string().required("Registration Number is required"),
    medical_degree:Yup.string().required("Degree is required"),
    mobile_no:Yup.string()
                 .required("Mobile Number is required")
                 .matches(/^[0-9]{10}$/, "Mobile Number must be 10 digits"), 
    clinik_name:Yup.string().required("Registration Number is required"),
    address:Yup.string().required("Address is required"),
  })
}
