import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { RF, RH, RS, RW } from '../../../core/utils/responsive';
import { taskTheme } from '../../../core/theme/taskTheme';
import {
    VoiceInputButton,
    type VoiceInputHandle,
} from '../../../components/VoiceInputButton';
import { extractTasksFromText } from '../taskExtractionService';
import type { ExtractedTask } from '../home.types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatTime12Hour } from '../../../core/utils/dateTime';

interface VoiceTaskReviewModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (tasks: ExtractedTask[]) => Promise<boolean>;
}

const VoiceTaskReviewModal = ({
    visible,
    onClose,
    onConfirm,
}: VoiceTaskReviewModalProps) => {
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const maxSheetHeight = Math.max(
        RH(320),
        windowHeight - insets.top - RH(taskTheme.spacing.md),
    );
    const maxTaskListHeight = Math.max(RH(120), maxSheetHeight * 0.42);
    const [tasks, setTasks] = useState<ExtractedTask[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [recordingAttempt, setRecordingAttempt] = useState(0);
    const busy = isStarting || isRecording || isProcessing || isSaving;
    const voiceInput = useRef<VoiceInputHandle>(null);
    const isClosing = useRef(false);
    const [waveValues] = useState(
        () => Array.from({ length: 7 }, () => new Animated.Value(0.25)),
    );

    useEffect(() => {
        if (!isRecording) {
            waveValues.forEach(value => value.setValue(0.25));
            return;
        }

        const animations = waveValues.map((value, index) => {
            const peak = 0.45 + ((index % 3) * 0.2);
            return Animated.loop(Animated.sequence([
                Animated.timing(value, {
                    toValue: peak,
                    duration: 180 + (index % 2) * 60,
                    useNativeDriver: true,
                }),
                Animated.timing(value, {
                    toValue: 0.2,
                    duration: 220 + (index % 3) * 45,
                    useNativeDriver: true,
                }),
            ]));
        });
        animations.forEach(animation => animation.start());

        return () => animations.forEach(animation => animation.stop());
    }, [isRecording, waveValues]);

    useEffect(() => {
        if (visible) isClosing.current = false;
    }, [visible]);

    const handleTranscription = async (transcription: string, signal: AbortSignal) => {
        setError('');
        const extractedTasks = await extractTasksFromText(transcription, signal);
        if (!signal.aborted) setTasks(extractedTasks);
    };

    const handleConfirm = async () => {
        if (!tasks.length || busy) return;
        setIsSaving(true);
        setError('');
        try {
            if (await onConfirm(tasks)) {
                setTasks([]);
                onClose();
            } else {
                setError('Could not save your tasks. Please try again.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = async () => {
        if (isSaving || isClosing.current) return;
        isClosing.current = true;
        try {
            await voiceInput.current?.cancel();
        } catch (cancelError) {
            console.error('Could not stop voice recording while closing the modal.', cancelError);
        }
        setTasks([]);
        setError('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleClose}
        >
            <View style={styles.backdrop}>
                <View
                    style={[
                        styles.sheet,
                        {
                            maxHeight: maxSheetHeight,
                            paddingBottom: RH(taskTheme.spacing.xl) + insets.bottom,
                        },
                    ]}
                >
                    <View style={styles.heading}>
                        <View style={styles.headingCopy}>
                            <Text style={styles.title}>Create tasks by voice</Text>
                            <Text style={styles.subtitle}>
                                Speak naturally. Review the tasks before adding them.
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.closeButton, isSaving && styles.disabled]}
                            onPress={handleClose}
                            disabled={isSaving}
                            accessibilityRole="button"
                            accessibilityLabel="Close voice task creation"
                        >
                            <Text style={styles.closeText}>×</Text>
                        </TouchableOpacity>
                    </View>

                    {tasks.length ? (
                        <>
                            <Text style={styles.reviewTitle}>Review tasks ({tasks.length})</Text>
                            <ScrollView
                                style={[styles.taskList, { maxHeight: maxTaskListHeight }]}
                                contentContainerStyle={styles.taskListContent}
                                keyboardShouldPersistTaps="handled"
                            >
                                {tasks.map((task, index) => (
                                    <View key={`${task.title}-${index}`} style={styles.taskCard}>
                                        <View style={styles.taskCopy}>
                                            <Text style={styles.taskTitle}>{task.title}</Text>
                                            {task.description ? (
                                                <Text style={styles.taskDescription}>
                                                    {task.description}
                                                </Text>
                                            ) : null}
                                            <Text style={styles.taskDetails}>
                                                {[
                                                    task.dueDate,
                                                    task.dueTime ? formatTime12Hour(task.dueTime) : null,
                                                    task.priority,
                                                ].filter(Boolean).join(' · ')}
                                            </Text>
                                            {task.dateAmbiguous && task.ambiguityNote ? (
                                                <Text style={styles.taskWarning}>
                                                    {task.ambiguityNote}
                                                </Text>
                                            ) : null}
                                        </View>
                                        <TouchableOpacity
                                            style={styles.removeButton}
                                            onPress={() => setTasks(current =>
                                                current.filter((_, taskIndex) => taskIndex !== index),
                                            )}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Remove ${task.title}`}
                                        >
                                            <Text style={styles.removeText}>×</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>

                            <View style={styles.footer}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={handleClose}
                                    disabled={busy}
                                >
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.confirmButton,
                                        (!tasks.length || busy) && styles.disabled,
                                    ]}
                                    onPress={() => void handleConfirm()}
                                    disabled={!tasks.length || busy}
                                >
                                    <Text style={styles.confirmText}>
                                        {isSaving ? 'Saving…' : `Add ${tasks.length} tasks`}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : null}

                    <View style={styles.voiceAction}>
                        {visible ? (
                            <>
                                {isRecording ? (
                                    <View
                                        style={styles.waveform}
                                        accessibilityRole="progressbar"
                                        accessibilityLabel="Recording voice note"
                                    >
                                        {waveValues.map((value, index) => (
                                            <Animated.View
                                                key={index}
                                                style={[
                                                    styles.waveBar,
                                                    { transform: [{ scaleY: value }] },
                                                ]}
                                            />
                                        ))}
                                    </View>
                                ) : null}
                                <VoiceInputButton
                                    ref={voiceInput}
                                    key={recordingAttempt}
                                    onTranscriptionComplete={handleTranscription}
                                    onError={setError}
                                    onProcessingChange={setIsProcessing}
                                    onRecordingChange={setIsRecording}
                                    onStartingChange={setIsStarting}
                                    autoStart
                                    hideIdleButton
                                    disabled={busy && !isRecording}
                                />
                            </>
                        ) : null}
                    </View>

                    {isStarting ? (
                        <Text style={styles.status}>Starting microphone…</Text>
                    ) : null}
                    {isProcessing ? (
                        <Text style={styles.status}>Transcribing and preparing tasks…</Text>
                    ) : null}
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    {error && !busy ? (
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={() => {
                                setError('');
                                setRecordingAttempt(attempt => attempt + 1);
                            }}
                            accessibilityRole="button"
                        >
                            <Text style={styles.retryText}>Try recording again</Text>
                        </TouchableOpacity>
                    ) : null}

                    {!tasks.length ? (
                        <Text style={styles.emptyHint}>
                            {isRecording
                                ? 'Tap Stop recording when you are finished.'
                                : isStarting
                                    ? 'Preparing microphone…'
                                    : isProcessing
                                        ? 'Please wait while your tasks are prepared.'
                                        : 'Recording starts automatically.'}
                        </Text>
                    ) : null}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(20, 24, 34, 0.45)',
    },
    sheet: {
        flexShrink: 1,
        borderTopLeftRadius: RS(taskTheme.radius.lg),
        borderTopRightRadius: RS(taskTheme.radius.lg),
        backgroundColor: taskTheme.colors.background,
        paddingHorizontal: RW(taskTheme.spacing.xl),
        paddingTop: RH(taskTheme.spacing.xl),
        paddingBottom: RH(taskTheme.spacing.xl),
    },
    heading: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: RW(taskTheme.spacing.md),
    },
    headingCopy: {
        flex: 1,
    },
    title: {
        color: taskTheme.colors.text,
        fontSize: RF(21),
        fontWeight: '800',
    },
    subtitle: {
        color: taskTheme.colors.textSecondary,
        fontSize: RF(14),
        lineHeight: RF(20),
        marginTop: RH(taskTheme.spacing.xs),
    },
    closeButton: {
        width: RS(36),
        height: RS(36),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RS(18),
        backgroundColor: taskTheme.colors.surface,
    },
    closeText: {
        color: taskTheme.colors.textSecondary,
        fontSize: RF(25),
        lineHeight: RF(28),
    },
    voiceAction: {
        minHeight: RH(56),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: RH(taskTheme.spacing.lg),
    },
    waveform: {
        height: RH(48),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: RW(taskTheme.spacing.xs),
        paddingHorizontal: RW(taskTheme.spacing.md),
        borderRadius: RS(taskTheme.radius.lg),
        backgroundColor: taskTheme.colors.surface,
    },
    waveBar: {
        width: RW(4),
        height: RH(32),
        borderRadius: RS(2),
        backgroundColor: taskTheme.colors.primary,
    },
    status: {
        color: taskTheme.colors.textSecondary,
        fontSize: RF(14),
        marginTop: RH(taskTheme.spacing.md),
    },
    error: {
        color: taskTheme.colors.danger,
        fontSize: RF(13),
        marginTop: RH(taskTheme.spacing.md),
    },
    retryButton: {
        alignSelf: 'flex-start',
        marginTop: RH(taskTheme.spacing.sm),
        paddingVertical: RH(taskTheme.spacing.sm),
        paddingHorizontal: RW(taskTheme.spacing.md),
        borderRadius: RS(taskTheme.radius.sm),
        backgroundColor: taskTheme.colors.primary,
    },
    retryText: {
        color: taskTheme.colors.white,
        fontSize: RF(13),
        fontWeight: '700',
    },
    emptyHint: {
        color: taskTheme.colors.textSecondary,
        fontSize: RF(14),
        marginTop: RH(taskTheme.spacing.lg),
    },
    reviewTitle: {
        color: taskTheme.colors.text,
        fontSize: RF(16),
        fontWeight: '700',
        marginTop: RH(taskTheme.spacing.xl),
    },
    taskList: {
        flexGrow: 0,
        flexShrink: 1,
        marginTop: RH(taskTheme.spacing.sm),
    },
    taskListContent: {
        gap: RH(taskTheme.spacing.sm),
        paddingBottom: RH(taskTheme.spacing.xs),
    },
    taskCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: RW(taskTheme.spacing.sm),
        borderWidth: 1,
        borderColor: taskTheme.colors.border,
        borderRadius: RS(taskTheme.radius.md),
        backgroundColor: taskTheme.colors.surface,
        padding: RS(taskTheme.spacing.md),
    },
    taskCopy: {
        flex: 1,
        gap: RH(taskTheme.spacing.xs),
    },
    taskTitle: {
        color: taskTheme.colors.text,
        fontSize: RF(15),
        fontWeight: '700',
    },
    taskDescription: {
        color: taskTheme.colors.textSecondary,
        fontSize: RF(13),
        lineHeight: RF(18),
    },
    taskDetails: {
        color: taskTheme.colors.primary,
        fontSize: RF(12),
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    taskWarning: {
        color: taskTheme.colors.warning,
        fontSize: RF(12),
    },
    removeButton: {
        width: RS(32),
        height: RS(32),
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeText: {
        color: taskTheme.colors.danger,
        fontSize: RF(24),
        lineHeight: RF(27),
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: RW(taskTheme.spacing.sm),
        marginTop: RH(taskTheme.spacing.lg),
    },
    cancelButton: {
        minHeight: RH(48),
        justifyContent: 'center',
        paddingHorizontal: RW(taskTheme.spacing.lg),
    },
    cancelText: {
        color: taskTheme.colors.textSecondary,
        fontSize: RF(14),
        fontWeight: '600',
    },
    confirmButton: {
        minHeight: RH(48),
        justifyContent: 'center',
        borderRadius: RS(taskTheme.radius.sm),
        backgroundColor: taskTheme.colors.primary,
        paddingHorizontal: RW(taskTheme.spacing.lg),
    },
    confirmText: {
        color: taskTheme.colors.white,
        fontSize: RF(14),
        fontWeight: '700',
    },
    disabled: {
        opacity: 0.55,
    },
});

export default VoiceTaskReviewModal;
