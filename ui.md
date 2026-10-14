# UI Design Guidelines: Gas & Fire Monitor PWA

Companion to `PROJECT.MD`. Stack: Next.js, Tailwind CSS, **shadcn/ui**, Supabase.

Rule of thumb: use a shadcn component first. Only build a custom component when shadcn has nothing close, and build it from shadcn primitives and tokens.

---

## 1. Design Principles

1. **Status at a glance.** The first screen answers one question: "Is everything safe right now?" Within one second the user should see a status, not read numbers.
2. **Danger is unmistakable.** Danger states use color, an icon, and text together. Never color alone.
3. **Critical actions are deliberate.** Shutting off gas needs a confirmation. Acknowledging an alert needs one tap.
4. **Calm when safe.** Safe state is quiet and low-contrast. Visual loudness is reserved for watch and danger.
5. **Works on a phone first.** Most use is on a phone, often in a stressful moment. Large tap targets, one-handed reach.
6. **Honest about staleness.** If data is old or the device is offline, say so in plain words. Never show old numbers as live.

---

## 2. Setup

```bash
npx shadcn@latest init
npx shadcn@latest add button card badge alert alert-dialog dialog sheet tabs \
  table chart skeleton sonner switch slider input label form select \
  tooltip progress separator dropdown-menu sidebar scroll-area \
  popover calendar toggle-group avatar command textarea checkbox
```

- Base color: **neutral** (or zinc). Radius: `0.5rem`.
- Icons: `lucide-react` only (shadcn default).
- Forms: `react-hook-form` + `zod` via shadcn `Form`.
- Toasts: `sonner`.
- Dark mode: `next-themes`, class strategy, default to **system**.

---

## 3. Design Tokens

### 3.1 Status colors (add to `globals.css`)

shadcn ships neutral tokens. Add semantic status tokens next to them, and use them everywhere instead of raw Tailwind colors.

```css
:root {
  --safe: oklch(0.62 0.15 150);
  --safe-foreground: oklch(0.98 0 0);
  --watch: oklch(0.80 0.16 85);
  --watch-foreground: oklch(0.25 0.05 85);
  --danger: oklch(0.58 0.22 27);
  --danger-foreground: oklch(0.98 0 0);
  --offline: oklch(0.60 0.02 260);
}
.dark {
  --safe: oklch(0.70 0.15 150);
  --watch: oklch(0.82 0.15 85);
  --danger: oklch(0.65 0.21 27);
  --offline: oklch(0.65 0.02 260);
}
```

Expose them in the Tailwind theme (`bg-safe`, `text-watch`, `border-danger`, etc.).

Rules:

- `danger` maps to shadcn's `destructive` for buttons and alerts. Keep both pointing at the same hue.
- Each zone also gets an **icon**: safe = `ShieldCheck`, watch = `TriangleAlert`, danger = `Flame` or `OctagonAlert`, offline = `WifiOff`.
- Contrast must meet WCAG AA (4.5:1 for text) in both themes.

### 3.2 Typography

- Font: **Geist** or **Inter** via `next/font`. Fallback: system UI stack.
- Numbers (readings, timers): `font-mono tabular-nums` so values do not jitter as they change.

| Use | Class |
| --- | --- |
| Page title | `text-2xl font-semibold tracking-tight` |
| Card title | `text-base font-medium` |
| Big reading | `text-4xl font-semibold tabular-nums` |
| Body | `text-sm` |
| Meta / timestamps | `text-xs text-muted-foreground` |

### 3.3 Spacing and shape

- Spacing scale: Tailwind 4px grid. Cards use `p-4` on mobile and `p-6` on desktop.
- Corners: `rounded-lg` for cards, `rounded-md` for inputs and buttons.
- Minimum tap target: **44 x 44 px** (`h-11` for primary mobile buttons).
- Page max width: `max-w-6xl` on desktop, full width on mobile with `px-4`.

