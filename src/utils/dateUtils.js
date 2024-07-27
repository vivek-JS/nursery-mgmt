import moment from "moment"

export const GET_API_DATE = (date) => {
  return moment(date).format("YYYY-MM-DD")
}
