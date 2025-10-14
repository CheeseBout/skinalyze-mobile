import { Stack } from 'expo-router';

export default function StackLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="AboutScreen" 
        options={{ headerShown: false }} 
      />
    </Stack>
  );
}