---

## 4. Layout and Navigation

### Mobile (default)

- Bottom tab bar: **Dashboard, History, Events, Settings**. Build it with shadcn `Tabs` styling or a small fixed `nav` using `Button variant="ghost"`.
- Sticky top bar with app name, a connection badge, and an alert bell.
- Respect safe areas: `pb-[env(safe-area-inset-bottom)]`.

### Desktop (`md` and up)

- shadcn **`Sidebar`** (collapsible) with the same four destinations.
- Content area in a 12-column grid.

### Navigation items

| Item | Icon | Audience |
| --- | --- | --- |
| Dashboard | `LayoutDashboard` | Admin, viewer |
| History | `ChartLine` | Admin, viewer |
| Events | `ListTodo` | Admin, viewer |
| Assistant | `MessageSquare` | Admin, viewer |
| Settings | `Settings` | Admin only (viewer sees read-only device info) |

---

## 5. Screens

### 5.1 Dashboard

Top to bottom on mobile:

1. **Status banner** (`Alert`)
   - Safe: green, "All clear. Updated 3s ago."
   - Watch: amber, names the sensor that crossed the threshold.
   - Danger: red, names the trigger, shows **Acknowledge** and **Shut off gas** buttons.
   - Offline: gray, "Device offline. Last seen 2:14 PM."
2. **Gauge cards** (three `Card`s: Gas, Smoke, Temperature)
   - Big reading, unit, zone `Badge`, and a thin `Progress` bar showing position between safe and danger thresholds.
   - A small sparkline for the last 30 minutes using shadcn `Chart`.
3. **Valve card**
   - Current valve state (`Open` / `Closed`) as a `Badge`.
   - Admin: **Shut off gas** `Button variant="destructive"`.
   - Last valve action and who did it.
4. **Device health card** (collapsed by default): Wi-Fi signal, uptime, last seen, firmware version.
5. **Latest events** (last 5 rows, link to Events).

Desktop: status banner full width, three gauges in a row, valve and health cards below in two columns.

### 5.2 History

- `Tabs`: **Hourly / Daily / Weekly**.
- `ToggleGroup` to pick sensor (Gas, Smoke, Temperature, All).
- Date range via `Popover` + `Calendar`.
- shadcn `Chart` (Recharts) line charts with threshold reference lines (`ReferenceLine`) colored by `--watch` and `--danger`.
- Export button (`DropdownMenu`: CSV, PDF).

### 5.3 Events (timeline)

- Vertical list in a `Card`, newest first, grouped by day with `Separator`.
- Each row: icon, title, relative time, `Badge` for type (reading spike, alert, valve action, acknowledgment, offline).
- Filter with `Select` or `ToggleGroup`.
- Tap a row to open a `Sheet` with details, the AI incident summary, and a **Mark as false alarm** action.
- Desktop alternative: `Table` with sortable columns.

### 5.4 Assistant (AI chat)

- Chat thread in a `ScrollArea`, input as `Textarea` with a send `Button`.
- Suggested prompts as small `Button variant="outline"` chips ("What happened last night?").
- Answers that cite readings link to the matching event.
- Label AI content with a small "AI" `Badge`. Include a note that rules, not the AI, trigger alerts.

### 5.5 Settings (admin)

Use `Tabs` or a vertical list of `Card` sections:

- **Thresholds and calibration:** `Slider` plus numeric `Input` per sensor, "Set clean-air baseline" button with a progress state while sampling.
- **Contacts:** list with call and edit actions, add via `Dialog`. Order sets escalation.
- **Notifications:** `Switch` for push, SMS, email/Telegram. Quiet hours `Switch` with time inputs. Note: "Danger alerts are never paused."
- **Maintenance mode:** `Switch` with an `Alert` explaining what it pauses.
- **Language:** `Select` (English, Filipino).
- **Appearance:** theme `ToggleGroup` (Light, Dark, System).
- **Account:** sign out.

