import { generateTaskCandidates } from '../../core/api/geminiClient';
import { getCurrentDateTimeContext } from '../../core/utils/dateTime';
import type { ExtractedTask } from './home.types';
import { validateExtractedTasks } from './taskValidation';

export const extractTasksFromText = async (
    transcription: string,
    signal?: AbortSignal,
): Promise<ExtractedTask[]> => {
    const currentDateTime = getCurrentDateTimeContext();
    const candidates = await generateTaskCandidates(transcription, currentDateTime, signal);
    const tasks = validateExtractedTasks(candidates);

    if (tasks.length === 0) {
        throw new Error('No actionable tasks were found in that note.');
    }
    return tasks;
};
