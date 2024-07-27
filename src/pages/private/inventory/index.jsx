import React, { useState } from "react"
import { Button, Grid } from "@mui/material"
import { makeStyles } from "tss-react/mui"
import UperStrip from "pages/private/UpperStrip"
import { AddPatient } from "components"
import ReactSearchBox from "react-search-box"
import SearchIcon from "@mui/icons-material/Search"
import { getDynamicStyle } from "utils/gridUtils"
import { InputField } from "components"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import { confirmAlert } from "react-confirm-alert"
import "react-confirm-alert/src/react-confirm-alert.css" // Import css
import { Toast } from "helpers/toasts/toastHelper"
import { NetworkManager, API } from "network/core"
import { PageLoader } from "components"
import { useEffect } from "react"
import { useDebounce } from "hooks/utils"

function Inventory() {
  const { classes } = useStyles()
  const [openAddPatient, setOpenAddPatient] = useState(false)
  const [inventoryData, setInventoryData] = useState()
  const [edit, setEdit] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchValue, setSearchValue] = useState("")

  const debouncedSearch = useDebounce(searchValue, 500)

  useEffect(() => {
    if (debouncedSearch !== undefined) {
      getInventory()
    }
  }, [debouncedSearch])
  const updateValue = (index, key, value) => {
    let temp = [...inventoryData]

    temp[index][key] = value.target.value
    temp[index]["isUpdated"] = true
    setInventoryData(temp)
  }

  const getAppointments = async () => {}

  const addItem = () => {
    let temp = [...inventoryData]
    temp.push({
      itemName: "",
      charges: "",
      category: "",
      qty: ""
    })

    setInventoryData(temp)
  }

  const handleCloseAddPatient = () => {
    setOpenAddPatient(false)
  }
  const handleOpenAddPatient = () => {
    setOpenAddPatient(true)
  }
  const deleteInventory = async (invId) => {
    setLoading(true)

    const instance = NetworkManager(API.INVENTORY.DELETE_INVENTORY)
    const payload = { inventoryId: invId }
    const result = await instance.request(payload)
    if (result?.data?.success) {
      getInventory()
      Toast.success("Inventory Deleted Succesfully.")
    }
    setLoading(false)
  }

  const submit = (invId, itemName, qty) => {
    confirmAlert({
      customUI: ({ onClose }) => {
        return (
          <div className={`custom-ui ${classes.modal}`}>
            <h1 className={classes.h1Class}>Are you sure?</h1>
            <p className={classes.h2Class}>{`You want to delete ${itemName} of ${qty} qty?`}</p>
            <Button className={classes.cancelBtn} onClick={onClose}>
              No
            </Button>
            <Button
              className={classes.deleteBtn}
              onClick={() => {
                deleteInventory(invId)
                onClose()
              }}>
              Yes
            </Button>
          </div>
        )
      }
    })
  }
  const handleSave = async () => {
    let flag = true
    for (var i = 0; i < inventoryData?.length; i++) {
      if (
        !inventoryData[i].itemName ||
        !inventoryData[i].qty ||
        !inventoryData[i].category ||
        !inventoryData[i].charges
      ) {
        return Toast.error("Please fill all required fields!")
      }
      setLoading(true)

      const instance = NetworkManager(API.INVENTORY.ADD_INVENTORY)
      const result = await instance.request([inventoryData[i]])

      if (result?.code === 201) {
        getInventory()
        setEdit(false)
      }
      flag = flag & (result?.code === 201)
      setLoading(false)
    }
    if (flag) {
      Toast.success("Inventory Updated Successfully")
    } else {
      Toast.error("Error in updating inventory")
    }
  }
  const getInventory = async () => {
    const instance = NetworkManager(API.INVENTORY.GET_INVENTORY)
    setLoading(true)
    const result = await instance.request({}, [searchValue])
    if (result.data.status) {
      //  handleClose()
      setInventoryData(result.data.data)
    } else {
      setInventoryData([])
    }
    setLoading(false)
  }

  return (
    <>
      <Grid container className={classes.container}>
        {/* {loading && <PageLoader />} */}
        {loading && <PageLoader />}

        <UperStrip
          date={new Date()}
          patientId={-1}
          getAppointments={getAppointments}
          handleOpenAddPatient={handleOpenAddPatient}
        />
        <Grid container className={classes.marginTl}>
          <Grid container style={{ marginTop: 10 }}>
            <ReactSearchBox
              placeholder="Search Inventory"
              value="Doe"
              // data={inventoryData.map((inven) => {
              //   return { value: inven.item_name, key: inven.item_name }
              // })}
              leftIcon={<SearchIcon />}
              inputHeight={"32px"}
              // onSelect={({ item }) => setSearchValue(item.value)}
              onChange={(value) => setSearchValue(value)}
            />
            <Button className={classes.addEditBtn} onClick={() => setEdit(true)}>
              Add/Edit Inventory
            </Button>
          </Grid>
          <Grid container className={classes.inventoryContainer}>
            <Grid container className={classes.tableHead}>
              <Grid item style={getDynamicStyle(3, 5, 10.5)} className={classes.label}>
                Item
              </Grid>
              <Grid item style={getDynamicStyle(3, 5, 10.5)} className={classes.label}>
                Charges
              </Grid>
              <Grid item style={getDynamicStyle(3, 5, 10.5)} className={classes.label}>
                Category
              </Grid>
              <Grid item style={getDynamicStyle(1, 5, 10.5)} className={classes.label}>
                QTY
              </Grid>
              <Grid item style={getDynamicStyle(0.5, 5, 10.5)} className={classes.label}></Grid>
            </Grid>
            {inventoryData?.length > 0 ? (
              inventoryData?.map((item, index) => {
                return (
                  <Grid container className={classes.tableRow} key={index + 1}>
                    <Grid item style={getDynamicStyle(3, 5, 10.5)} className={classes.tableCell}>
                      {edit ? (
                        <InputField
                          id="adress"
                          placeholder="Item*"
                          variant="outlined"
                          value={item?.itemName}
                          onChange={(value) => {
                            updateValue(index, "itemName", value)
                          }}
                        />
                      ) : (
                        item?.itemName
                      )}
                    </Grid>
                    <Grid item style={getDynamicStyle(3, 5, 10.5)} className={classes.tableCell}>
                      {edit ? (
                        <InputField
                          type="number"
                          id="adress"
                          placeholder="Charges*"
                          variant="outlined"
                          value={item.charges}
                          onChange={(value) => {
                            updateValue(index, "charges", value)
                          }}
                        />
                      ) : (
                        item.charges
                      )}
                    </Grid>
                    <Grid item style={getDynamicStyle(3, 5, 10.5)} className={classes.tableCell}>
                      {edit ? (
                        <InputField
                          id="adress"
                          placeholder="Category*"
                          variant="outlined"
                          value={item.category}
                          onChange={(value) => {
                            updateValue(index, "category", value)
                          }}
                          // onBlur={handleBlur("address_line1")}
                          // error={touched.address_line1 && errors.address_line1}
                          // helperText={touched.address_line1 && errors.address_line1}
                        />
                      ) : (
                        item.category
                      )}{" "}
                    </Grid>
                    <Grid item style={getDynamicStyle(1, 5, 10.5)} className={classes.tableCell}>
                      {edit ? (
                        <InputField
                          type="number"
                          id="adress"
                          placeholder="Quantity*"
                          variant="outlined"
                          value={item.qty}
                          onChange={(value) => {
                            updateValue(index, "qty", value)
                          }}
                        />
                      ) : (
                        item.qty
                      )}{" "}
                    </Grid>
                    <Grid item style={getDynamicStyle(0.5, 5, 10.5)} className={classes.tableCell}>
                      {edit && (
                        <DeleteOutlineIcon
                          style={{ cursor: "pointer" }}
                          onClick={() => submit(item._id, item.itemName, item.qty, index)}
                        />
                      )}{" "}
                    </Grid>
                  </Grid>
                )
              })
            ) : (
              <div>No data</div>
            )}
            {edit && (
              <Grid
                container
                alignItems="center"
                className={`${classes.tableRow} ${classes.whiteBg}`}>
                <Button className={classes.solidBtn} onClick={addItem}>
                  Add Items
                </Button>
              </Grid>
            )}
          </Grid>
          {edit && (
            <Grid
              container
              justifyContent="center"
              alignItems="center"
              className={classes.btnContainer}>
              <Button className={classes.cancelBtn} onClick={() => setEdit(false)}>
                Cancel
              </Button>
              <Button
                className={classes.solidBtn}
                onClick={
                  handleSave
                  //deleteItem(index)
                }>
                Save
              </Button>
            </Grid>
          )}
        </Grid>
      </Grid>
      {openAddPatient && (
        <AddPatient patientId={-1} open={openAddPatient} handleClose={handleCloseAddPatient} />
      )}
    </>
  )
}

