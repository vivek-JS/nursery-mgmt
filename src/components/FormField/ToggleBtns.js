import React, {
  Children,
  isValidElement,
  cloneElement,
  useMemo,
  useState,
  useCallback
} from "react"

import { identity } from "ramda"
import { ButtonGroup } from "@mui/material"

const ControlledButtonGroupToggle = ({ children, selected = 0, onChange = identity, ...props }) => {
  const buttons = useMemo(
    () =>
      Children.map(children, (child, i) => {
        return isValidElement(child)
          ? cloneElement(child, {
              variant: i === selected ? "contained" : "outlined",
              onClick: () => selected !== i && onChange(i)
            })
          : child
      }),
    [children, selected, onChange]
  )

  return <ButtonGroup {...props}>{buttons}</ButtonGroup>
}

const UncontrolledButtonGroupToggle = ({
  children,
  initialSelected = 0,
  onChange = identity,
  ...props
}) => {
  const [selected, setSelected] = useState(initialSelected)

  const onButtonSelection = useCallback(
    (i) => {
      setSelected(i)
      onChange(i)
    },
    [setSelected, onChange]
  )

  return (
    <ControlledButtonGroupToggle selected={selected} onChange={onButtonSelection} {...props}>
      {children}
    </ControlledButtonGroupToggle>
  )
}

const ButtonGroupToggle = ({ children, initialSelected, selected, onChange, ...props }) =>
  typeof initialSelected === "number" ? (
    <UncontrolledButtonGroupToggle {...{ initialSelected, onChange, ...props }}>
      {children}
    </UncontrolledButtonGroupToggle>
  ) : (
    <ControlledButtonGroupToggle {...{ selected, onChange, ...props }}>
      {children}
    </ControlledButtonGroupToggle>
  )
export default ButtonGroupToggle
