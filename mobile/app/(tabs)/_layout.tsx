import { Redirect, Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import type { ColorValue } from 'react-native';
import {
  Home,
  MessageCircle,
  GraduationCap,
  Users,
  Video,
  User as UserIcon,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useMessageNotifications } from '../../src/context/MessageNotificationsContext';
import { colors, font, weights, shadows } from '../../src/theme';

type IconProps = { color: ColorValue; size: number; focused: boolean };

type IconType = React.ComponentType<IconProps>;

/** Wrap lucide icon so we can animate stroke width based on focus */
const makeIcon =
  (Icon: React.ComponentType<{ size?: number; color?: ColorValue; strokeWidth?: number }>) =>
  ({ color, size, focused }: IconProps) => (
    <Icon
      size={size}
      color={color}
      strokeWidth={focused ? 2.4 : 1.8}
    />
  );

const HomeIcon = makeIcon(Home);
const MessagesIcon = makeIcon(MessageCircle);
const ClassesIcon = makeIcon(GraduationCap);
const ContactsIcon = makeIcon(Users);
const MeetingsIcon = makeIcon(Video);
const ProfileIcon = makeIcon(UserIcon);

/** Custom tab icon wrapper that shows an active indicator dot */
function TabIcon({
  Icon,
  color,
  focused,
  badge,
}: {
  Icon: IconType;
  color: ColorValue;
  focused: boolean;
  badge?: number;
}) {
  return (
    <View style={navStyles.iconWrap}>
      <Icon color={color} size={22} focused={focused} />
      {badge && badge > 0 ? (
        <View style={navStyles.badge}>
          <View style={navStyles.badgeDot} />
        </View>
      ) : null}
      {focused && <View style={navStyles.activeDot} />}
    </View>
  );
}

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
        tabBarStyle: navStyles.tabBar,
        tabBarLabelStyle: navStyles.tabLabel,
        tabBarItemStyle: navStyles.tabItem,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={HomeIcon} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              Icon={MessagesIcon}
              color={color}
              focused={focused}
              badge={totalUnread}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: 'Classes',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={ClassesIcon} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={ContactsIcon} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="meetings"
        options={{
          title: 'Meetings',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={MeetingsIcon} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={ProfileIcon} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const navStyles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.card,
    borderTopWidth: 0,
    height: 74,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 4,
    ...shadows.nav,
  },
  tabItem: {
    paddingVertical: 2,
    gap: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: weights.bold,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  iconWrap: {
    width: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    bottom: -4,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.purple,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
});