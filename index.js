import express from "express";
import bodyParser from "body-parser";
import puppeteer from "puppeteer";
import htmlDocx from "html-docx-js";
import fs from "fs";

const app = express();
app.use(bodyParser.json({ limit: "10mb" }));

app.post("/api/export", async (req, res) => {
  const { htmlContent, cssContent = "", format } = req.body;

  if (!htmlContent || !["pdf", "docx"].includes(format)) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>${cssContent}</style>
      </head>
      <body>${htmlContent}</body>
    </html>
  `;

  try {
    if (format === "pdf") {
      const browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.setContent(fullHtml, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
      await browser.close();

      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="resume.pdf"',
      });
      return res.send(pdfBuffer);
    } else if (format === "docx") {
      const docxBuffer = htmlDocx.asBlob(fullHtml);
      res.set({
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="resume.docx"',
      });
      return res.send(docxBuffer);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to generate document" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// POST /api/export
// Content-Type: application/json

// {
//   "htmlContent": "<h1>Hello World</h1><p>This is a test.</p>",
//   "cssContent": "h1 { color: red; }",
//   "format": "pdf"
// }
