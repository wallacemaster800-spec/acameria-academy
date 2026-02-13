

# Acameria — Exclusive Video Academy Platform

## Overview
A premium, invite-only LMS with HLS video streaming, time-gated access control, and a full admin dashboard. Dark theme with gold accents conveying exclusivity.

---

## Phase 1: Foundation & Authentication

### Design System — "Acameria Dark"
- Deep dark backgrounds (slate-950), card surfaces (slate-900), subtle borders (slate-800)
- Gold/amber-500 accent color for buttons, progress bars, and highlights
- Clean sans-serif typography optimized for readability
- Skeleton loaders throughout for premium loading experience

### Database Schema (Supabase Migration)
- **profiles** table: id, email, full_name, avatar_url, access_expires_at, created_at
- **user_roles** table (separate, secure): user_id + role enum (admin, student) with security definer function `has_role()` to prevent RLS recursion
- **courses** table: title, description, thumbnail_url, slug, is_published
- **modules** table: course_id, title, order_index
- **lessons** table: module_id, title, description, video_url_hls, resources_url, order_index, is_free_preview
- **user_progress** table: user_id, lesson_id, is_completed, last_watched_position (composite primary key)
- Strict RLS policies on all tables using the `has_role()` function

### Authentication & Access Control
- **Login page** (`/login`): Email/password only — no registration link, no public sign-up
- **`useAuthProtection` hook**: Global guard that checks login state and `access_expires_at`
- **RequireAuth wrapper**: Redirects unauthenticated users to `/login`
- **Expiration check**: On every protected route transition, if current date > access_expires_at → redirect to `/subscription-expired` page
- **Subscription Expired page** (`/subscription-expired`): Clean message telling user their access has ended, with contact info
- Admin detection via `user_roles` table query (not hardcoded email)

---

## Phase 2: Admin Dashboard

### Layout (`/admin`)
- Sidebar navigation: Students, Courses, Settings
- Only visible/accessible to users with admin role

### Student Management
- Table listing all users: Email, Role, Expiration Date, Status (Active/Expired badge)
- **"Add Student" modal**: Email, temporary password, access duration dropdown (3 months, 6 months, 1 year, lifetime)
- Creates user via Supabase Admin API, sets access_expires_at accordingly
- Ability to extend/revoke access for existing students

### Course Management
- CRUD for courses with title, description, thumbnail URL, slug
- Module and lesson management with drag-and-drop reordering
- Simple text input for HLS URL (.m3u8) — admin pastes Cloudflare R2 link
- Publish/unpublish toggle for courses

---

## Phase 3: Student Learning Experience

### Student Dashboard (`/dashboard`)
- Netflix-style grid of available courses with thumbnails
- Progress indicators on each course card
- Only shows published courses

### Course Player (`/course/:slug/learn`)
- **Split-screen layout**: 70% video player, 30% sidebar
- **Sidebar**: Collapsible accordion of modules & lessons with completion checkmarks
- Active lesson highlighted, easy navigation between lessons

### HLS Video Player
- Built with `hls.js` to stream .m3u8 from Cloudflare R2
- Custom controls: Play/Pause, playback speed (1x, 1.5x, 2x), progress bar, fullscreen
- Optional email watermark overlay for anti-piracy
- Quality selector if the HLS stream provides multiple renditions

### Progress Tracking
- Auto-saves last watched position to `user_progress` table
- When video ends → marks lesson complete → shows "Next Lesson" toast → auto-advances after 5 seconds
- Overall course progress percentage visible in sidebar

---

## Key Pages Summary
| Route | Access | Purpose |
|---|---|---|
| `/login` | Public | Email/password login |
| `/dashboard` | Students + Admin | Course catalog |
| `/course/:slug/learn` | Students + Admin | Video player + content |
| `/admin` | Admin only | Manage students & courses |
| `/subscription-expired` | Expired students | Access ended message |

