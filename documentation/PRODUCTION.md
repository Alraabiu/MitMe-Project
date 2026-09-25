# Production checklist

- Put API behind HTTPS and a WAF/load balancer.
- Use MongoDB Atlas or a secured replica set.
- Configure Redis adapter for multi-instance Socket.IO.
- Use LiveKit/mediasoup/Janus for large meetings instead of mesh WebRTC.
- Store attachments in private S3-compatible storage with signed URLs.
- Configure email/SMS OTP and Firebase/Expo push credentials.
- Rotate JWT refresh tokens and revoke sessions on suspicious activity.
- Add centralized logs, metrics, traces and alerting.
- Run dependency scanning, SAST, DAST and penetration testing.
- Configure backups, retention, disaster recovery and privacy policies.
