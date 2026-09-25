# MitMe API

Base: `/api`

Auth: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`

Users: `GET /users`, `GET /users/:id`, `PATCH /users/me`

Contacts: `GET /contacts`, `POST /contacts/requests`, `POST /contacts/requests/:id/accept`, `DELETE /contacts/:id`

Conversations: `GET /conversations`, `POST /conversations`, `GET /conversations/:id/messages`, `POST /conversations/:id/messages`

Meetings: `POST /meetings`, `GET /meetings`, `GET /meetings/:id`, `POST /meetings/:id/join`, `POST /meetings/:id/leave`, `PATCH /meetings/:id`

Whiteboards: `GET /whiteboards/:meetingId`, `POST /whiteboards/:meetingId/events`, `PATCH /whiteboards/:meetingId`

Notifications: `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`

Admin: `/api/admin/*` with admin role required.
