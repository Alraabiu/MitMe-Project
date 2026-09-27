import type { ClassItem } from '../../types';

interface Props {
  cls: ClassItem;
  onClick: (id: string) => void;
}

export function ClassCard({ cls, onClick }: Props) {
  const studentCount = Array.isArray(cls.students) ? cls.students.length : 0;

  return (
    <div className="classCard" onClick={() => onClick(cls._id)}>
      {cls.isLive && (
        <div className="classLiveBadge">
          <span className="classLiveDot" />
          LIVE NOW
        </div>
      )}

      <div
        className="classCardAccent"
        style={{ backgroundColor: cls.coverColor || '#4B24A8' }}
      />

      <div className="classCardBody">
        <div className="classCardName">{cls.name}</div>
        {cls.subject ? (
          <div className="classCardSubject">{cls.subject}</div>
        ) : null}

        <div className="classCardMeta">
          <div>
            Code:{' '}
            <span className="classCardCode">{cls.code}</span>
          </div>
          <div>{studentCount} students</div>
        </div>

        <div className="classCardTeacher">
          By {cls.teacher?.displayName || cls.teacher?.username || 'Teacher'}
        </div>
      </div>
    </div>
  );
}
