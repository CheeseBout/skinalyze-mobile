import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProductProvider } from "@/contexts/ProductContext";
import { useNotificationWebSocket } from "@/hooks/useNotificationWebSocket";
import { CartCountProvider } from '@/contexts/CartCountContext';
import { ThemeColorProvider } from '@/contexts/ThemeColorContext';
import { LanguageProvider } from '@/contexts/LanguageContext';  // Add this import

import '@/config/i18n';

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "WelcomeScreen",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeColorProvider>
      <AuthProvider>
        <ProductProvider>
          <CartCountProvider>
            <LanguageProvider>
              <RootLayoutNav />
            </LanguageProvider>
          </CartCountProvider>
        </ProductProvider>
      </AuthProvider>
    </ThemeColorProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  // Initialize WebSocket connection for notifications
  useNotificationWebSocket();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="WelcomeScreen" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(stacks)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </ThemeProvider>
  );
}