import { useCallback, useEffect, useState } from 'react';
import { cancelTaskReminder, scheduleTaskReminder } from '../../../core/notifications/taskReminderService';
import {
    deleteStoredTask,
    getStoredTasks,
    insertTasks,
    updateStoredTask,
} from '../../../core/storage/taskStorage';
import { getErrorMessage } from '../../../core/utils/errorMessage';
import type { ExtractedTask, Task } from '../home.types';

const getReminderWarning = (task: Task): string =>
    `Add a date and time to schedule a reminder for "${task.title}".`;

const scheduleAndStoreReminder = async (task: Task): Promise<string | null> => {
    const notificationId = await scheduleTaskReminder(task);
    if (!notificationId) return null;

    try {
        await updateStoredTask({ ...task, notificationId });
        return notificationId;
    } catch (error) {
        await cancelTaskReminder(notificationId);
        throw error;
    }
};

const useTasks = () => {
    const [items, setItems] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reminderWarning, setReminderWarning] = useState<string | null>(null);

    const reload = useCallback(async () => {
        try {
            const storedTasks = await getStoredTasks();
            setError(null);
            setItems(storedTasks);
        } catch (loadError) {
            setError(getErrorMessage(loadError));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Load persisted SQLite state once when this hook mounts.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void reload();
    }, [reload]);

    const addTasks = useCallback(async (drafts: ExtractedTask[]) => {
        setError(null);
        setReminderWarning(null);
        try {
            const createdTasks = await insertTasks(drafts);
            const warnings: string[] = [];

            for (const task of createdTasks) {
                if (!task.reminderEnabled) continue;

                try {
                    if (!await scheduleAndStoreReminder(task)) {
                        warnings.push(getReminderWarning(task));
                    }
                } catch (scheduleError) {
                    warnings.push(
                        `Could not schedule a reminder for "${task.title}". ${getErrorMessage(scheduleError)}`,
                    );
                }
            }

            setReminderWarning(warnings.length ? warnings.join(' ') : null);
            await reload();
            return true;
        } catch (saveError) {
            setError(getErrorMessage(saveError));
            return false;
        }
    }, [reload]);

    const updateTask = useCallback(async (updatedTask: Task) => {
        setError(null);
        setReminderWarning(null);
        try {
            const existingTask = items.find(task => task.id === updatedTask.id);
            await cancelTaskReminder(existingTask?.notificationId ?? null);
            const taskWithoutReminder: Task = { ...updatedTask, notificationId: null };
            await updateStoredTask(taskWithoutReminder);

            if (taskWithoutReminder.reminderEnabled) {
                try {
                    if (!await scheduleAndStoreReminder(taskWithoutReminder)) {
                        setReminderWarning(getReminderWarning(taskWithoutReminder));
                    }
                } catch (scheduleError) {
                    setReminderWarning(
                        `Could not schedule a reminder for "${taskWithoutReminder.title}". ${getErrorMessage(scheduleError)}`,
                    );
                }
            }

            await reload();
            return true;
        } catch (saveError) {
            setError(getErrorMessage(saveError));
            return false;
        }
    }, [items, reload]);

    const toggleTaskCompletion = useCallback(async (task: Task) => {
        setError(null);
        setReminderWarning(null);
        try {
            await cancelTaskReminder(task.notificationId);
            const updatedTask: Task = {
                ...task,
                isCompleted: !task.isCompleted,
                notificationId: null,
            };
            await updateStoredTask(updatedTask);

            if (!updatedTask.isCompleted && updatedTask.reminderEnabled) {
                try {
                    if (!await scheduleAndStoreReminder(updatedTask)) {
                        setReminderWarning(getReminderWarning(updatedTask));
                    }
                } catch (scheduleError) {
                    setReminderWarning(
                        `Could not schedule a reminder for "${updatedTask.title}". ${getErrorMessage(scheduleError)}`,
                    );
                }
            }

            await reload();
        } catch (updateError) {
            setError(getErrorMessage(updateError));
        }
    }, [reload]);

    const deleteTask = useCallback(async (task: Task) => {
        setError(null);
        try {
            await cancelTaskReminder(task.notificationId);
            await deleteStoredTask(task.id);
            await reload();
        } catch (deleteError) {
            setError(getErrorMessage(deleteError));
        }
    }, [reload]);

    return {
        items,
        loading,
        error,
        reminderWarning,
        reload,
        addTasks,
        updateTask,
        toggleTaskCompletion,
        deleteTask,
    };
};

export default useTasks;
