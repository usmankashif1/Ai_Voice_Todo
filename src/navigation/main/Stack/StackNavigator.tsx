import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomNavigator from '../BottomTabs/BottomNavigator';
import HomeNavigator from '../../../screens/home/navigation/HomeNavigator';

export type MainStackParamList = {
    Tabs: undefined;
    Home: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

const StackNavigator = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeNavigator} />
    </Stack.Navigator>
);

export default StackNavigator;
