# Firestore Security Specification

This document defines the data invariants, adversarial payloads, and test boundaries for the travel planner's Firebase rules.

## 1. Data Invariants
1. **User Ownership**: A user may only read and write their own profile document located at `/users/{userId}`.
2. **Trip Plan Ownership**: Sub-collections `/users/{userId}/plans/{planId}` are only accessible (read/write) if `userId == request.auth.uid`.
3. **Booking History Ownership**: Sub-collections `/users/{userId}/bookings/{bookingId}` are only accessible (read/write) if `userId == request.auth.uid`.
4. **Verified Access Constraint**: All write operations require a verified email address (`request.auth.token.email_verified == true`).
5. **System Immutability**: Core identifiers (`userId` in plans and bookings) are immutable after creation and cannot be changed during updates.
6. **Time-Based Integrity**: `createdAt` and `updatedAt` are initialized or modified matching the server timestamp `request.time`.

## 2. Invalidation Test Matrix (The "Dirty Dozen" Payloads)

| Payload ID | Target Path | Actor UID | Payload Description | Expectation |
|------------|-------------|-----------|---------------------|-------------|
| P1         | `/users/userABC` | `userXYZ` | Modifying another traveler's user profile | `PERMISSION_DENIED` |
| P2         | `/users/userABC` | `userABC` (unverified) | Writing a profile while email is unverified | `PERMISSION_DENIED` |
| P3         | `/users/userABC` | `userABC` | Creating profile, omitting required field `name` | `PERMISSION_DENIED` |
| P4         | `/users/userABC` | `userABC` | Registering high privileges/shadow roles | `PERMISSION_DENIED` |
| P5         | `/users/userABC/plans/plan1` | `userXYZ` | Accessing another user's saved trip plans | `PERMISSION_DENIED` |
| P6         | `/users/userABC/plans/plan1` | `userABC` | Creating a plan, mapping to another `userId` field | `PERMISSION_DENIED` |
| P7         | `/users/userABC/plans/plan1` | `userABC` | Plan creation missing required structural data | `PERMISSION_DENIED` |
| P8         | `/users/userABC/plans/plan1` | `userABC` | Tampering with immutable `userId` on update | `PERMISSION_DENIED` |
| P9         | `/users/userABC/plans/plan1` | `userABC` | Forging client timestamp for `createdAt` | `PERMISSION_DENIED` |
| P10        | `/users/userABC/bookings/b1` | `userXYZ` | Attempting to write into another's booking history | `PERMISSION_DENIED` |
| P11        | `/users/userABC/bookings/b1` | `userABC` | Missing key fields (e.g. `itemName`, `cost`) in booking | `PERMISSION_DENIED` |
| P12        | `/users/userABC/bookings/b1` | `userABC` | Trying to make an update operation (bookings are immutable) | `PERMISSION_DENIED` |
