import { Redirect, Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
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

const makeIcon =
  (
    Icon: React.ComponentType<{
      size?: number;
      color?: ColorValue;
      strokeWidth?: number;
    }>
  ) =>
  ({ color, size, focused }: IconProps) => (
    <Icon size={size} color={color} strokeWidth={focused ? 2.6 : 1.9} />
  );

const HomeIcon = makeIcon(Home);
const MessagesIcon = makeIcon(MessageCircle);
const ClassesIcon = makeIcon(GraduationCap);
const ContactsIcon = makeIcon(Users);
const MeetingsIcon = makeIcon(Video);
const ProfileIcon = makeIcon(UserIcon);

function TabIcon({
  Icon,
  color,
  focused,
  badge,
}: {
  Icon: React.ComponentType<IconProps>;
  color: ColorValue;
  focused: boolean;
  badge?: number;
}) {
  return (
    <View style={navStyles.iconWrap}>
      {focused && <View style={navStyles.activeGlow} />}
      <Icon color={color} size={22} focused={focused} />
      {badge && badge > 0 ? (
        <View style={navStyles.badge}>
          <Text style={navStyles.badgeText}>
            {badge > 9 ? '9+' : String(badge)}
          </Text>
        </View>
      ) : null}
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
        tabBarInactiveTintColor: colors.mutedDim,
        tabBarStyle: navStyles.tabBar,
        tabBarLabelStyle: navStyles.tabLabel,
        tabBarItemStyle: navStyles.tabItem,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: colors.bg },
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
    backgroundColor: colors.bgElevated,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    height: 78,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 6,
    ...shadows.nav,
  },
  tabItem: {
    paddingVertical: 2,
    gap: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: weights.bold,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  iconWrap: {
    width: 48,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeGlow: {
    position: 'absolute',
    inset: 0,
    borderRadius: 12,
    backgroundColor: colors.purpleSoft,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.bgElevated,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: weights.extrabold,
  },
});