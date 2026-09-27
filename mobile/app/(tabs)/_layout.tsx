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
import { useAuth } from '../../src/context/AuthContext';
import { useMessageNotifications } from '../../src/context/MessageNotificationsContext';
import { colors } from '../../src/theme';

type IconProps = { color: ColorValue; size: number };

const IconHome = Home as unknown as React.ComponentType<IconProps>;
const IconMessages = MessageCircle as unknown as React.ComponentType<IconProps>;
const IconContacts = Users as unknown as React.ComponentType<IconProps>;
const IconMeetings = Video as unknown as React.ComponentType<IconProps>;
const IconClasses = GraduationCap as unknown as React.ComponentType<IconProps>;
const IconProfile = UserIcon as unknown as React.ComponentType<IconProps>;

export default function TabsLayout() {
  const { user } = useAuth();
  const { totalUnread } = useMessageNotifications();

  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.purple,
        tabBarInactiveTintColor: colors.muted,
        tabBarBadgeStyle: {
          backgroundColor: colors.danger,
          color: '#fff',
          fontSize: 11,
          fontWeight: '800',
        },
        tabBarStyle: {
          borderTopColor: colors.border,
          height: 60,
          paddingTop: 6,
          paddingBottom: 6,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <IconHome color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
          tabBarIcon: ({ color, size }) => (
            <IconMessages color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: 'Classes',
          tabBarIcon: ({ color, size }) => (
            <IconClasses color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color, size }) => (
            <IconContacts color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="meetings"
        options={{
          title: 'Meetings',
          tabBarIcon: ({ color, size }) => (
            <IconMeetings color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <IconProfile color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}