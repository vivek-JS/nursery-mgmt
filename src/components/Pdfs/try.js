import { Page, Text, View, Document, StyleSheet, Font } from "@react-pdf/renderer"
import React from "react"
import InterRegular from "assets/fonts/Inter-Regular.ttf"
import InterBold from "assets/fonts/Inter-Bold.ttf"
import InterSemiBold from "assets/fonts/Inter-SemiBold.ttf"
import InterMedium from "assets/fonts/Inter-Medium.ttf"
import InterExtraBold from "assets/fonts/Inter-ExtraBold.ttf"
// import signatureImage from "../assets/icons/checked.png";
Font.register({
  family: "Inter",
  fonts: [
    { src: InterRegular, fontWeight: 400 }, // font-style: normal, font-weight: normal
    { src: InterBold, fontWeight: 700 },
    { src: InterSemiBold, fontWeight: 600 },
    { src: InterMedium, fontWeight: 500 },
    { src: InterExtraBold, fontWeight: 800 }
    // { src: source3, fontStyle: 'italic', fontWeight: 700 },
  ]
})
export const Quixote = ({ particular, name }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={[styles.header, styles.extraBoldFont]}>
        <Text>Pract Ease Hospital</Text>
      </View>
      <View style={styles.address}>
        <Text>F 14, 3rd Floor, Kapila,MSEB Road,Vishrambag,Sangli-416415</Text>
      </View>
      <View style={styles.address}>
        <Text>contact No.: 000-000-0000</Text>
      </View>
      <View style={styles.flexContainer}>
        <View style={styles.borderContainer}>
          <View style={styles.flexRow}>
            <Text style={[styles.nameTxt, styles.semiBoldFont]}>Date:</Text>
            <Text style={[styles.answerTxt, styles.normalFont]}>12/06/2023</Text>
          </View>
          <View style={styles.hr} />

          <View style={styles.flexRow}>
            <Text style={[styles.nameTxt, styles.semiBoldFont]}>Patient Name:</Text>
            <Text style={[styles.answerTxt, styles.normalFont]}>{name}</Text>
          </View>
          <View style={styles.hr} />
          <View style={styles.flexRow}>
            <Text style={[styles.nameTxt, styles.semiBoldFont]}>Address:</Text>
            <Text style={[styles.answerTxt, styles.normalFont]}>Sangli</Text>
          </View>
          <View style={styles.hr} />
          <View style={styles.flexRow}>
            <Text style={[styles.nameTxt, styles.semiBoldFont]}>Consultant:</Text>
            <Text style={[styles.answerTxt, styles.normalFont]}>Dr Vivek</Text>
          </View>
        </View>
        <View style={styles.tableHead}>
          <View style={[styles.tableHeadCell, styles.brderLeft, { width: "10%", height: "100%" }]}>
            <Text style={[styles.nameTxt, styles.semiBoldFont]}>Sr.</Text>
          </View>
          <View style={[styles.tableHeadCell, { width: "40%", height: "100%" }]}>
            <Text style={[styles.nameTxt, styles.semiBoldFont]}>Particulars:</Text>
          </View>
          <View style={[styles.tableHeadCell, { width: "10%", height: "100%" }]}>
            <Text style={[styles.nameTxt, styles.semiBoldFont]}>Oty.</Text>
          </View>
          ap
          <View style={[styles.tableHeadCell, { width: "20%", height: "100%" }]}>
            <Text style={[styles.nameTxt, styles.semiBoldFont]}>Rate</Text>
          </View>
          <View style={[styles.tableHeadCell, { width: "20%", height: "100%" }]}>
            <Text style={[styles.nameTxt, styles.semiBoldFont]}>Total</Text>
          </View>
        </View>
        {particular?.map((item, index) => {
          if (!item?.qty) {
            return
          }
          return (
            <View style={styles.tableRow} key={index + 1}>
              <View
                style={[
                  styles.tableRowCell,
                  styles.brderLeft,
                  { width: "10%", height: "100%" },
                  index + 1 === particular?.length ? styles.borderDwn : "",
                  index === 0 ? styles.borderTp : ""
                ]}>
                <Text style={[styles.nameTxt, styles.normalFont]}>{index + 1}</Text>
              </View>

              <View
                style={[
                  styles.tableRowCell,
                  { width: "40%", height: "100%" },
                  index + 1 === particular?.length ? styles.borderDwn : "",
                  index === 0 ? styles.borderTp : ""
                ]}>
                <Text style={[styles.nameTxt, styles.normalFont]}>{item.item}</Text>
              </View>
              <View
                style={[
                  styles.tableRowCell,
                  { width: "10%", height: "100%" },
                  index + 1 === particular?.length ? styles.borderDwn : "",
                  index === 0 ? styles.borderTp : ""
                ]}>
                <Text style={[styles.nameTxt, styles.normalFont]}>{item?.qty}</Text>
              </View>
              <View
                style={[
                  styles.tableRowCell,
                  { width: "20%", height: "100%" },
                  index + 1 === particular?.length ? styles.borderDwn : "",
                  index === 0 ? styles.borderTp : ""
                ]}>
                <Text style={[styles.nameTxt, styles.normalFont]}>₹ {item?.charge_per_item}</Text>
              </View>
              <View
                style={[
                  styles.tableRowCell,
                  { width: "20%", height: "100%" },
                  index + 1 === particular?.length ? styles.borderDwn : "",
                  index === 0 ? styles.borderTp : ""
                ]}>
                <Text style={[styles.nameTxt, styles.normalFont]}>
                  ₹ {item?.qty * item?.charge_per_item}
                </Text>
              </View>
            </View>
          )
        })}
        <View style={styles.tableFooter}>
          <View
            style={[
              styles.tableFotterCell,
              styles.brderLeft,
              { width: "60%", height: "100%" },
              styles.borderDwn
            ]}>
            <Text style={[styles.nameTxt, styles.normalFont]}></Text>
          </View>
          <View style={[styles.footerCell, { width: "40%", height: "100%" }, styles.borderDwn]}>
            <Text style={[styles.nameTxt, styles.extraBoldFont]}>Total</Text>
            <Text style={[styles.nameTxt, styles.extraBoldFont]}>
              ₹{" "}
              {particular?.reduce((accumulator, ci) => {
                return (accumulator = accumulator + Number(ci?.qty) * Number(ci?.charge_per_item))
              }, 0)}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.flexContainer}></View>
    </Page>
  </Document>
)

