import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../../services/api';
import type { Meeting } from '../../types';

interface MeetingsPageProps {
  onOpenMeeting: (m: Meeting) => void;
}

export function MeetingsPage({ onOpenMeeting }: MeetingsPageProps) {
  const [rows, setRows] = useState<Meeting[]>([]);
  const [title, setTitle] = useState('');

  const load = () =>
    api.get<{ meetings: Meeting[] }>('/meetings').then((r) => setRows(r.data.meetings));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async () => {
    if (!title.trim()) return;
    const r = await api.post<{ meeting: Meeting }>('/meetings', { title });
    setTitle('');
    load();
    onOpenMeeting(r.data.meeting);
  };

  const join = async (m: Meeting) => {
    const r = await api.post<{ meeting: Meeting }>(`/meetings/${m._id}/join`);
    onOpenMeeting(r.data.meeting);
  };

  return React.createElement(
    'div',
    { className: 'page' },
    React.createElement(
      'div',
      { className: 'card' },
      React.createElement(
        'div',
        { className: 'toolbar' },
        React.createElement('input', {
          className: 'input',
          value: title,
          onChange: (e: { target: { value: string } }) => setTitle(e.target.value),
          placeholder: 'Meeting title',
        }),
        React.createElement(
          'button',
          { className: 'btn primary', onClick: create },
          React.createElement(Plus, { size: 17 }),
          ' New meeting',
        ),
      ),
    ),
    React.createElement(
      'div',
      { className: 'card', style: { marginTop: 18 } },
      React.createElement('h2', null, 'Meeting history'),
      rows.map((m: Meeting) =>
        React.createElement(
          'div',
          { className: 'row', key: m._id },
          React.createElement(
            'div',
            null,
            React.createElement('b', null, m.title),
            React.createElement('div', { className: 'muted' }, `${m.code} · ${m.status}`),
          ),
          React.createElement('button', { className: 'btn', onClick: () => join(m) }, 'Join'),
        ),
      ),
    ),
  );
}