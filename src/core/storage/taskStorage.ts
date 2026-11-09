import * as SQLite from 'expo-sqlite';
import type { ExtractedTask, Task, TaskPriority } from '../../screens/home/home.types';

interface TaskRow {
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    due_time: string | null;
    reminder_enabled: number;
    priority: TaskPriority;
    date_ambiguous: number;
    ambiguity_note: string | null;
    created_at: string;
    is_completed: number;
    notification_id: string | null;
}

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

const getDatabase = (): Promise<SQLite.SQLiteDatabase> => {
    if (!databasePromise) {
        databasePromise = SQLite.openDatabaseAsync('voice-tasks.db')
            .then(async database => {
                await database.execAsync(`
                    PRAGMA journal_mode = WAL;
                    CREATE TABLE IF NOT EXISTS tasks (
                        id TEXT PRIMARY KEY NOT NULL,
                        title TEXT NOT NULL,
                        description TEXT,
                        due_date TEXT,
                        due_time TEXT,
                        reminder_enabled INTEGER NOT NULL DEFAULT 0,
                        priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
                        date_ambiguous INTEGER NOT NULL DEFAULT 0,
                        ambiguity_note TEXT,
                        created_at TEXT NOT NULL,
                        is_completed INTEGER NOT NULL DEFAULT 0,
                        notification_id TEXT
                    );
                    CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks(due_date, due_time);
                `);
                await database.runAsync("UPDATE tasks SET priority = 'high' WHERE priority != 'high'");
                return database;
            })
            .catch(error => {
                databasePromise = null;
                throw error;
            });
    }
    return databasePromise;
};

const toTask = (row: TaskRow): Task => ({
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    dueDate: row.due_date,
    dueTime: row.due_time,
    reminderEnabled: row.reminder_enabled === 1,
    priority: 'high',
    dateAmbiguous: row.date_ambiguous === 1,
    ambiguityNote: row.ambiguity_note ?? undefined,
    createdAt: row.created_at,
    isCompleted: row.is_completed === 1,
    notificationId: row.notification_id,
});

const createTaskId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const getStoredTasks = async (): Promise<Task[]> => {
    const database = await getDatabase();
    const rows = await database.getAllAsync<TaskRow>(
        'SELECT * FROM tasks ORDER BY is_completed ASC, due_date IS NULL, due_date, due_time, created_at DESC',
    );
    return rows.map(toTask);
};

export const insertTasks = async (drafts: ExtractedTask[]): Promise<Task[]> => {
    const database = await getDatabase();
    const createdAt = new Date().toISOString();
    const tasks = drafts.map<Task>(draft => ({
        ...draft,
        id: createTaskId(),
        createdAt,
        isCompleted: false,
        notificationId: null,
    }));

    await database.withTransactionAsync(async () => {
        for (const task of tasks) {
            await database.runAsync(
                `INSERT INTO tasks (
                    id, title, description, due_date, due_time, reminder_enabled,
                    priority, date_ambiguous, ambiguity_note, created_at,
                    is_completed, notification_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                task.id,
                task.title,
                task.description ?? null,
                task.dueDate,
                task.dueTime,
                task.reminderEnabled ? 1 : 0,
                'high',
                task.dateAmbiguous ? 1 : 0,
                task.ambiguityNote ?? null,
                task.createdAt,
                0,
                null,
            );
        }
    });
    return tasks;
};

export const updateStoredTask = async (task: Task): Promise<void> => {
    const database = await getDatabase();
    await database.runAsync(
        `UPDATE tasks SET
            title = ?, description = ?, due_date = ?, due_time = ?,
            reminder_enabled = ?, priority = ?, date_ambiguous = ?,
            ambiguity_note = ?, is_completed = ?, notification_id = ?
        WHERE id = ?`,
        task.title,
        task.description ?? null,
        task.dueDate,
        task.dueTime,
        task.reminderEnabled ? 1 : 0,
        'high',
        task.dateAmbiguous ? 1 : 0,
        task.ambiguityNote ?? null,
        task.isCompleted ? 1 : 0,
        task.notificationId,
        task.id,
    );
};

export const deleteStoredTask = async (id: string): Promise<void> => {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM tasks WHERE id = ?', id);
};
