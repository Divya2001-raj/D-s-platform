# Security Specification — D's platforms DATA ENGINEER 360

## 1. Data Invariants
1. A `UserProfile` at `/users/{userId}` can only be read or modified by its authenticated owner (`request.auth.uid == userId`) or an administrator. No blanket `list` is allowed for non-admins.
2. A `UserProgress` document at `/user_progress/{userId}` and its subcollections (`notes`, `submissions`, `chat`) belong strictly to `userId` and enforce the Master Gate (`get(/databases/$(database)/documents/user_progress/$(userId)).data.uid == request.auth.uid`) on all subcollection writes.
3. Users can never self-assign administrative privileges (`admins/{uid}` is read-only to clients; admin bootstrap is verified via `request.auth.token.email == 'divyaraj8861@gmail.com' && request.auth.token.email_verified == true` or trusted `/admins/{uid}` existence).
4. Authenticated users generating AI practice batches may only create `/questions/{questionId}` records with `sourceType == 'ai_generated_practice'` and `createdBy == request.auth.uid`; only administrators can publish `verified_interview`, `reported_experience`, or `curated_track` questions or mutate existing questions.
5. Candidate submissions to `/interview_experiences/{expId}` must always start in `verificationStatus == 'pending_review'` with `authorId == request.auth.uid`; only administrators can transition `verificationStatus` to `'verified'` or `'rejected'`.
6. All `createdAt` and `updatedAt` timestamps must equal `request.time`; `createdAt` and owner `uid` / `authorId` are immutable after creation.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Cross-Tenant Profile Read**: Unauthenticated or different-UID read on `/users/other_uid`.
2. **Shadow Admin Escalation**: Creating `/users/{uid}` with an unallowed ghost field `isAdmin: true` or `role: "admin"`.
3. **Unverified Email Write**: Creating `/user_progress/{uid}` when `request.auth.token.email_verified == false`.
4. **Timestamp Forgery**: Creating `/users/{uid}` with client-forged `createdAt` != `request.time`.
5. **Immutable UID Overwrite**: Updating `/user_progress/{uid}` attempting to change `uid` to another user's ID.
6. **Subcollection Orphan Write**: Writing `/user_progress/{uid}/notes/note1` when parent `/user_progress/{uid}` does not exist or belongs to another UID.
7. **ID Poisoning Attack**: Creating `/questions/{2KB_string}` or ID containing spaces/slashes (`../admin`).
8. **AI Source Spoofing**: Non-admin user creating `/questions/q_spoof` with `sourceType: "verified_interview"`.
9. **Interview Experience Auto-Approval**: Non-admin user creating `/interview_experiences/exp1` with `verificationStatus: "verified"`.
10. **Denial-of-Wallet Oversized Array**: Updating `/user_progress/{uid}` with `attemptedIds` containing > 5000 entries or `title` > 240 chars.
11. **Terminal State Tampering**: Non-admin updating `/interview_experiences/{expId}` after `verificationStatus` is `'verified'` or `'rejected'`.
12. **Blanket User Scraping**: Non-admin performing a `list` query on `/users`.
