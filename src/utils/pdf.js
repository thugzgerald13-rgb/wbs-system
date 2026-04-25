import html2pdf from "html2pdf.js";

export function exportPDF(selector = ".paper") {
  const element = document.querySelector(selector);
  if (!element) return alert("No printable content found");

  html2pdf().from(element).save("billing.pdf");
}
