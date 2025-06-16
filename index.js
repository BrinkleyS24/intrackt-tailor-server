import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import puppeteer from 'puppeteer';
import { marked } from 'marked'; 

process.env.PUPPETEER_CACHE_DIR = './.cache/puppeteer';


dotenv.config();

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(cors());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

marked.setOptions({
  breaks: true,
  gfm: true,
});

const mockMode = true;

app.post('/tailor', async (req, res) => {
  const { resume, jobDescription, isPremium } = req.body;

  if (!resume || !jobDescription) {
    return res.status(400).json({ error: 'Resume and job description are required.' });
  }

  if (mockMode) {
    console.log("Server: Running in mock mode.");
    const mockMarkdown = `## MOCKED SUMMARY\n\n- Improved efficiency by 25%\n- Reduced costs by 15% for the project described in "${jobDescription.slice(0, 40)}..."`;
    const mockHtml = marked(mockMarkdown); 
    return res.json({
        tailoredResumeMarkdown: mockMarkdown,
        tailoredResumeHtml: mockHtml,
    });
  }

  try {
    const modelToUse = isPremium ? "gpt-4o" : "gpt-3.5-turbo";
    console.log(`Server: Tailoring with model: ${modelToUse} (isPremium: ${isPremium})`);

    const response = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        {
          role: "system",
          content: `You are a professional resume optimization assistant... (rest of your prompt is fine)`,
        },
        {
          role: "user",
          content: `Here is my original resume:\n${resume}\n\nHere is the job description:\n${jobDescription}\n\nProvide the tailored resume in Markdown, strictly following all the guidelines.`,
        },
      ],
      temperature: 0.5,
      max_tokens: 1500,
    });

    const tailoredMarkdown = response.choices?.[0]?.message?.content;

    if (!tailoredMarkdown) {
      throw new Error("No tailored content received from OpenAI API.");
    }

    // Convert the Markdown from OpenAI to HTML here on the server
    const tailoredHtml = marked(tailoredMarkdown);

    // Send both formats to the client
    res.json({
        tailoredResumeMarkdown: tailoredMarkdown,
        tailoredResumeHtml: tailoredHtml
    });

  } catch (error) {
    console.error("Error tailoring resume:", error);
    if (error.response && error.response.data && error.response.data.error) {
      res.status(error.response.status || 500).json({ error: `OpenAI API Error: ${error.response.data.error.message}` });
    } else {
      res.status(500).json({ error: error.message || "Failed to tailor resume." });
    }
  }
});


app.post('/generate-pdf', async (req, res) => {
  // This endpoint now receives the *final* HTML string ready for PDF generation
  const { html } = req.body;
  if (!html) return res.status(400).json({ error: "Missing HTML content." });

  try {
    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });

    const page = await browser.newPage();
    // The 'html' variable already contains the full, styled document
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'letter',
      printBackground: true,
      margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' }
    });

    await browser.close();
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=tailored_resume.pdf',
    });
    res.send(pdf);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate PDF.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});