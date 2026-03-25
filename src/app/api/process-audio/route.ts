import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 60; // Allow enough time for Whisper + Groq to complete on Vercel Hobby

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const audioFile = formData.get('audio') as Blob | null;
        const language = formData.get('language') as string || 'en';

        if (!audioFile) {
            return NextResponse.json(
                { error: 'No audio file provided' },
                { status: 400 }
            );
        }

        if (!process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: 'API key is missing. Please add GROQ_API_KEY to your environment variables (get a free one at console.groq.com).' },
                { status: 500 }
            );
        }

        const openai = new OpenAI({
            apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
            baseURL: "https://api.groq.com/openai/v1",
        });

        // 1. Convert Blob to File object for OpenAI API
        // Next.js App Router API receives it as a standard Web Blob
        const file = new File([audioFile], 'audio.webm', { type: audioFile.type });

        // 2. Send to OpenAI Whisper for Transcription
        console.log(`Sending to Whisper API (Transcription mode - ${language})...`);
        const transcription = await openai.audio.transcriptions.create({
            file,
            model: 'whisper-large-v3',
            language: language,
            response_format: 'text', // Get raw text back
        });

        const transcriptText = transcription as unknown as string; // OpenAI SDK typing quirk
        console.log('Transcription created successfully. Length:', transcriptText.length);

        if (!transcriptText || transcriptText.trim() === '') {
            return NextResponse.json(
                { error: 'No speech detected in the audio.' },
                { status: 400 }
            );
        }

        const languageMap: Record<string, string> = {
            'en': 'English',
            'hi': 'Hindi',
            'gu': 'Gujarati'
        };
        const targetLanguageName = languageMap[language] || 'English';

        // 3. Send Transcript to GPT-4o for Structured Processing
        console.log(`Sending to Groq LLaMA for Summarization in ${targetLanguageName}...`);
        const chatResponse = await openai.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `You are an expert AI meeting assistant. Analyze the following transcript and extract:
1. Title: A short, catchy 3-4 word title for this meeting based on its content.
2. Executive Summary: A concise paragraph summarizing the meeting.
3. Key Points: A list of the most important topics discussed.
4. Action Items: A list of tasks assigned, including who is responsible if mentioned. If none, return an empty list.
5. Decisions: A list of major decisions made. If none, return an empty list.

IMPORTANT: The ENTIRE output (Title, Summary, Key Points, Action Items, Decisions) MUST be written in the ${targetLanguageName} language.

Format your response AS A VALID JSON OBJECT exactly matching this schema:
{
  "title": "String",
  "summary": "String",
  "keyPoints": ["String 1", "String 2"],
  "actionItems": ["Task 1", "Task 2"],
  "decisions": ["Decision 1"]
}
Only output the JSON object, do not use markdown code blocks or add any other text.`
                },
                {
                    role: 'user',
                    content: transcriptText
                }
            ],
            response_format: { type: "json_object" }
        });

        const rawJson = chatResponse.choices[0].message.content;

        if (!rawJson) {
            throw new Error("Failed to generate meeting insights");
        }

        const aiAnalysis = JSON.parse(rawJson);

        // 4. Return combined payload to client
        return NextResponse.json({
            transcript: transcriptText,
            insights: {
                title: aiAnalysis.title || 'Meeting Notes',
                summary: aiAnalysis.summary || 'Summary could not be generated.',
                keyPoints: aiAnalysis.keyPoints || [],
                actionItems: aiAnalysis.actionItems || [],
                decisions: aiAnalysis.decisions || []
            }
        });

    } catch (error: any) {
        console.error('Error in process-audio API:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to process audio' },
            { status: 500 }
        );
    }
}
