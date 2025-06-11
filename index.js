import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/tailor', async (req, res) => {
  const { resume, jobDescription } = req.body;

  if (!resume || !jobDescription) {
    return res.status(400).json({ error: 'Resume and job description are required.' });
  }

  try {
    const chat = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a resume optimization assistant.',
        },
        {
          role: 'user',
          content: `Here is my resume:\n${resume}\n\nAnd here is the job description:\n${jobDescription}\n\nPlease tailor the resume so it aligns better with the job posting.`,
        },
      ],
    });

    const tailored = chat.choices?.[0]?.message?.content;
    res.json({ tailoredResume: tailored || 'No tailored resume was generated.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to connect to OpenAI' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
