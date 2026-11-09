import React, { useEffect, useState } from 'react';
import {
    Animated,
    Easing,
    Pressable,
    StyleSheet,
} from 'react-native';
import { taskTheme } from '../core/theme/taskTheme';
import { RH, RS, RW } from '../core/utils/responsive';

interface AnimatedToggleProps {
    value: boolean;
    onValueChange: (value: boolean) => void;
    accessibilityLabel: string;
}

const AnimatedToggle = ({
    value,
    onValueChange,
    accessibilityLabel,
}: AnimatedToggleProps) => {
    const [progress] = useState(() => new Animated.Value(value ? 1 : 0));
    const onTrackOpacity = progress;
    const thumbPosition = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, RW(19)],
    });


    useEffect(() => {
        const animation = Animated.timing(progress, {
            toValue: value ? 1 : 0,
            duration: 180,
            easing: Easing.bezier(0.22, 1, 0.36, 1),
            useNativeDriver: true,
        });
        animation.start();
        return () => animation.stop();
    }, [progress, value]);

    
    return (
        <Pressable
            style={styles.container}
            onPress={() => onValueChange(!value)}
            accessibilityRole="switch"
            accessibilityState={{ checked: value }}
            accessibilityLabel={accessibilityLabel}
            hitSlop={RS(8)}
        >
            <Animated.View style={[styles.track, styles.offTrack]} />
            <Animated.View
                style={[
                    styles.track,
                    styles.onTrack,
                    { opacity: onTrackOpacity },
                ]}
            />
            <Animated.View
                style={[
                    styles.thumb,
                    { transform: [{ translateX: thumbPosition }] },
                ]}
            />
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        width: RW(46),
        height: RH(27),
        justifyContent: 'center',
    },
    track: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        borderRadius: RS(14),
    },
    offTrack: {
        backgroundColor: taskTheme.colors.reminderTrackOff,
    },
    onTrack: {
        backgroundColor: taskTheme.colors.reminderTrackOn,
    },
    thumb: {
        position: 'absolute',
        left: RW(3),
        top: RH(3),
        width: RS(21),
        height: RS(21),
        borderRadius: RS(11),
        backgroundColor: taskTheme.colors.white,
        shadowColor: taskTheme.colors.reminderThumbShadow,
        shadowOffset: { width: 0, height: RH(1) },
        shadowOpacity: 1,
        shadowRadius: RS(2),
        elevation: RS(2),
    },
});

export default AnimatedToggle;
