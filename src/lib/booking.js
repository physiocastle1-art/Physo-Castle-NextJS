/* The two checks that stand between a form submission and a booking.

   Both live here rather than in the route handlers because three routes need
   them — create, edit, and bulk create — and a slot rule enforced in only two
   of the three is not a rule.

   The distinction that matters:

   - A **clash** is never overridable. Two people in the same room with the same
     therapist is not a decision anyone makes on purpose.
   - **Outside clinic hours** is overridable, because an early Sunday visit for
     a post-op patient is a real thing a physiotherapist chooses to do. The
     caller has to say so explicitly by passing force. */

import { ApiError } from "@/lib/api";
import { findSessionConflicts, getClinicSettings } from "@/lib/clinic";
import { checkWithinHours } from "@/lib/hours";
import { formatDateTime } from "@/lib/format";

export const CONFLICT_CODE = "slot_conflict";
export const OUTSIDE_HOURS_CODE = "outside_hours";

export async function assertSlotIsFree({
  scheduledAt,
  durationMin = 45,
  therapist = "",
  excludeId = null,
  force = false,
} = {}) {
  const conflicts = await findSessionConflicts({ scheduledAt, durationMin, therapist, excludeId });

  if (conflicts.length) {
    const clash = conflicts[0];
    throw new ApiError(
      `That slot is already booked${clash.patient?.name ? ` — ${clash.patient.name}` : ""}.`,
      409,
      conflicts.map(
        (c) =>
          `${c.patient?.name || "Deleted patient"} · visit #${c.number} · ${formatDateTime(c.scheduledAt)} · ${c.durationMin} min`
      ),
      CONFLICT_CODE
    );
  }

  if (force) return;

  const settings = await getClinicSettings();
  const hours = checkWithinHours(settings, scheduledAt, durationMin);
  if (!hours.ok) {
    throw new ApiError(hours.reason, 409, null, OUTSIDE_HOURS_CODE);
  }
}
