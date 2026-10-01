import { Redirect, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import {
  Home,
  MessageCircle,
  Users,
  Video,
  User as UserIcon,
  GraduationCap,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useMessageNotifications } from '../../src/context/MessageNotificationsContext';
import { useTheme } from '../../src/context/ThemeContext';

type IconProps = { color: ColorValue; size: number };

const IconHome = Home as unknown as React.ComponentType<IconProps>;
const IconMessages = MessageCircle as unknown as React.ComponentType<IconProps>;
const IconEducation = GraduationCap as unknown as React.ComponentType<IconProps>;
const IconContacts = Users as unknown as React.ComponentType<IconProps>;
const IconMeetings = Video as unknown as React.ComponentType<IconProps>;
const IconProfile = UserIcon as unknown as React.ComponentType<IconProps>;

export default function TabsLayout() {
  const { user } = useAuth();
  const { totalUnread } = useMessageNotifications();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (!user) return <Redirect href="/(auth)/login" />;

  // Base tab bar height + Android's bottom nav bar
  const BASE_TAB_BAR = 62;
  const bottomInset = insets.bottom;
  const tabBarHeight = BASE_TAB_BAR + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.purple,
        tabBarInactiveTintColor: colors.muted,
        tabBarBadgeStyle: {
          backgroundColor: colors.danger,
          color: '#fff',
          fontSize: 10,
          fontWeight: '800',
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: bottomInset + 10,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
          marginBottom: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
      }}
    >
      {/* 1. Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconHome color={color} size={22} />,
        }}
      />

      {/* 2. Education */}
      <Tabs.Screen
        name="education"
        options={{
          title: 'Education',
          tabBarIcon: ({ color }) => <IconEducation color={color} size={22} />,
        }}
      />

      {/* 3. Meetings */}
      <Tabs.Screen
        name="meetings"
        options={{
          title: 'Meetings',
          tabBarIcon: ({ color }) => <IconMeetings color={color} size={22} />,
        }}
      />

      {/* 4. Messages */}
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
          tabBarIcon: ({ color }) => <IconMessages color={color} size={22} />,
        }}
      />

      {/* 5. Contacts */}
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color }) => <IconContacts color={color} size={22} />,
        }}
      />

      {/* 6. Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconProfile color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}