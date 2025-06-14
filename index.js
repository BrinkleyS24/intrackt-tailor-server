import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();

const app = express();

// Increase body parser limit for JSON payloads
// This allows larger resumes and job descriptions to be sent.
app.use(express.json({ limit: '50mb' }));

app.use(cors());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const mockMode = false; 

app.post('/tailor', async (req, res) => {
  // Destructure isPremium from the request body
  const { resume, jobDescription, isPremium } = req.body;

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
    // CONDITIONAL MODEL SELECTION
    const modelToUse = isPremium ? "gpt-4o" : "gpt-3.5-turbo"; 
    console.log(`Server: Tailoring with model: ${modelToUse} (isPremium: ${isPremium})`); 

    const response = await openai.chat.completions.create({
      model: modelToUse, // MODIFIED: Use the conditionally selected model
      messages: [
        {
          role: "system",
          content: "You are a resume optimization assistant. Tailor the user's resume to the provided job description. Ensure the tailored resume is concise, highlights relevant experience, and uses keywords from the job description naturally.",
        },
        {
          role: "user",
          content: `Here is my resume:\n${resume}\n\nAnd here is the job description:\n${jobDescription}\n\nPlease tailor the resume so it aligns better with the job posting.`,
        },
      ],
      temperature: 0.7, // Creativity level (0.0-1.0), lower for more focused, higher for more varied
      max_tokens: 1000, // Max tokens for the response
    });

    const tailored = response.choices?.[0]?.message?.content;

    if (!tailored) {
      throw new Error("No tailored content received from OpenAI API.");
    }

    res.json({ tailoredResume: tailored });
  } catch (error) {
    console.error("Error tailoring resume with OpenAI:", error);
    // Provide a more user-friendly error message if it's an OpenAI specific error
    if (error.response && error.response.data && error.response.data.error) {
        res.status(error.response.status || 500).json({ error: `OpenAI API Error: ${error.response.data.error.message}` });
    } else {
        res.status(500).json({ error: error.message || "Failed to tailor resume with OpenAI." });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
