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
      tailoredResume: `📄 MOCKED (Server): Tailored resume for \"${jobDescription.slice(0, 40)}...\" ✅\n\n- Improved efficiency by 25%\n- Reduced costs by 15%`,
    });
  }

  try {
    // CONDITIONAL MODEL SELECTION
    const modelToUse = isPremium ? "gpt-4o" : "gpt-3.5-turbo";
    console.log(`Server: Tailoring with model: ${modelToUse} (isPremium: ${isPremium})`);

    const response = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        {
          role: "system",
          content: `You are a professional resume optimization assistant. Your task is to tailor a user's resume to a given job description.
          
          Guidelines:
          - Output MUST be in clean Markdown format.
          - Include ONLY the following sections: SUMMARY, SKILLS, PROFESSIONAL EXPERIENCE, PROJECTS, EDUCATION.
          - Absolutely DO NOT include any other sections, such as 'ADDITIONAL INFORMATION', 'CONTACT', 'CERTIFICATIONS', or any introductory/concluding conversational text.
          - Focus on aligning keywords and phrases from the job description with the resume content.
          - Wherever possible, enhance existing bullet points or create new ones by adding quantifiable metrics and achievements (e.g., "Increased sales by 20%", "Reduced costs by $10K"). Use numbers and percentages from the original resume or infer them if contextually appropriate.
          - Maintain the overall structure and flow of the original resume as much as possible, only modifying content to match the job description and inject metrics.
          - Ensure conciseness and impactful language.`,
        },
        {
          role: "user",
          content: `Here is my original resume:\n${resume}\n\nHere is the job description:\n${jobDescription}\n\nProvide the tailored resume in Markdown, strictly following all the guidelines.`,
        },
      ],
      temperature: 0.5, 
      max_tokens: 1500, 
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
