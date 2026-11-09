import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '../../../components/AppText';
 
const ProfileScreen = () => (
    <View style={styles.container}>
        <View style={styles.content}>
            <AppText style={styles.title}>Profile</AppText>
            <AppText style={styles.description}>Profile features can be added here later.</AppText>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F6F7F9',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    title: {
        color: '#252A40',
        fontSize: 20,
        fontWeight: '700',
    },
    description: {
        color: '#697284',
        fontSize: 14,
        marginTop: 8,
    },
});

export default ProfileScreen;
