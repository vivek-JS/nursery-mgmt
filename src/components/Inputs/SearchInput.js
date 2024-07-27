import React, { useState, useCallback } from "react"
import InputBase from "@mui/material/InputBase"
import SearchIcon from "assets/icons/searchIcon.svg"
import CrossIcon from "assets/icons/cross-icon.svg"
import { debounce } from "lodash"
import { makeStyles } from "tss-react/mui"

const useStyles = makeStyles()(() => ({
  rowCenter: {
    border: "solid 1px #EDECF5",
    height: 40,
    borderRadius: 8,
    position: "relative",
    width: "200px",
    display: "flex",
    alignItems: "center",
    paddingLeft: 10,
    paddingRight: 10,
    background: "#E8EFF5"
  },
  InputBase: {
    fontWeight: 200,
    paddingLeft: 10,
    width: "90%"
  },
  imgStyle: {
    // marginRight: 10,
    position: "absolute",
    right: 5
  },
  customTextField: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#222B45"
  },
  crossStyle: {
    cursor: "pointer"
  },
  input: {
    fontSize: 19,
    fontWeight: 500,
    color: "#BDBDBD"
  }
}))

const SearchInput = ({ onChange, label, style, setSearch, widthClass, styelClass }) => {
  const [searchValue, setSearchValue] = useState("")
  const handler = useCallback(debounce(onChange, 500), [])
  const handleChange = (e) => {
    setSearchValue(e.target.value)
    e.persist()
    handler(e)
  }
  const onCrossClick = () => {
    setSearchValue("")
    setSearch("")
  }
  const { classes } = useStyles()

  return (
    <div style={style} className={styelClass}>
      <div className={`${classes.rowCenter} ${widthClass}`}>
        <InputBase
          classes={{ root: classes.customTextField, input: classes.input }}
          value={searchValue}
          placeholder={label}
          onChange={(e) => handleChange(e)}
        />
        {searchValue?.length > 1 ? (
          <img
            src={CrossIcon}
            onClick={onCrossClick}
            className={`${classes.crossStyle} ${classes.imgStyle}`}
            alt="search"
          />
        ) : (
          <img src={SearchIcon} className={classes.imgStyle} alt="search" />
        )}
      </div>
    </div>
  )
}

export default SearchInput
