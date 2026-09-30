import { Monitor, Moon, Sun } from 'lucide-react';
import { useThemeMode } from '../../hooks/useThemeMode';
import type { ThemeMode } from '../../services/theme';

const OPTIONS: {
  value: ThemeMode;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
}[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

export function ThemeSwitcher() {
  const { mode, setMode } = useThemeMode();

  return (
    <div className="card form" style={{ marginTop: 18 }}>
      <h2>Appearance</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 12 }}>
        Choose how MitMe looks on this device.
      </p>

      <div className="theme-switcher">
        {OPTIONS.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            className={`theme-option ${mode === value ? 'active' : ''}`}
            onClick={() => setMode(value)}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
