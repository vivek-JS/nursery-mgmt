import React from "react"
import { OutlinedInput, FormControl, InputLabel, FormHelperText } from "@mui/material"
import MaskedInput from "react-text-mask"
import { styled } from "@mui/material/styles"
import InputField from "./InputField"

function TextMaskCustom(props) {
  const { ...other } = props

  return (
    <MaskedInput
      {...other}
      mask={[/\d/, /\d/, "-", /\d/, /\d/, /\d/, /\d/, "-", /\d/, /\d/, /\d/, /\d/]}
      placeholderChar={"\u2000"}
    />
  )
}
const InputFieldPhone = styled(FormControl)(() => ({
  root: {
    "& label.Mui-focused": {},
    "& .MuiOutlinedInput-root": {
      padding: "3px 3px",
      paddingRight: 20
    },
    minHeight: 80,
    marginBottom: 10,
    fontSize: 13,
    lineHeight: 20 / 13,
    fontWeight: 500,
    paddingLeft: 8
  }
}))

const PhoneInputField = ({
  label,
  error,
  onChange,
  helperText,
  onBlur,
  shrink = false,
  style,
  ...props
}) => (
  <>
    {!shrink ? (
      <InputFieldPhone style={{ ...style }} variant="outlined">
        {/* <InputLabel htmlFor={label} error={error}>
          {label}
        </InputLabel> */}
        <InputField
          id={label}
          onChange={onChange}
          label={label}
          error={error}
          //  inputComponent={TextMaskCustom}
          InputProps={{
            inputComponent: TextMaskCustom
          }}
          onBlur={onBlur}
          {...props}
        />
        <FormHelperText id={label + "helper"} error={error}>
          {helperText}
        </FormHelperText>
      </InputFieldPhone>
    ) : (
      <InputFieldPhone
        variant="outlined"
        // style={{ minHeight: containHeight ? 45 : 80 }}
        {...props}>
        <InputLabel htmlFor={label} error={error} shrink={shrink}>
          {label}
        </InputLabel>
        <OutlinedInput
          id={label}
          onChange={onChange}
          label={label}
          error={error}
          //  inputComponent={TextMaskCustom}
          onBlur={onBlur}
          {...props}
        />
        <FormHelperText id={label + "helper"} error={error}>
          {helperText}
        </FormHelperText>
      </InputFieldPhone>
    )}
  </>
)

export default PhoneInputField