export default Inventory
const useStyles = makeStyles()(() => ({
  searchContainer: {
    boxShadow: " 0px 4px 5px 0px rgba(0, 0, 0, 0.10)",
    paddingBottom: 12
  },

  flexDisplay: {
    display: "flex"
  },
  container: {
    //padding: "0px 0px 0px 26px"
  },
  statsContainer: {
    marginTop: 24,
    marginLeft: 16
  },
  listandgraphcontainer: {
    marginTop: 16,
    height: "85vh",
    marginLeft: 16
  },
  listContainer: {},
  graphscontainer: {
    paddingLeft: "4%"
  },
  nurseListHeader: {
    padding: "20px 10px 10px 10px"
  },
  todayTxt: {
    fontSize: 20,
    fontWeight: 700
  },
  calender: {
    color: "#4E43D6",
    fontSize: "16px",
    fontWeight: "400"
  },
  nurseListContainer: {
    background: "#E4E5E7",
    height: "75vh",
    padding: 4,
    paddingTop: "unset",
    overflow: "overlay"
  },
  graphs: {
    background: "#E4E5E7",
    width: "100%",
    height: "100%",
    padding: 6,
    borderRadius: 6
  },
  graphOne: {
    background: "#FFFFFF",
    height: "49.5%"
  },
  graphTwo: {
    background: "#FFFFFF",
    height: "49.5%"
  },
  multiSelect: {
    backgroundColor: "#EEEEEE",
    borderRadius: 4,
    width: 180,
    marginRight: 10,
    marginLeft: 10,
    height: "45px !important"
  },
  addEditBtn: {
    height: 30,
    width: 240,
    display: "flex",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    fontSize: 19,
    fontWeight: 500,
    color: "#3A4BB6",
    cursor: "pointer",
    border: "1px solid #BDBDBD",
    marginLeft: 12
  },
  inventoryContainer: {
    padding: 5,
    background: "#F0F0F0",
    marginTop: 12
  },
  label: {
    height: 35,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingLeft: 5,
    fontSize: 17,
    fontWeight: 700,
    flexDirection: "column",
    background: "#FFF",
    color: "#3A4BB6"
  },
  marginTl: {
    margin: 10
  },
  tableHead: {
    boxShadow: "0px 3px 3px 0px rgba(0, 0, 0, 0.15)",
    color: "black"
  },
  tableCell: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingLeft: 5,
    flexDirection: "column",
    background: "#FFF",
    height: 43,
    fontWeight: 500,
    fontSize: 17,
    "& .MuiFormControl-root": {
      height: "85%",
      "& .MuiInputBase-root": {
        height: "80%",
        display: "flex",
        justifyContent: "center"
      }
    }
  },
  tableRow: {
    marginTop: 4
  },
  h1Class: {
    color: "#3A4BB6",
    marginTop: "unset"
  },
  h2Class: {
    color: "#3A4BB6"
  },
  modal: {
    padding: 16,
    border: "2px solid #3A4BB6",
    borderRadius: 4,
    background: "#FFF"
  },
  cancelBtn: {
    borderRadius: 3,
    border: "0.5px solid #838383",
    width: 118,
    height: 35
  },
  deleteBtn: {
    background: "lightred",
    color: "red",
    marginLeft: 8,
    border: "0.5px solid #838383",
    width: 118,
    height: 35
  },
  btnContainer: {
    marginTop: 18
  },
  solidBtn: {
    background: "#3A4BB6",
    color: "#FFF",
    borderRadius: 3,
    marginLeft: 8,
    width: 118,
    height: 35,
    "&:hover": {
      backgroundColor: "#8F88E5 !important",
      borderColor: "#d8dcf3",
      boxShadow: "none"
    }
  },
  whiteBg: {
    background: "#FFFFFF",
    height: 45
  }
}))
