// import * as React from "react"
// import { render } from "react-dom"
// import {
//   Cell,
//   PieChart,
//   Pie,
//   Tooltip,
//   ContentRenderer,
//   PieLabelRenderProps,
//   ResponsiveContainer
// } from "recharts"

// const data = [
//   { name: "Group A", value: 400 },
//   { name: "Group B", value: 300 },
//   { name: "Group C", value: 300 },
//   { name: "Group D", value: 200 }
// ]
// const COLORS = [
//   "#408fda",
//   "#73b0ed",
//   "#c1deff",
//   "#aeefc8",
//   "#86deaa",
//   "#73c897",
//   "#9180cc",
//   "#c1aff6",
//   "#cadad8",
//   "#9bb4b1",
//   "#7ea4a8"
// ]

// const RADIAN = Math.PI / 180
// const textStyles = { fontWeight: "bold" }
// const RenderCustomizedLabel = () => {
//   const iRadius = 0
//   const oRadius = 0
//   const mAngle = 0
//   const chartX = 0
//   const chartY = 0
//   const percentage = 0

//   const radius = iRadius + (oRadius - iRadius) * 0.3
//   const x = chartX + radius * Math.cos(-mAngle * RADIAN)
//   const y = chartY + radius * Math.sin(-mAngle * RADIAN)

//   return (
//     <text
//       x={x}
//       y={y}
//       fill="white"
//       textAnchor={x > chartX ? "start" : "end"}
//       dominantBaseline="central"
//       style={textStyles}>
//       {`${(percentage * 100).toFixed(0)}%`}
//     </text>
//   )
// }

// const style = {
//   backgroundColor: "#4a4a4a",
//   color: "#fefefe",
//   padding: "2px 20px",
//   borderRadius: 5,
//   fontSize: "14px"
// }
// const CustomizedTooltip = React.memo((props) => {
//   if (props.payload.length > 0) {
//     const data = props.payload[0]
//     return (
//       <div style={style}>
//         <p>{data.name}</p>
//         <p>{data.value}</p>
//       </div>
//     )
//   }
//   return null
// })

const SimplePieChart = () => {
  //   return (
  //     <ResponsiveContainer width="100%" maxHeight={330}>
  //       <PieChart>
  //         <Tooltip content={<CustomizedTooltip />} />
  //         <Pie
  //           dataKey="value"
  //           data={data}
  //           cx={300}
  //           cy={200}
  //           labelLine={false}
  //           label={RenderCustomizedLabel}
  //           innerRadius={100}>
  //           {data.map((entry, index) => (
  //             <Cell fill={COLORS[index % COLORS.length]} key={`cell-${index}`} />
  //           ))}
  //         </Pie>
  //       </PieChart>
  //     </ResponsiveContainer>
  //   )
  // }
}

export default SimplePieChart
