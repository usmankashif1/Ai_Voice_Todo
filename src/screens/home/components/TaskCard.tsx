import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Task } from '../home.types';
import { RF, RS } from '../../../core/utils/responsive';
import { taskTheme } from '../../../core/theme/taskTheme';
import { formatTime12Hour } from '../../../core/utils/dateTime';

interface TaskCardProps {
    task: Task;
    dateLabel: string;
    onComplete: (task: Task) => void;
    onEdit: (task: Task) => void;
    onDelete: (task: Task) => void;
}

const TaskCard = ({ task, dateLabel, onComplete, onEdit, onDelete }: TaskCardProps) => {
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    return (
        <View style={styles.card}>
            <TouchableOpacity
                style={[styles.checkbox, task.isCompleted && styles.checkboxCompleted]}
                onPress={() => onComplete(task)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: task.isCompleted }}
                accessibilityLabel={task.isCompleted ? 'Mark task active' : 'Complete task'}
            >
                {task.isCompleted ? <Text style={styles.checkmark}>✓</Text> : null}
            </TouchableOpacity>
            <View style={styles.details}>
                <Text style={[styles.title, task.isCompleted && styles.completedTitle]}>
                    {task.title}
                </Text>
                {task.description ? <Text style={styles.description}>{task.description}</Text> : null}
                <View style={styles.metadata}>
                    <Text style={styles.dateLabel}>
                        {dateLabel}{task.dueTime ? ` · ${formatTime12Hour(task.dueTime)}` : ''}
                    </Text>
                    <Text style={styles.priority}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </Text>
                    {task.reminderEnabled && task.isCompleted ? (
                        <Text style={styles.priority}>Reminder paused</Text>
                    ) : task.reminderEnabled ? (
                        <Text style={task.notificationId ? styles.reminder : styles.reminderMissing}>
                            {task.notificationId ? 'Reminder set' : 'Reminder needs date + time'}
                        </Text>
                    ) : null}
                </View>
                {task.dateAmbiguous ? (
                    <Text style={styles.ambiguity}>
                        Date needs clarification{task.ambiguityNote ? `: ${task.ambiguityNote}` : '.'}
                    </Text>
                ) : null}
                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => onEdit(task)} accessibilityRole="button">
                        <Text style={styles.action}>Edit / reschedule</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setIsConfirmingDelete(true)}
                        accessibilityRole="button"
                    >
                        <Text style={styles.deleteAction}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <Modal
                visible={isConfirmingDelete}
                transparent
                animationType="fade"
                onRequestClose={() => setIsConfirmingDelete(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.confirmCard}>
                        <Text style={styles.confirmTitle}>Delete this task?</Text>
                        <Text style={styles.confirmMessage}>{task.title}</Text>
                        <View style={styles.confirmActions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setIsConfirmingDelete(false)}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmDeleteButton}
                                onPress={() => {
                                    setIsConfirmingDelete(false);
                                    onDelete(task);
                                }}
                            >
                                <Text style={styles.confirmDeleteText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: taskTheme.colors.surface,
        borderColor: taskTheme.colors.border,
        borderWidth: 1,
        borderRadius: RS(taskTheme.radius.md),
        padding: RS(taskTheme.spacing.lg),
        marginBottom: RS(taskTheme.spacing.sm),
    },
    checkbox: {
        width: RS(24),
        height: RS(24),
        borderColor: taskTheme.colors.borderStrong,
        borderWidth: 1.5,
        borderRadius: RS(7),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: RS(taskTheme.spacing.md),
        marginTop: RS(1),
    },
    checkboxCompleted: {
        borderColor: taskTheme.colors.primary,
        backgroundColor: taskTheme.colors.primary,
    },
    checkmark: {
        color: taskTheme.colors.white,
        fontSize: RF(15),
        fontWeight: '700',
    },
    details: {
        flex: 1,
    },
    title: {
        color: taskTheme.colors.text,
        fontSize: RF(16),
        fontWeight: '700',
        lineHeight: RF(22),
    },
    completedTitle: {
        color: taskTheme.colors.textSecondary,
        textDecorationLine: 'line-through',
    },
    description: {
        color: taskTheme.colors.textSecondary,
        fontSize: RF(14),
        lineHeight: RF(20),
        marginTop: RS(taskTheme.spacing.xs),
    },
    metadata: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: RS(taskTheme.spacing.sm),
        marginTop: RS(taskTheme.spacing.sm),
    },
    dateLabel: {
        color: taskTheme.colors.textSecondary,
        fontSize: RF(12),
        fontWeight: '600',
    },
    priority: {
        color: taskTheme.colors.primary,
        fontSize: RF(12),
        fontWeight: '600',
    },
    reminder: {
        color: taskTheme.colors.success,
        fontSize: RF(12),
        fontWeight: '600',
    },
    reminderMissing: {
        color: taskTheme.colors.warning,
        fontSize: RF(12),
        fontWeight: '600',
    },
    ambiguity: {
        color: taskTheme.colors.warning,
        fontSize: RF(13),
        lineHeight: RF(18),
        marginTop: RS(taskTheme.spacing.sm),
    },
    actions: {
        flexDirection: 'row',
        gap: RS(taskTheme.spacing.lg),
        marginTop: RS(taskTheme.spacing.md),
    },
    action: {
        color: taskTheme.colors.primary,
        fontSize: RF(13),
        fontWeight: '600',
    },
    deleteAction: {
        color: taskTheme.colors.danger,
        fontSize: RF(13),
        fontWeight: '600',
    },
    modalBackdrop: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(24, 28, 38, 0.45)',
        padding: RS(taskTheme.spacing.xl),
    },
    confirmCard: {
        width: '100%',
        maxWidth: RS(420),
        backgroundColor: taskTheme.colors.surface,
        borderRadius: RS(taskTheme.radius.lg),
        padding: RS(taskTheme.spacing.xl),
    },
    confirmTitle: {
        color: taskTheme.colors.text,
        fontSize: RF(18),
        fontWeight: '700',
    },
    confirmMessage: {
        color: taskTheme.colors.textSecondary,
        fontSize: RF(14),
        lineHeight: RF(20),
        marginTop: RS(taskTheme.spacing.sm),
    },
    confirmActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: RS(taskTheme.spacing.sm),
        marginTop: RS(taskTheme.spacing.xl),
    },
    cancelButton: {
        minHeight: RS(44),
        justifyContent: 'center',
        paddingHorizontal: RS(taskTheme.spacing.md),
    },
    cancelText: {
        color: taskTheme.colors.textSecondary,
        fontSize: RF(14),
        fontWeight: '600',
    },
    confirmDeleteButton: {
        minHeight: RS(44),
        justifyContent: 'center',
        borderRadius: RS(taskTheme.radius.sm),
        backgroundColor: taskTheme.colors.danger,
        paddingHorizontal: RS(taskTheme.spacing.lg),
    },
    confirmDeleteText: {
        color: taskTheme.colors.white,
        fontSize: RF(14),
        fontWeight: '700',
    },
});

export default TaskCard;
