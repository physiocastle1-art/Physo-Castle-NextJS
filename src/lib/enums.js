/* The closed sets of allowed values, shared by the mongoose schemas, the
   validators and the UI labels.

   Lives apart from models.js, and uses relative imports everywhere it's
   consumed inside lib/, so the standalone scripts in scripts/ can import it
   with plain Node — which cannot resolve the "@/" alias. */

export const ROLES = ["owner", "admin", "staff"];
export const ROLE_RANK = { staff: 1, admin: 2, owner: 3 };

export const SESSION_STATUSES = ["scheduled", "completed", "cancelled", "no_show"];
export const PATIENT_STATUSES = ["active", "on_hold", "completed", "inactive"];
export const PAYMENT_METHODS = ["cash", "upi", "card", "bank_transfer", "cheque", "other"];
export const GENDERS = ["female", "male", "other", "undisclosed"];

/* Where a visit happens. A home visit carries its own address and travel
   charge; a clinic visit uses the clinic's. */
export const VISIT_TYPES = ["clinic", "home"];

export const EXPENSE_CATEGORIES = [
  "travel_home_visit",
  "clinic_rent",
  "medical_consumables",
  "software_sub",
  "equipment",
  "salaries",
  "utilities",
  "marketing",
  "other",
];

/* The catalogue of sellable treatment packages. */
export const PACKAGE_KINDS = ["clinic", "home_visit", "assessment", "other"];

/* 0 = Sunday, matching JavaScript's getDay(). Working hours are stored one
   entry per weekday, indexed by this number. */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
