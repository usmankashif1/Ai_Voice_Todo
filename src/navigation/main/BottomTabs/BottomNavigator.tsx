import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeNavigator from '../../../screens/home/navigation/HomeNavigator';
import ProfileNavigator from '../../../screens/profile/navigation/ProfileNavigator';
import { taskTheme } from '../../../core/theme/taskTheme';

export type BottomTabParamList = {
    HomeTab: undefined;
    ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

const BottomNavigator = () => (
    <Tab.Navigator
        screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: taskTheme.colors.primary,
            tabBarInactiveTintColor: '#697284',
        }}
    >
        <Tab.Screen name="HomeTab" component={HomeNavigator} options={{ title: 'Home' }} />
        <Tab.Screen name="ProfileTab" component={ProfileNavigator} options={{ title: 'Profile' }} />
    </Tab.Navigator>
);

export default BottomNavigator;
