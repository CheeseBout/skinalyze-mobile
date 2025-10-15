import HeaderComponent from '@/components/HeaderComponent';
import { Stack } from 'expo-router';

export default function StackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'card',
      }}
    >
      <Stack.Screen 
        name="AboutScreen" 
        options={{ 
          headerShown: false,
          title: ''
        }} 
      />
      <Stack.Screen 
        name="ProductDetail"
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ProfileScreen"
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="SettingsScreen"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}