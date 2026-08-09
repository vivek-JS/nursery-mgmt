import React from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import { contentPaperSx, tableHeadSx, tableRowSx } from "../utils/pipelineTheme";

export default function PipelineDataTable({ columns, rows, emptyMessage = "No records yet." }) {
  return (
    <TableContainer sx={contentPaperSx}>
      <Table size="small">
        <TableHead sx={tableHeadSx}>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col.key} align={col.align ?? "left"}>
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {!rows?.length ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ py: 4, color: "text.secondary" }}>
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.key} sx={tableRowSx}>
                {columns.map((col) => (
                  <TableCell key={col.key} align={col.align ?? "left"}>
                    {col.render ? col.render(row.data) : row.data[col.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
