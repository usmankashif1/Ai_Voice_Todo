import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';
import { GROQ_API_KEY } from '../utils/config';

const TRANSCRIPTION_ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions';

export const transcribeAudioWithGroq = async (
    audioUri: string,
    signal?: AbortSignal,
): Promise<string> => {
    if (!GROQ_API_KEY) {
        throw new Error('Set EXPO_PUBLIC_GROQ_API_KEY in your .env file.');
    }

    const formData = new FormData();
    formData.append('file', new File(audioUri), 'recording.m4a');
    formData.append('model', 'whisper-large-v3');
    formData.append('response_format', 'json');

    const response = await fetch(TRANSCRIPTION_ENDPOINT, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: formData,
        signal,
    });
    const contentType = response.headers.get('content-type') ?? '';
    const responseData: unknown = contentType.includes('application/json')
        ? await response.json()
        : null;

    if (!response.ok) {
        const errorMessage = typeof responseData === 'object'
            && responseData !== null
            && 'error' in responseData
            && typeof responseData.error === 'object'
            && responseData.error !== null
            && 'message' in responseData.error
            && typeof responseData.error.message === 'string'
            ? responseData.error.message
            : typeof responseData === 'object'
                && responseData !== null
                && 'error' in responseData
                && typeof responseData.error === 'string'
                ? responseData.error
                : `Could not transcribe the recording (HTTP ${response.status}).`;
        throw new Error(errorMessage);
    }

    if (
        typeof responseData !== 'object'
        || responseData === null
        || !('text' in responseData)
        || typeof responseData.text !== 'string'
        || !responseData.text.trim()
    ) {
        throw new Error('The transcription service returned an invalid response.');
    }
    return responseData.text;
};