### 5.6 Login

- Centered `Card` with `Form`: email, password, `Button`. No signup link (accounts are created by the admin in Supabase).

---

## 6. Component Map

| Need | shadcn component | Notes |
| --- | --- | --- |
| Status banner | `Alert` | Variants: default (safe), custom `watch`, `destructive` (danger) |
| Zone label | `Badge` | Add variants `safe`, `watch`, `danger`, `offline` |
| Gauge / sensor card | `Card` | Header, big value, `Progress` |
| Sparkline / charts | `Chart` | Recharts under the hood |
| Shut off gas | `AlertDialog` | See 7.1 |
| Acknowledge | `Button` | Single tap, no dialog |
| Alert detail, event detail | `Sheet` | Bottom sheet on mobile |
| Add / edit contact | `Dialog` | |
| Toasts | `Sonner` | Non-critical confirmations only |
| Loading | `Skeleton` | Match the shape of the real content |
| Settings toggles | `Switch` | |
| Thresholds | `Slider` + `Input` | Keep both in sync |
| Event table (desktop) | `Table` | |
| Desktop nav | `Sidebar` | |
| Chat scroll | `ScrollArea` | |
| Date range | `Popover` + `Calendar` | |
| Sensor picker | `ToggleGroup` | |
| Help text | `Tooltip` | Never the only place for critical info (no hover on phones) |
| Forms | `Form`, `Input`, `Label`, `Select`, `Textarea` | zod validation |

### Custom components (built from shadcn parts)

- `StatusBanner`: wraps `Alert`, picks variant and icon from the current zone.
- `SensorCard`: wraps `Card`, `Badge`, `Progress`, mini `Chart`.
- `ConnectionBadge`: `Badge` showing Live, Stale, or Offline.
- `HoldToConfirmButton`: used inside the shut-off dialog (see 7.1).
- `EventRow`: icon, text, time, badge.

---

## 7. Critical Interaction Patterns

### 7.1 Shut off gas

1. Admin taps **Shut off gas** (`variant="destructive"`).
2. `AlertDialog` opens: title "Shut off the gas valve?", body explains the valve will close and gas will stop at the device.
3. Confirm with **Hold to confirm** (press and hold ~1.5 s) or a normal **Shut off** button. Cancel is the default focused action.
4. Show a pending state: "Command sent, waiting for device..." with a spinner.
5. Resolve to success ("Valve closed at 2:14:08 PM") or failure ("Device did not respond. Try again or use the manual valve.") using an `Alert`, not just a toast.
6. Every step is written to the Events timeline.

Viewers do not see the button. Show a disabled state with a short explanation only if the layout would otherwise feel broken.

### 7.2 Alert acknowledge and escalate

- Danger and watch alerts show a persistent `Alert` with **Acknowledge** as the primary button.
- Show a visible countdown to escalation: "Escalates to Maria in 1:42".
- After acknowledging, the banner stays until the reading returns to safe, but stops the sound and vibration.
- Provide **Mark as false alarm** after acknowledging.

### 7.3 Offline and stale data

- No reading for 60 s: `ConnectionBadge` turns gray and shows "Offline", and the banner explains it.
- App itself offline: top banner "You are offline. Showing data from 2:10 PM." Disable control buttons (valve, settings).
- Gauges dim and show a clock icon when stale. Never leave a green "safe" label on stale data.

### 7.4 Loading, empty, and error states

- Loading: `Skeleton` that matches the layout.
- Empty: short message with an icon and one next step ("No events yet. Readings will appear here.").
- Error: `Alert variant="destructive"` with a **Retry** button.

---

## 8. Notifications and Alerts in the UI

| Level | Visual | Sound / haptic | Dismissal |
| --- | --- | --- | --- |
| Info | `Sonner` toast | None | Auto-dismiss |
| Watch | Amber `Alert` | Soft notification | Acknowledge |
| Danger | Red `Alert`, full-width, top of every screen | Loud, repeating, vibration | Acknowledge only |

