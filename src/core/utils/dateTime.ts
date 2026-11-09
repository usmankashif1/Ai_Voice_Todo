import type { TaskDateLabel } from '../../screens/home/home.types';

export interface CurrentDateTimeContext {
    date: string;
    time: string;
    timeZone: string;
}

export const getCurrentDateTimeContext = (now = new Date()): CurrentDateTimeContext => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts = new Intl.DateTimeFormat('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
        timeZone,
    }).formatToParts(now);
    const getPart = (type: 'hour' | 'minute' | 'second') => {
        const value = parts.find(part => part.type === type)?.value;
        if (!value) {
            throw new Error(`Could not resolve the local ${type}.`);
        }
        return value;
    };
    const getDatePart = (type: 'year' | 'month' | 'day') => {
        const value = parts.find(part => part.type === type)?.value;
        if (!value) {
            throw new Error(`Could not resolve the local ${type}.`);
        }
        return value;
    };

    return {
        date: `${getDatePart('year')}-${getDatePart('month')}-${getDatePart('day')}`,
        time: `${getPart('hour')}:${getPart('minute')}:${getPart('second')}`,
        timeZone,
    };
};

export const getTaskDateLabel = (dueDate: string | null, today = new Date()): TaskDateLabel => {
    if (!dueDate) {
        return 'No Date';
    }

    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const taskDate = new Date(`${dueDate}T00:00:00`);
    const dayDifference = Math.round((taskDate.getTime() - todayDate.getTime()) / 86_400_000);

    if (dayDifference < 0) return 'Overdue';
    if (dayDifference === 0) return 'Today';
    if (dayDifference === 1) return 'Tomorrow';
    return 'Upcoming';
};

export const formatTime12Hour = (time: string): string => {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
        return time;
    }

    const [hours, minutes] = time.split(':').map(Number);
    const period = hours < 12 ? 'AM' : 'PM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
};

export const getLocalDueDate = (dueDate: string, dueTime: string): Date => {
    const [year, month, day] = dueDate.split('-').map(Number);
    const [hour, minute] = dueTime.split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute, 0, 0);
};
