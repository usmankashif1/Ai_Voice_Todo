import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { transcribeAudioWithGroq } from '../core/api/groqVoiceService';
import { taskTheme } from '../core/theme/taskTheme';

export interface VoiceInputHandle {
    cancel: () => Promise<void>;
}

interface VoiceInputProps {
    onTranscriptionComplete: (text: string, signal: AbortSignal) => void | Promise<void>;
    onError: (message: string) => void;
    onProcessingChange: (processing: boolean) => void;
    onRecordingChange?: (recording: boolean) => void;
    onStartingChange?: (starting: boolean) => void;
    autoStart?: boolean;
    hideIdleButton?: boolean;
    disabled: boolean;
}

export const VoiceInputButton = forwardRef<VoiceInputHandle, VoiceInputProps>(({
    onTranscriptionComplete,
    onError,
    onProcessingChange,
    onRecordingChange,
    onStartingChange,
    autoStart = false,
    hideIdleButton = false,
    disabled,
}: VoiceInputProps, ref) => {
    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
    const hasAutoStarted = useRef(false);
    const cancelled = useRef(false);
    const recording = useRef(false);
    const startOperation = useRef<Promise<void> | null>(null);
    const abortController = useRef<AbortController | null>(null);

    const startRecording = useCallback(async () => {
        if (disabled) return;
        cancelled.current = false;
        onStartingChange?.(true);
        try {
            const permission = await AudioModule.requestRecordingPermissionsAsync();
            if (cancelled.current) return;
            if (!permission.granted) {
                onError('Allow microphone access to record voice input.');
                return;
            }

            await setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
            });
            if (cancelled.current) return;
            await audioRecorder.prepareToRecordAsync();
            if (cancelled.current) return;
            audioRecorder.record();
            recording.current = true;
            setIsRecording(true);
            onRecordingChange?.(true);
        } catch (err) {
            if (!cancelled.current) {
                onError(
                    err instanceof Error ? err.message : 'Could not access the microphone.',
                );
            }
        } finally {
            onStartingChange?.(false);
        }
    }, [audioRecorder, disabled, onError, onRecordingChange, onStartingChange]);

    const beginRecording = useCallback(() => {
        const operation = startRecording();
        startOperation.current = operation;
        void operation.finally(() => {
            if (startOperation.current === operation) startOperation.current = null;
        });
    }, [startRecording]);

    useEffect(() => {
        if (!autoStart || hasAutoStarted.current) return;
        hasAutoStarted.current = true;
        beginRecording();
    }, [autoStart, beginRecording]);

    const cancelRecording = useCallback(async () => {
        cancelled.current = true;
        abortController.current?.abort();
        abortController.current = null;
        await startOperation.current;
        if (recording.current) {
            recording.current = false;
            setIsRecording(false);
            onRecordingChange?.(false);
            await audioRecorder.stop();
        }
        await setAudioModeAsync({ allowsRecording: false });
    }, [audioRecorder, onRecordingChange]);

    useImperativeHandle(ref, () => ({ cancel: cancelRecording }), [cancelRecording]);

    const stopAndTranscribe = async () => {
        const controller = new AbortController();
        abortController.current = controller;
        try {
            recording.current = false;
            setIsRecording(false);
            onRecordingChange?.(false);
            setIsTranscribing(true);
            onProcessingChange(true);
            await audioRecorder.stop();
            const recordingUri = audioRecorder.uri;
            await setAudioModeAsync({ allowsRecording: false });

            if (!recordingUri) {
                throw new Error('The recording is empty. Please try again.');
            }
            const transcribedText = await transcribeAudioWithGroq(
                recordingUri,
                controller.signal,
            );
            if (!controller.signal.aborted) {
                await onTranscriptionComplete(transcribedText, controller.signal);
            }
        } catch (error) {
            if (!controller.signal.aborted) {
                onError(
                    error instanceof Error ? error.message : 'Could not transcribe the recording.',
                );
            }
        } finally {
            if (abortController.current === controller) abortController.current = null;
            setIsTranscribing(false);
            onProcessingChange(false);
        }
    };

    return (
        <View style={styles.container}>
            {isTranscribing ? (
                <TouchableOpacity
                    style={[styles.button, styles.buttonDisabled]}
                    disabled
                    accessibilityRole="button"
                    accessibilityLabel="Preparing tasks"
                >
                    <Text style={styles.buttonText}>Preparing...</Text>
                </TouchableOpacity>
            ) : isRecording ? (
                <TouchableOpacity
                    style={[styles.button, styles.recordingActive]}
                    onPress={() => void stopAndTranscribe()}
                    accessibilityRole="button"
                    accessibilityLabel="Stop recording and transcribe"
                >
                    <View style={styles.recordingPulse} />
                    <Text style={styles.buttonText}>Stop recording</Text>
                </TouchableOpacity>
            ) : hideIdleButton ? null : (
                <TouchableOpacity
                    style={[styles.button, disabled && styles.buttonDisabled]}
                    onPress={beginRecording}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel="Start voice recording"
                >
                    <Text style={styles.buttonText}>🎤 Speak</Text>
                </TouchableOpacity>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    button: {
        minHeight: 44,
        flexDirection: 'row',
        backgroundColor: taskTheme.colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    recordingActive: {
        backgroundColor: '#EF4444',
    },
    recordingPulse: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FFF',
        marginRight: 8,
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    buttonDisabled: {
        opacity: 0.55,
    },
});

VoiceInputButton.displayName = 'VoiceInputButton';