import HeaderComponent from "@/components/HeaderComponent";
import { Stack } from "expo-router";

export default function StackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: "card",
      }}
    >
      <Stack.Screen
        name="AboutScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ProductDetailScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ProfileScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="SettingsScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="SearchScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="SignInScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="SignUpScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AddressDetailScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ChangePasswordScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AnalysisListScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AnalysisDetailScreen" 
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="OrderListScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="OrderDetailScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="OrderTrackingScreen"
        options={{
          headerShown: false,
        }}
      />

    </Stack>
  );
}
