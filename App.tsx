import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import RootNavigator from './src/navigation/root/RootNavigator';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

const App = () => {
    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <RootNavigator />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default App;
