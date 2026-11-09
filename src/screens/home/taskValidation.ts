import type { ExtractedTask, TaskPriority } from './home.types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const isValidDate = (value: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day;
};

const isTaskPriority = (value: unknown): value is TaskPriority =>
    value === 'low' || value === 'medium' || value === 'high';

export const validateExtractedTasks = (value: unknown): ExtractedTask[] => {
    if (!Array.isArray(value)) {
        throw new Error('Gemini returned tasks in an unexpected format.');
    }

    return value.map((item, index) => {
        if (!isRecord(item)) {
            throw new Error(`Task ${index + 1} is not a valid object.`);
        }

        const {
            title,
            description,
            dueDate,
            dueTime,
            reminderEnabled,
            priority,
            dateAmbiguous,
            ambiguityNote,
        } = item;

        if (typeof title !== 'string' || !title.trim()) {
            throw new Error(`Task ${index + 1} is missing a title.`);
        }
        if (description !== undefined && description !== null && typeof description !== 'string') {
            throw new Error(`Task ${index + 1} has an invalid description.`);
        }
        if (dueDate !== null && (typeof dueDate !== 'string' || !isValidDate(dueDate))) {
            throw new Error(`Task ${index + 1} has an invalid due date.`);
        }
        if (
            dueTime !== null
            && (typeof dueTime !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(dueTime))
        ) {
            throw new Error(`Task ${index + 1} has an invalid due time.`);
        }
        if (typeof reminderEnabled !== 'boolean') {
            throw new Error(`Task ${index + 1} has an invalid reminder setting.`);
        }
        if (!isTaskPriority(priority)) {
            throw new Error(`Task ${index + 1} has an invalid priority.`);
        }
        if (typeof dateAmbiguous !== 'boolean') {
            throw new Error(`Task ${index + 1} is missing its date ambiguity status.`);
        }
        if (ambiguityNote !== undefined && ambiguityNote !== null && typeof ambiguityNote !== 'string') {
            throw new Error(`Task ${index + 1} has an invalid ambiguity note.`);
        }
        if (dateAmbiguous && dueDate !== null) {
            throw new Error(`Task ${index + 1} guesses a date marked as ambiguous.`);
        }

        return {
            title: title.trim(),
            description: typeof description === 'string' && description.trim()
                ? description.trim()
                : undefined,
            dueDate,
            dueTime,
            reminderEnabled,
            priority,
            dateAmbiguous,
            ambiguityNote: typeof ambiguityNote === 'string' && ambiguityNote.trim()
                ? ambiguityNote.trim()
                : undefined,
        };
    });
};
