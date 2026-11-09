// Expo inlines EXPO_PUBLIC_ variables into the mobile bundle; these keys are extractable.
export const GEMINI_API_KEY: string | undefined = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
export const GROQ_API_KEY: string | undefined = process.env.EXPO_PUBLIC_GROQ_API_KEY;
