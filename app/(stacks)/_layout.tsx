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
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="ProductDetailScreen"
        options={{ 
          headerShown: true 
        }}
      />
      <Stack.Screen 
        name="ProfileScreen"
        options={{ 
          headerShown: true 
        }}
      />
      <Stack.Screen 
        name="SettingsScreen"
        options={{ 
          headerShown: false 
        }}
      />
      <Stack.Screen
        name="SearchScreen"
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="SignInScreen"
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="SignUpScreen"
        options={{
          headerShown: false
        }}
      />
    </Stack>
  );
}