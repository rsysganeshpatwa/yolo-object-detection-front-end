import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { useTable, usePagination } from "react-table";

// Helper function to check if a string is a number
const isNumber = (value) => {
  return !isNaN(parseFloat(value)) && isFinite(value);
};

// Helper function to format decimals
const formatDecimal = (value) => {
  if (isNumber(value)) {
    return parseFloat(value).toFixed(2); // Format to two decimal places
  }
  return value; // Return as is if not a number
};

const SummaryReport = ({ url }) => {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch and parse CSV from the provided URL
  const fetchCsvData = async () => {
    setLoading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch CSV");
      const csvText = await response.text();

      // Parse CSV
      Papa.parse(csvText, {
        header: true, // Treat the first row as headers
        skipEmptyLines: true,
        complete: (results) => {
          const parsedData = results.data; // Array of objects
          const keys = Object.keys(parsedData[0]); // Extract headers
          setColumns(
            keys.map((key) => ({
              Header: key,
              accessor: key,
            }))
          );
          setData(parsedData);
        },
      });
    } catch (error) {
      console.error("Error fetching or parsing CSV:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (url) {
      fetchCsvData();
    }
  }, [url]);

  // React-table instance with pagination hook
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state: { pageIndex, pageSize },
    canPreviousPage,
    canNextPage,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
  } = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0, pageSize: 20 }, // Set the initial page size to 20
    },
    usePagination
  );

  // Helper function to check if string length is greater than 20
  const truncateWithTooltip = (value) => {
    return value && value.length > 20 ? (
      <span title={value}>{value.substring(0, 20)}...</span>
    ) : (
      value
    );
  };

  return (
    <div>
      {/* Display the total count of rows */}
      <div style={{ marginBottom: "10px", textAlign: "center" }}>
        <strong>Total Object Detected: {data.length}</strong>
      </div>

      {/* Table with scrolling */}
      <div style={{ maxHeight: "400px", overflowY: "auto" }}>
        {loading ? (
          <p>Loading...</p>
        ) : data.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table
              {...getTableProps()}
              border="1"
              style={{
                width: "100%",
                marginTop: "20px",
                borderCollapse: "collapse",
                tableLayout: "fixed",
              }}
            >
              <thead>
                {headerGroups.map((headerGroup) => (
                  <tr
                    {...headerGroup.getHeaderGroupProps()}
                    key={headerGroup.getHeaderGroupProps().key}
                    style={{
                      position: "sticky",
                      top: 0,
                      background: "#f0f0f0",
                      zIndex: 1,
                    }}
                  >
                    {headerGroup.headers.map((column) => (
                      <th
                        {...column.getHeaderProps()}
                        key={column.getHeaderProps().key}
                        style={{
                          padding: "10px",
                          background: "#f0f0f0",
                          borderBottom: "1px solid #ddd",
                        }}
                      >
                        {column.render("Header")}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody {...getTableBodyProps()}>
                {rows.map((row,rowIndex) => {
                  prepareRow(row);
                  return (
                    <tr {...row.getRowProps()} key={row.getRowProps().key}>
                      {row.cells.map((cell) => (
                        <td
                          {...cell.getCellProps()}
                          key={cell.getCellProps().key}
                          style={{
                            padding: "10px",
                            //textAlign: "center",
                            borderBottom: "1px solid #ddd",
                          }}
                        >
                   
                    {cell.column.Header === "SR." ? rowIndex+1 : cell.value}

                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No data available</p>
        )}
      </div>

      {/* Pagination Controls outside the scrollable area */}
      <div
        style={{
          marginTop: "20px",
          textAlign: "center",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <button onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
          {"<<"}
        </button>{" "}
        <button onClick={() => previousPage()} disabled={!canPreviousPage}>
          Previous
        </button>{" "}
        <button onClick={() => nextPage()} disabled={!canNextPage}>
          Next
        </button>{" "}
        <button onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
          {">>"}
        </button>{" "}
        <span>
          Page{" "}
          <strong>
            {pageIndex + 1} of {pageCount}
          </strong>{" "}
        </span>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
        >
          {[10, 20, 30, 40, 50].map((size) => (
            <option key={size} value={size}>
              Show {size}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default SummaryReport;
