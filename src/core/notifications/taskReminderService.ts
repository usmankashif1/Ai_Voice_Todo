import {
    AndroidImportance,
    cancelScheduledNotificationAsync,
    getPermissionsAsync,
    requestPermissionsAsync,
    scheduleNotificationAsync,
    SchedulableTriggerInputTypes,
    setNotificationChannelAsync,
} from 'expo-notifications';
import { Platform } from 'react-native';
import { getLocalDueDate } from '../utils/dateTime';
import type { Task } from '../../screens/home/home.types';

const ANDROID_CHANNEL_ID = 'task-reminders';

export const scheduleTaskReminder = async (task: Task): Promise<string | null> => {
    if (!task.reminderEnabled || !task.dueDate || !task.dueTime) {
        return null;
    }

    const dueAt = getLocalDueDate(task.dueDate, task.dueTime);
    if (dueAt.getTime() <= Date.now()) {
        throw new Error('The reminder time is in the past. Choose a future date and time.');
    }

    if (Platform.OS === 'android') {
        await setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
            name: 'Task reminders',
            importance: AndroidImportance.DEFAULT,
        });
    }

    const currentPermission = await getPermissionsAsync();
    const permission = currentPermission.granted
        ? currentPermission
        : await requestPermissionsAsync();

    if (!permission.granted) {
        throw new Error('Notification permission was not granted. Enable it in system settings to receive reminders.');
    }

    return scheduleNotificationAsync({
        content: {
            title: task.title,
            body: task.description || 'Your task is due now.',
            data: { taskId: task.id },
            ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
        },
        trigger: {
            type: SchedulableTriggerInputTypes.DATE,
            date: dueAt,
            ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
        },
    });
};

export const cancelTaskReminder = async (notificationId: string | null): Promise<void> => {
    if (notificationId) {
        await cancelScheduledNotificationAsync(notificationId);
    }
};
