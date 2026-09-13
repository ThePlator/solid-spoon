import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef, DarkTheme, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { User } from 'firebase/auth';
import { ensureFirebase } from './src/firebase';
import { onAuthChange } from '@supermind/core';
import { LoginScreen } from './screens/LoginScreen';
import { FeedScreen } from './screens/FeedScreen';
import { CaptureScreen } from './screens/CaptureScreen';
import { DetailScreen } from './screens/DetailScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { UpdateBanner } from './components/UpdateBanner';
import { useShareIntentSafe } from './src/shareIntent';
import { C } from './src/theme';
import type { RootStackParamList, TabParamList } from './src/nav';

ensureFirebase();

const navigationRef = createNavigationContainerRef<RootStackParamList>();

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

/**
 * Routes an incoming share-sheet payload to the Capture tab (prefilled), so a
 * shared link opens the create page instead of leaving the user on Library.
 * Lives at the root — the intent is app-wide, not owned by any one screen.
 * No-op in Expo Go (the hook is stubbed there).
 */
function ShareRouter({ navReady }: { navReady: boolean }) {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentSafe({ resetOnBackground: true });

  useEffect(() => {
    if (!navReady || !hasShareIntent || !navigationRef.isReady()) return;
    const sharedUrl = shareIntent.webUrl ?? undefined;
    const sharedText = sharedUrl ? undefined : (shareIntent.text ?? undefined);
    if (!sharedUrl && !sharedText) return;
    navigationRef.navigate('Tabs', { screen: 'Capture', params: { sharedUrl, sharedText } });
    resetShareIntent();
  }, [navReady, hasShareIntent, shareIntent, resetShareIntent]);

  return null;
}

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: C.bg,
    card: C.bg,
    text: C.fg,
    border: C.line,
    primary: C.accent,
    notification: C.accent,
  },
};

const headerStyle = {
  headerStyle: { backgroundColor: C.bg },
  headerTintColor: C.fg,
  headerTitleStyle: { color: C.fg, fontWeight: '700' as const },
  headerShadowVisible: false,
};

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={{ color: focused ? C.accent : C.fg3, fontSize: 20 }}>{label}</Text>;
}

function Logo() {
  return <Text style={{ color: C.fg, fontSize: 18, fontWeight: '800', letterSpacing: -0.5 }}>MIND<Text style={{ color: C.accent }}>·</Text>OS</Text>;
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        ...headerStyle,
        headerTitle: () => <Logo />,
        tabBarStyle: { backgroundColor: C.bg2, borderTopColor: C.line, height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.fg3,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Library" component={FeedScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="◫" focused={focused} /> }}
      />
      <Tab.Screen
        name="Capture" component={CaptureScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="+" focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile" component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="◍" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [navReady, setNavReady] = useState(false);

  useEffect(() => onAuthChange((u) => { setUser(u); setReady(true); }), []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {!ready ? (
          <View style={s.center}><ActivityIndicator color={C.accent} /></View>
        ) : (
          <NavigationContainer ref={navigationRef} theme={navTheme} onReady={() => setNavReady(true)}>
            {user ? (
              <>
                <ShareRouter navReady={navReady} />
                <Stack.Navigator screenOptions={headerStyle}>
                  <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
                  <Stack.Screen name="Detail" component={DetailScreen} options={{ title: 'Entry' }} />
                </Stack.Navigator>
              </>
            ) : (
              <LoginScreen />
            )}
          </NavigationContainer>
        )}
        {ready && user ? <UpdateBanner /> : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
});
