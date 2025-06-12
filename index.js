import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();

const app = express();

// Increase body parser limit for JSON payloads
// This allows larger resumes and job descriptions to be sent.
app.use(express.json({ limit: '50mb' })); // <--- ADDED/MODIFIED THIS LINE

app.use(cors()); // Keep cors after express.json if you want cors to apply to all routes

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const mockMode = true; // Set to false to enable OpenAI API calls

app.post('/tailor', async (req, res) => {
  const { resume, jobDescription } = req.body;

  if (!resume || !jobDescription) {
    return res.status(400).json({ error: 'Resume and job description are required.' });
  }

  if (mockMode) {
    console.log("Server: Running in mock mode.");
    return res.json({
      tailoredResume: `📄 MOCKED (Server): Tailored resume for \"${jobDescription.slice(0, 40)}...\" ✅`,
    });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a resume optimization assistant.",
        },
        {
          role: "user",
          content: `Here is my resume:\n${resume}\n\nAnd here is the job description:\n${jobDescription}\n\nPlease tailor the resume so it aligns better with the job posting.`,
        },
      ],
    });

    const tailored = response.choices?.[0]?.message?.content;

    if (!tailored) {
      throw new Error("No content received from OpenAI API.");
    }

    res.json({ tailoredResume: tailored });
  } catch (error) {
    console.error("Error tailoring resume with OpenAI:", error);
    res.status(500).json({ error: error.message || "Failed to tailor resume with OpenAI." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
