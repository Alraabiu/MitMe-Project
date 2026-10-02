import type { School } from '../../types';

interface Props {
  onCancel: () => void;
  onCreated: (school: School) => void;
}

export function CreateSchoolForm(_props: Props) {
  return <div style={{ padding: 24 }}>Create School form coming soon…</div>;
}