// Test file to check environment variables
console.log("=== Environment Variables Test ===")
console.log("REACT_APP_BASE_URL:", process.env.REACT_APP_BASE_URL)
console.log("NODE_ENV:", process.env.NODE_ENV)
console.log(
  "All REACT_APP_ variables:",
  Object.keys(process.env).filter((key) => key.startsWith("REACT_APP_"))
)
console.log("=== End Test ===")
