import type { Meeting, User } from '../../types';

interface Props {
  schoolId: string;
  user: User;
  onBack: () => void;
  onOpenMeeting?: (m: Meeting | null) => void;
}

export function SchoolDetail(_props: Props) {
  return <div style={{ padding: 24 }}>School detail coming soon…</div>;
}