import React from "react"
import { BarChart, CartesianGrid, XAxis, YAxis, Bar, ResponsiveContainer } from "recharts"

const chartData = [
  { x: 5, y: 1508 },
  { x: 6, y: 107 },
  { x: 7, y: 325 },
  { x: 8, y: 439 },
  { x: 9, y: 982 },
  { x: 10, y: 1562 },
  { x: 11, y: 50 }
]

const Label = (props) => {
  const { x, y, value } = props

  return (
    <text
      x={x}
      y={y}
      dx={"2%"}
      dy={"-1%"}
      fontSize="15"
      fontWeight="bold"
      fill={"#181818"}
      textAnchor="left">
      {value}
    </text>
  )
}

const Barchart = () => (
  <ResponsiveContainer width="95%" height="100%">
    <BarChart data={chartData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis
        tick={{ fontSize: 8 }}
        dataKey="x"
        type="number"
        domain={[4.5, 13.5]}
        ticks={[5, 6, 7, 8, 9, 10, 11, 12, 13]}
      />
      <YAxis />
      <Bar dataKey="y" label={<Label />} fill="#8884d8" />
    </BarChart>
  </ResponsiveContainer>
)

export default Barchart
