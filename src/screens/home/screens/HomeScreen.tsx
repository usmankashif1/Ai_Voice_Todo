import React, { useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    ScrollView,
    SectionList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { RF, RH, RS, RW } from '../../../core/utils/responsive';
import { getTaskDateLabel } from '../../../core/utils/dateTime';
import { taskTheme } from '../../../core/theme/taskTheme';
import TaskCard from '../components/TaskCard';
import TaskEditorModal from '../components/TaskEditorModal';
import VoiceTaskReviewModal from '../components/VoiceTaskReviewModal';
import type { ExtractedTask, Task, TaskDateLabel, TaskSection } from '../home.types';
import useTasks from '../hooks/useTasks';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

const sectionOrder: TaskDateLabel[] = ['Overdue', 'Today', 'Tomorrow', 'Upcoming', 'No Date'];

const groupTasks = (tasks: Task[]): TaskSection[] => {
    const groups = new Map<TaskDateLabel, Task[]>(
        sectionOrder.map(label => [label, []]),
    );

    for (const task of tasks) {
        const label = getTaskDateLabel(task.dueDate);
        groups.get(label)?.push(task);
    }

    return sectionOrder.flatMap(title => {
        const data = groups.get(title) ?? [];
        return data.length ? [{ title, data }] : [];
    });
};

const HomeScreen = () => {
    const insets = useSafeAreaInsets();
    const {
        items,
        loading,
        error,
        reminderWarning,
        reload,
        addTasks,
        updateTask,
        toggleTaskCompletion,
        deleteTask,
    } = useTasks();
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isSavingTask, setIsSavingTask] = useState(false);
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<TaskDateLabel>('Today');
    const categoryCounts = useMemo(() => {
        const counts = new Map<TaskDateLabel, number>(
            sectionOrder.map(category => [category, 0]),
        );
        for (const task of items) {
            const category = getTaskDateLabel(task.dueDate);
            counts.set(category, (counts.get(category) ?? 0) + 1);
        }
        return counts;
    }, [items]);


    const sections = useMemo(
        () => groupTasks(items.filter(task => getTaskDateLabel(task.dueDate) === selectedCategory)),
        [items, selectedCategory],
    );
    const handleSaveTask = async (changes: ExtractedTask): Promise<boolean> => {
        try {
            setIsSavingTask(true);
            const isSaved = editingTask
                ? await updateTask({ ...editingTask, ...changes })
                : await addTasks([changes]);
            if (!isSaved) return false;
            setEditingTask(null);
            setIsCreateTaskOpen(false);
            return true;
        } finally {
            setIsSavingTask(false);
        }
    };

    const handleConfirmVoiceTasks = async (tasks: ExtractedTask[]) => addTasks(tasks);

    
    const renderListHeader = () => (
        <View>
            <View style={styles.titleRow}>
                <View>
                    <Text style={styles.title}>VoiceDo AI</Text>
                    <Text style={{
                        ...styles.title, fontSize: RF(14), fontWeight: "400",
                    }}>Turn your thoughts into tasks</Text>
                </View>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setIsCreateTaskOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Create a task"
                >
                    <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.listHeading}>
                <Text style={styles.listTitle}>Your tasks</Text>
                <Text style={styles.taskCount}>{items.length}</Text>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRow}
            >
                {sectionOrder.map(category => {
                    const isSelected = selectedCategory === category;
                    return (
                        <TouchableOpacity
                            key={category}
                            style={[styles.categoryButton, isSelected && styles.selectedCategoryButton]}
                            onPress={() => setSelectedCategory(category)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                        >
                            <Text style={[styles.categoryText, isSelected && styles.selectedCategoryText]}>
                                {category} ({categoryCounts.get(category) ?? 0})
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {reminderWarning ? <Text style={styles.warningText}>{reminderWarning}</Text> : null}
            {loading ? <Text style={styles.emptyText}>Loading tasks…</Text> : null}
        </View>
    );



    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <SectionList
                    sections={sections}
                    keyExtractor={task => task.id}
                    renderItem={({ item, section }) => (
                        <TaskCard
                            task={item}
                            dateLabel={section.title}
                            onComplete={task => void toggleTaskCompletion(task)}
                            onEdit={setEditingTask}
                            onDelete={task => void deleteTask(task)}
                        />
                    )}
                    renderSectionHeader={({ section }) => (
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                    )}
                    ListHeaderComponent={renderListHeader()}
                    ListEmptyComponent={
                        loading ? <View /> : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>
                                    No {selectedCategory.toLowerCase()} tasks.
                                </Text>
                            </View>
                        )
                    }

                    contentContainerStyle={styles.content}
                    stickySectionHeadersEnabled={false}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                        <RefreshControl
                            refreshing={false}
                            onRefresh={() => void reload()}
                            tintColor={taskTheme.colors.primary}
                        />
                    }
                />

            </KeyboardAvoidingView>


            <TouchableOpacity
                style={[
                    styles.floatingVoiceButton,
                    { bottom: insets.bottom + RH(taskTheme.spacing.xl) },
                ]}
                onPress={() => setIsVoiceModalOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Create tasks by voice"
            >
                {/* <Text style={styles.floatingVoiceIcon}>🎙</Text> */}
                <FontAwesome5 name="microphone" size={RS(26)} color="white" />
            </TouchableOpacity>

            <TaskEditorModal
                key={editingTask?.id ?? (isCreateTaskOpen ? 'create' : 'closed')}
                task={editingTask}
                visible={editingTask !== null || isCreateTaskOpen}
                saving={isSavingTask}
                modalTitle={editingTask ? 'Edit task' : 'Create a task'}
                onCancel={() => {
                    setEditingTask(null);
                    setIsCreateTaskOpen(false);
                }}
                onSave={handleSaveTask}
            />
            <VoiceTaskReviewModal
                visible={isVoiceModalOpen}
                onClose={() => setIsVoiceModalOpen(false)}
                onConfirm={handleConfirmVoiceTasks}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: taskTheme.colors.background,
    },
    flex: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: RW(taskTheme.spacing.xl),
        paddingTop: RH(20),
        paddingBottom: RH(100),
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: "space-between",
        gap: RW(taskTheme.spacing.md),
    },
    title: {
        flex: 1,
        color: taskTheme.colors.text,
        fontSize: RF(18),
        fontWeight: '800',
        // lineHeight: RF(36),
        letterSpacing: -0.5,
    },
    addButton: {
        width: RS(44),
        height: RS(44),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RS(22),
        backgroundColor: taskTheme.colors.primary,
    },
    addButtonText: {
        color: taskTheme.colors.white,
        fontSize: RF(28),
        lineHeight: RF(31),
        fontWeight: '400',
    },
    errorText: {
        color: taskTheme.colors.danger,
        fontSize: RF(13),
        lineHeight: RF(19),
        marginTop: RH(taskTheme.spacing.sm),
    },
    warningText: {
        color: taskTheme.colors.warning,
        fontSize: RF(13),
        lineHeight: RF(19),
        marginTop: RH(taskTheme.spacing.sm),
    },
    listHeading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: RW(taskTheme.spacing.sm),
        marginTop: RH(taskTheme.spacing.xxl),
        marginBottom: RH(taskTheme.spacing.md),
    },
    categoryRow: {
        gap: RW(taskTheme.spacing.sm),
        paddingBottom: RH(taskTheme.spacing.sm),
    },
    categoryButton: {
        minHeight: RH(40),
        justifyContent: 'center',
        borderColor: taskTheme.colors.border,
        borderWidth: 1,
        borderRadius: RS(taskTheme.radius.lg),
        backgroundColor: taskTheme.colors.surface,
        paddingHorizontal: RW(taskTheme.spacing.md),
    },
    selectedCategoryButton: {
        borderColor: taskTheme.colors.primary,
        backgroundColor: taskTheme.colors.primary,
    },
    categoryText: {
        color: taskTheme.colors.textSecondary,
        fontSize: RF(13),
        fontWeight: '600',
    },
    selectedCategoryText: {
        color: taskTheme.colors.white,
    },
    listTitle: {
        color: taskTheme.colors.text,
        fontSize: RF(21),
        fontWeight: '800',
    },
    taskCount: {
        color: taskTheme.colors.textSecondary,
        fontSize: RF(13),
        fontWeight: '600',
    },
    sectionTitle: {
        color: taskTheme.colors.textSecondary,
        fontSize: RF(13),
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginTop: RH(taskTheme.spacing.lg),
        marginBottom: RH(taskTheme.spacing.sm),
    },
    emptyText: {
        color: taskTheme.colors.textSecondary,
        fontSize: RF(14),
        lineHeight: RF(20),
        textAlign: 'center',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: RW(taskTheme.spacing.lg),
    },
    floatingVoiceButton: {
        position: 'absolute',
        right: RW(taskTheme.spacing.xl),
        width: RS(60),
        height: RS(60),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RS(30),
        backgroundColor: taskTheme.colors.primary,
        elevation: 6,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    floatingVoiceIcon: {
        color: taskTheme.colors.white,
        fontSize: RF(25),
    },
});

export default HomeScreen;