- The danger banner is **sticky** and appears on every screen, not only the Dashboard.
- Web Push notifications use the same wording as in-app alerts: sensor, value, time.
- Do not use toasts for danger.

---

## 9. PWA Specifics

- `manifest.webmanifest`: name, short name, `display: standalone`, theme color, maskable icons (192, 512).
- `theme-color` meta follows the light and dark themes.
- Service worker caches the app shell and last readings. Show the offline banner described in 7.3.
- Install prompt: a dismissible `Alert` or `Dialog` shown after the second visit, with an "Add to Home Screen" button. Include iOS instructions (Share, Add to Home Screen).
- Web Push permission is asked on a user action (a **Turn on alerts** button), never on first load.
- Pull-to-refresh is optional. Live data should update through Supabase Realtime without it.

---

## 10. Accessibility

- Contrast: AA minimum in light and dark mode.
- Zones use color + icon + text label.
- All interactive elements are keyboard reachable with visible focus rings (shadcn default `ring`).
- Alerts use `role="alert"` for danger and `role="status"` for safe and info updates. Live-updating numbers should not announce every change to screen readers; announce only zone changes.
- Respect `prefers-reduced-motion`: replace pulsing animation with a static border.
- Do not rely on hover or tooltips for essential information.
- Dialogs trap focus and restore it on close (Radix handles this).

---

## 11. Motion

- Keep it minimal. Transitions 150 to 200 ms.
- Danger banner may pulse gently once on entry, not continuously.
- Gauge values animate between readings with a short ease, and stop animating when stale.
- Skeletons use the shadcn pulse.

---

## 12. Content and Language

- Tone: short, calm, specific. "Gas level is high (340). Valve closed automatically." not "WARNING!!!"
- Always include: what, how much, when, and what the user can do.
- Units everywhere: ppm-equivalent or raw ADC (be consistent), and degrees Celsius.
- Time: 12-hour format with seconds for events, relative time for the dashboard. Timezone is the device's local time (Asia/Manila).
- All strings go through a translation layer (e.g. `next-intl`) from the start so English and Filipino can ship together.

---

## 13. Responsive Breakpoints

| Breakpoint | Layout |
| --- | --- |
| default (below 640px) | Single column, bottom tab bar, bottom `Sheet`s |
| `sm` (640px) | Two-column gauge grid |
| `md` (768px) | Sidebar replaces bottom bar, dialogs centered |
| `lg` (1024px) | Three-column gauge row, side-by-side cards |

---

## 14. Do and Don't

**Do**

- Use semantic tokens (`bg-danger`, `text-muted-foreground`) rather than raw colors.
- Put the one critical action (Acknowledge or Shut off) where the thumb reaches.
- Show the trigger reason on every alert.
- Keep Settings behind the admin role and confirm destructive changes.

**Don't**

- Don't use more than one `destructive` button on a screen.
- Don't hide the danger banner behind a tab or modal.
- Don't use toasts for safety-critical messages.
- Don't show a "Safe" state when data is stale or the device is offline.
- Don't restyle shadcn components with one-off classes; change the token or variant instead.

---

## 15. File Structure (suggested)

```
src/
  app/
    (auth)/login/
    (app)/
      dashboard/
      history/
      events/
      assistant/
      settings/
  components/
    ui/               # shadcn generated components (do not hand-edit heavily)
    status-banner.tsx
    sensor-card.tsx
    connection-badge.tsx
    hold-to-confirm-button.tsx
    event-row.tsx
  lib/
    zones.ts          # threshold -> zone mapping, shared by banner, badge, charts
```

`zones.ts` is the single source of truth for turning a reading and thresholds into `safe`, `watch`, `danger`, or `offline`. Every component reads from it so colors and labels never disagree.
