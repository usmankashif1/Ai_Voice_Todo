import { TASK_EXTRACTION_SYSTEM_PROMPT } from '../system_prompts/taskExtractionSystemPrompt';
import type { CurrentDateTimeContext } from '../utils/dateTime';
import { GEMINI_API_KEY } from '../utils/config';

interface GeminiResponse {
    candidates?: {
        content?: {
            parts?: { text?: string }[];
        };
    }[];
    error?: { message?: string };
}

const TASK_RESPONSE_SCHEMA = {
    type: 'ARRAY',
    items: {
        type: 'OBJECT',
        properties: {
            title: { type: 'STRING' },
            description: { type: 'STRING', nullable: true },
            dueDate: { type: 'STRING', nullable: true },
            dueTime: { type: 'STRING', nullable: true },
            reminderEnabled: { type: 'BOOLEAN' },
            priority: { type: 'STRING', enum: ['low', 'medium', 'high'] },
            dateAmbiguous: { type: 'BOOLEAN' },
            ambiguityNote: { type: 'STRING', nullable: true },
        },
        required: [
            'title',
            'dueDate',
            'dueTime',
            'reminderEnabled',
            'priority',
            'dateAmbiguous',
            'ambiguityNote',
        ],
    },
};

export const generateTaskCandidates = async (
    transcription: string,
    currentDateTime: CurrentDateTimeContext,
    signal?: AbortSignal,
): Promise<unknown> => {
    if (!transcription.trim()) {
        throw new Error('Record or enter a note before creating tasks.');
    }
    if (!GEMINI_API_KEY) {
        throw new Error('Set EXPO_PUBLIC_GEMINI_API_KEY in your .env file.');
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: TASK_EXTRACTION_SYSTEM_PROMPT }],
                },
                contents: [{
                    role: 'user',
                    parts: [{
                        text: [
                            'Current local date and time context:',
                            `Date: ${currentDateTime.date}`,
                            `Time: ${currentDateTime.time}`,
                            `IANA timezone: ${currentDateTime.timeZone}`,
                            '',
                            'Transcription:',
                            transcription.trim(),
                        ].join('\n'),
                    }],
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 3000,
                    responseMimeType: 'application/json',
                    responseSchema: TASK_RESPONSE_SCHEMA,
                },
            }),
            signal,
        },
    );
    const data = await response.json() as GeminiResponse;

    if (!response.ok) {
        throw new Error(data.error?.message || 'Gemini could not extract tasks.');
    }

    const generatedText = data.candidates?.[0]?.content?.parts
        ?.map(part => part.text ?? '')
        .join('')
        .trim();

    if (!generatedText) {
        throw new Error('Gemini returned an empty task list. Please try again.');
    }

    try {
        return JSON.parse(generatedText) as unknown;
    } catch {
        throw new Error('Gemini returned invalid JSON. Please try again.');
    }
};
