import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
 
const ProfileScreen = () => (
    <View style={styles.container}>
        <View style={styles.content}>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.description}>Profile features can be added here later.</Text>
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
