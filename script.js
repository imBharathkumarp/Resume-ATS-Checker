// Setup PDF.js worker for parsing PDFs
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// DOM Elements
const resumeUpload = document.getElementById("resumeUpload");
const jobDescription = document.getElementById("jobDescription");
const analyzeBtn = document.getElementById("analyzeBtn");
const scoreEl = document.getElementById("score");
const matchedEl = document.getElementById("matched");
const missingEl = document.getElementById("missing");
const results = document.getElementById("results");

let resumeText = "";

// Handle resume upload
resumeUpload.addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;

  const fileType = file.name.split('.').pop().toLowerCase();

  try {
    if (fileType === "pdf") {
      resumeText = await extractTextFromPDF(file);
      alert("PDF resume uploaded and processed!");
    } else if (fileType === "docx") {
      resumeText = await extractTextFromDocx(file);
      alert("DOCX resume uploaded and processed!");
    } else {
      alert("Please upload a .pdf or .docx file.");
      return;
    }

    console.log("Extracted Resume Text:", resumeText); // Debug log
  } catch (err) {
    alert("Error reading file: " + err.message);
  }
});

// Handle Analyze button click
analyzeBtn.addEventListener("click", function () {
  const jdText = jobDescription.value;

  if (!resumeText.trim() || !jdText.trim()) {
    alert("Please upload a resume and enter a job description.");
    return;
  }

  const result = compareText(resumeText, jdText);
  scoreEl.textContent = result.score;
  matchedEl.textContent = result.matched.join(", ");
  missingEl.textContent = result.missing.join(", ");
  results.classList.remove("hidden");
});

// PDF extraction using pdf.js
async function extractTextFromPDF(file) {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = async function () {
      try {
        const typedarray = new Uint8Array(this.result);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;

        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map(item => item.str);
          fullText += strings.join(" ") + "\n";
        }
        resolve(fullText);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

// DOCX extraction using mammoth.js
async function extractTextFromDocx(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      const arrayBuffer = event.target.result;
      mammoth.extractRawText({ arrayBuffer: arrayBuffer })
        .then(result => resolve(result.value))
        .catch(err => {
          console.error("DOCX parsing error:", err);
          reject(err);
        });
    };
    reader.readAsArrayBuffer(file);
  });
}

// Extract keywords ignoring stop words
function extractKeywords(text) {
  const stopWords = ["the", "and", "for", "with", "this", "that", "have", "are", "was", "you"];
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  return [...new Set(words.filter(word => !stopWords.includes(word)))];
}

// Compare resume and job description keywords
function compareText(resume, jd) {
  const resumeWords = extractKeywords(resume);
  const jdWords = extractKeywords(jd);

  const matched = jdWords.filter(word => resumeWords.includes(word));
  const missing = jdWords.filter(word => !resumeWords.includes(word));

  const score = jdWords.length ? Math.round((matched.length / jdWords.length) * 100) : 0;
  return { score, matched, missing };
}
