export const openPdf = (instance) => {
  const link = document.createElement("a")
  link.target = "_blank"
  link.href = instance.url
  link.setAttribute("click", `${"Asdsd"}`)
  document.body.appendChild(link)
  link.click()
}