// Font.register({
//   family: "Oswald",
//   src: "https://fonts.gstatic.com/s/oswald/v13/Y_TKV6o8WovbUd3m_X9aAA.ttf"
// })

const styles = StyleSheet.create({
  body: {
    paddingTop: 35,
    paddingBottom: 65,
    paddingHorizontal: 35
  },
  title: {
    fontSize: 24,
    textAlign: "center",
    fontFamily: "Oswald"
  },
  author: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 40
  },
  subtitle: {
    fontSize: 18,
    margin: 12,
    fontFamily: "Oswald"
  },
  text: {
    margin: 12,
    fontSize: 14,
    textAlign: "justify",
    fontFamily: "Times-Roman"
  },
  image: {
    marginVertical: 15,
    marginHorizontal: 100
  },

  pageNumber: {
    position: "absolute",
    fontSize: 12,
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: "center",
    color: "grey"
  },
  header: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 24,
    fontWeight: 700,
    marginTop: 5
  },
  address: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 14,
    marginTop: 5,
    textAlign: "center",
    fontFamily: "Inter",
    fontWeight: 400
  },
  borderContainer: {
    border: "1px solid black",
    width: "100%",
    padding: "1.5% 1.5%",
    paddingTop: "0%"
  },
  flexContainer: {
    padding: "0 3%",
    width: "100%",
    marginTop: 18
  },
  nameTxt: {
    fontSize: 14,
    fontWeight: 500
  },
  answerTxt: {
    fontSize: 15,
    fontFamily: "Times-Roman",
    fontWeight: 200,
    marginLeft: 6
  },
  flexRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center"
  },
  hr: {
    width: "103%",
    marginLeft: "-1.5%",
    marginTop: 4,
    marginBottom: 4,
    borderTop: "1px solid gray"
  },
  mediumFont: {
    fontFamily: "Inter",
    fontWeight: 500
  },
  normalFont: {
    fontFamily: "Inter",
    fontWeight: 400
  },
  semiBoldFont: {
    fontFamily: "Inter",
    fontWeight: 600
  },
  boldFont: {
    fontFamily: "Inter",
    fontWeight: 700
  },
  extraBoldFont: {
    fontFamily: "Inter",
    fontWeight: 800
  },
  tableContainer: {
    marginTop: 8
  },
  tableHead: {
    height: 50,
    display: "flex",
    flexDirection: "row",
    marginTop: 6
  },
  tableHeadCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    borderRight: "1px solid black",
    flexDirection: "row",
    borderTop: "1px solid black"
  },
  brderLeft: {
    borderLeft: "1px solid black"
  },
  tableRow: {
    height: 40,
    display: "flex",
    flexDirection: "row"
  },
  tableRowCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    borderRight: "1px solid black",
    flexDirection: "row",
    borderBottom: "1px solid black"
  },
  borderTp: {
    borderTop: "1px solid black"
  },
  tableFotterCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    borderRight: "1px solid black",
    flexDirection: "row"
  },
  footerCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-around",
    textAlign: "center",
    borderRight: "1px solid black",
    flexDirection: "row"
  },

  borderDwn: {
    borderBottom: "1px solid black"
  },
  tableFooter: {
    height: 40,
    display: "flex",
    flexDirection: "row"
  }
})
