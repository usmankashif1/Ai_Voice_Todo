import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import DateTimePicker, {
    DateTimePickerAndroid,
    type DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import { RF, RS } from '../../../core/utils/responsive';
import { taskTheme } from '../../../core/theme/taskTheme';
import { formatTime12Hour } from '../../../core/utils/dateTime';
import type { ExtractedTask, Task, TaskPriority } from '../home.types';
import { validateExtractedTasks } from '../taskValidation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TaskEditorModalProps {
    task: Task | null;
    visible: boolean;
    saving: boolean;
    modalTitle?: string;
    onCancel: () => void;
    onSave: (task: ExtractedTask) => Promise<boolean>;
}

const priorities: TaskPriority[] = ['low', 'medium', 'high'];

type PickerMode = 'date' | 'time';

const parseLocalDate = (date: string, time: string): Date => {
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    if (year && month && day) {
        return new Date(year, month - 1, day, hours || 0, minutes || 0);
    }
    return new Date();
};

const formatDateValue = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatTimeValue = (date: Date): string =>
    `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

const formatDateLabel = (date: string): string => {
    if (!date) return 'Select date';
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const formatTimeLabel = (time: string): string => {
    if (!time) return 'Select time';
    return formatTime12Hour(time);
};

const TaskEditorModal = ({
    task,
    visible,
    saving,
    modalTitle = 'Edit task',
    onCancel,
    onSave,
}: TaskEditorModalProps) => {
    const insets = useSafeAreaInsets();
    const [title, setTitle] = useState(task?.title ?? '');
    const [description, setDescription] = useState(task?.description ?? '');
    const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
    const [dueTime, setDueTime] = useState(task?.dueTime ?? '');
    const [reminderEnabled, setReminderEnabled] = useState(task?.reminderEnabled ?? false);
    const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium');
    const [error, setError] = useState('');
    const [activePicker, setActivePicker] = useState<PickerMode | null>(null);

    const handlePickerChange = (_event: DateTimePickerChangeEvent, selectedDate: Date) => {
        if (activePicker === 'date') {
            setDueDate(formatDateValue(selectedDate));
        } else if (activePicker === 'time') {
            setDueTime(formatTimeValue(selectedDate));
        }
    };

    const openPicker = (mode: PickerMode) => {
        const value = parseLocalDate(dueDate, dueTime);
        if (Platform.OS === 'android') {
            DateTimePickerAndroid.open({
                value,
                mode,
                is24Hour: false,
                onValueChange: (_event, selectedDate) => {
                    if (mode === 'date') {
                        setDueDate(formatDateValue(selectedDate));
                    } else {
                        setDueTime(formatTimeValue(selectedDate));
                    }
                },
            });
            return;
        }
        setActivePicker(current => current === mode ? null : mode);
    };

    const handleSave = async () => {
        try {
            const [validatedTask] = validateExtractedTasks([{
                title,
                description: description.trim() || undefined,
                dueDate: dueDate.trim() || null,
                dueTime: dueTime.trim() || null,
                reminderEnabled,
                priority,
                dateAmbiguous: dueDate.trim() ? false : task?.dateAmbiguous ?? false,
                ambiguityNote: dueDate.trim() ? undefined : task?.ambiguityNote,
            }]);
            if (!validatedTask) {
                throw new Error('Enter a task title before saving.');
            }
            if (!await onSave(validatedTask)) {
                setError('Could not save the task. Please try again.');
            }
        } catch (validationError) {
            setError(validationError instanceof Error ? validationError.message : 'Check the task details.');
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onCancel}
        >
            <KeyboardAvoidingView
                style={styles.keyboardAvoiding}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.backdrop}>
                    <View style={styles.sheet}>
                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={[
                                styles.content,
                                { paddingBottom: RS(36) + insets.bottom },
                            ]}
                        >
                        <Text style={styles.title}>{modalTitle}</Text>
                        <Text style={styles.label}>Title</Text>
                        <TextInput
                            style={styles.input}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Task title"
                            accessibilityLabel="Task title"
                        />

                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.descriptionInput]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Optional details"
                            multiline
                            textAlignVertical="top"
                            accessibilityLabel="Task description"
                        />

                        <View style={styles.dateTimeRow}>
                            <View style={styles.dateField}>
                                <Text style={styles.label}>Due date</Text>
                                <View style={styles.pickerValueRow}>
                                    <TouchableOpacity
                                        style={styles.pickerValue}
                                        onPress={() => openPicker('date')}
                                        accessibilityRole="button"
                                        accessibilityLabel="Select due date"
                                    >
                                        <Text style={[styles.pickerText, !dueDate && styles.placeholder]}>
                                            {formatDateLabel(dueDate)}
                                        </Text>
                                    </TouchableOpacity>
                                    {dueDate ? (
                                        <TouchableOpacity
                                            style={styles.clearPicker}
                                            onPress={() => setDueDate('')}
                                            accessibilityRole="button"
                                            accessibilityLabel="Clear due date"
                                        >
                                            <Text style={styles.clearPickerText}>×</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            </View>
                            <View style={styles.timeField}>
                                <Text style={styles.label}>Time</Text>
                                <View style={styles.pickerValueRow}>
                                    <TouchableOpacity
                                        style={styles.pickerValue}
                                        onPress={() => openPicker('time')}
                                        accessibilityRole="button"
                                        accessibilityLabel="Select due time"
                                    >
                                        <Text style={[styles.pickerText, !dueTime && styles.placeholder]}>
                                            {formatTimeLabel(dueTime)}
                                        </Text>
                                    </TouchableOpacity>
                                    {dueTime ? (
                                        <TouchableOpacity
                                            style={styles.clearPicker}
                                            onPress={() => setDueTime('')}
                                            accessibilityRole="button"
                                            accessibilityLabel="Clear due time"
                                        >
                                            <Text style={styles.clearPickerText}>×</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            </View>
                        </View>
                        {Platform.OS === 'ios' && activePicker ? (
                            <View style={styles.inlinePicker}>
                                <DateTimePicker
                                    value={parseLocalDate(dueDate, dueTime)}
                                    mode={activePicker}
                                    display="spinner"
                                    locale={activePicker === 'time' ? 'en_US' : undefined}
                                    onValueChange={handlePickerChange}
                                    themeVariant="light"
                                />
                                <TouchableOpacity
                                    style={styles.pickerDone}
                                    onPress={() => setActivePicker(null)}
                                >
                                    <Text style={styles.pickerDoneText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}
                        <Text style={styles.hint}>Choose a date and time for this task.</Text>

                        <Text style={styles.label}>Priority</Text>
                        <View style={styles.priorityRow}>
                            {priorities.map(value => (
                                <TouchableOpacity
                                    key={value}
                                    style={[
                                        styles.priorityButton,
                                        priority === value && styles.prioritySelected,
                                    ]}
                                    onPress={() => setPriority(value)}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected: priority === value }}
                                >
                                    <Text
                                        style={[
                                            styles.priorityText,
                                            priority === value && styles.priorityTextSelected,
                                        ]}
                                    >
                                        {value.charAt(0).toUpperCase() + value.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.reminderRow}>
                            <View style={styles.reminderCopy}>
                                <Text style={styles.label}>Reminder</Text>
                                <Text style={styles.hint}>Requires a future date and time.</Text>
                            </View>
                            <Switch
                                value={reminderEnabled}
                                onValueChange={setReminderEnabled}
                                trackColor={{
                                    false: taskTheme.colors.borderStrong,
                                    true: taskTheme.colors.primary,
                                }}
                                accessibilityLabel="Enable task reminder"
                            />
                        </View>

                        {error ? <Text style={styles.error}>{error}</Text> : null}

                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={onCancel}
                                disabled={saving}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveButton, saving && styles.disabledButton]}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save task'}</Text>
                            </TouchableOpacity>
                        </View>
                        </ScrollView>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    keyboardAvoiding: {
        flex: 1,
    },
    backdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(24, 28, 38, 0.45)',
    },
    sheet: {
        maxHeight: '92%',
        backgroundColor: taskTheme.colors.surface,
        borderTopLeftRadius: RS(taskTheme.radius.lg),
        borderTopRightRadius: RS(taskTheme.radius.lg),
    },
    content: {
        padding: RS(taskTheme.spacing.xl),
        paddingBottom: RS(36),
    },
    title: {
        color: taskTheme.colors.text,
        fontSize: RF(22),
        fontWeight: '800',
        marginBottom: RS(taskTheme.spacing.lg),
    },
    label: {
        color: taskTheme.colors.text,
        fontSize: RF(14),
        fontWeight: '600',
        marginBottom: RS(taskTheme.spacing.xs),
    },
    input: {
        minHeight: RS(48),
        borderWidth: 1,
        borderColor: taskTheme.colors.borderStrong,
        borderRadius: RS(taskTheme.radius.sm),
        color: taskTheme.colors.text,
        fontSize: RF(15),
        paddingHorizontal: RS(taskTheme.spacing.md),
        marginBottom: RS(taskTheme.spacing.md),
    },
    descriptionInput: {
        minHeight: RS(76),
        paddingTop: RS(taskTheme.spacing.md),
    },
    dateTimeRow: {
        flexDirection: 'row',
        gap: RS(taskTheme.spacing.md),
    },
    dateField: {
        flex: 1.3,
    },
    timeField: {
        flex: 1,
    },
    pickerValueRow: {
        minHeight: RS(48),
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: taskTheme.colors.borderStrong,
        borderRadius: RS(taskTheme.radius.sm),
        marginBottom: RS(taskTheme.spacing.md),
    },
    pickerValue: {
        flex: 1,
        minHeight: RS(46),
        justifyContent: 'center',
        paddingHorizontal: RS(taskTheme.spacing.md),
    },
    pickerText: {
        color: taskTheme.colors.text,
        fontSize: RF(15),
    },
    placeholder: {
        color: taskTheme.colors.textSecondary,
    },
    clearPicker: {
        width: RS(40),
        height: RS(46),
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearPickerText: {
        color: taskTheme.colors.textSecondary,
        fontSize: RF(22),
    },
    inlinePicker: {
        alignItems: 'center',
        marginBottom: RS(taskTheme.spacing.md),
    },
    pickerDone: {
        alignSelf: 'flex-end',
        paddingVertical: RS(taskTheme.spacing.sm),
        paddingHorizontal: RS(taskTheme.spacing.md),
    },
    pickerDoneText: {
        color: taskTheme.colors.primary,
        fontSize: RF(14),
        fontWeight: '700',
    },
    hint: {
        color: taskTheme.colors.textSecondary,
        fontSize: RF(12),
        lineHeight: RF(17),
        marginBottom: RS(taskTheme.spacing.md),
    },
    priorityRow: {
        flexDirection: 'row',
        gap: RS(taskTheme.spacing.sm),
        marginBottom: RS(taskTheme.spacing.lg),
    },
    priorityButton: {
        minHeight: RS(40),
        justifyContent: 'center',
        borderRadius: RS(taskTheme.radius.sm),
        borderWidth: 1,
        borderColor: taskTheme.colors.borderStrong,
        paddingHorizontal: RS(taskTheme.spacing.md),
    },
    prioritySelected: {
        borderColor: taskTheme.colors.primary,
        backgroundColor: taskTheme.colors.primary,
    },
    priorityText: {
        color: taskTheme.colors.textSecondary,
        fontSize: RF(13),
        fontWeight: '600',
    },
    priorityTextSelected: {
        color: taskTheme.colors.white,
    },
    reminderRow: {
        minHeight: RS(56),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    reminderCopy: {
        flex: 1,
    },
    error: {
        color: taskTheme.colors.danger,
        fontSize: RF(13),
        lineHeight: RF(19),
        marginTop: RS(taskTheme.spacing.sm),
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: RS(taskTheme.spacing.sm),
        marginTop: RS(taskTheme.spacing.xl),
    },
    cancelButton: {
        minHeight: RS(48),
        justifyContent: 'center',
        paddingHorizontal: RS(taskTheme.spacing.lg),
    },
    cancelText: {
        color: taskTheme.colors.textSecondary,
        fontSize: RF(14),
        fontWeight: '600',
    },
    saveButton: {
        minHeight: RS(48),
        justifyContent: 'center',
        borderRadius: RS(taskTheme.radius.sm),
        backgroundColor: taskTheme.colors.primary,
        paddingHorizontal: RS(taskTheme.spacing.xl),
    },
    disabledButton: {
        opacity: 0.6,
    },
    saveText: {
        color: taskTheme.colors.white,
        fontSize: RF(14),
        fontWeight: '700',
    },
});

export default TaskEditorModal;
