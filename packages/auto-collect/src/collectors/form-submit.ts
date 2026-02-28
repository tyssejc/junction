/**
 * Form Submission Collector
 *
 * Tracks form submissions via event delegation.
 * Captures form identification (id, name, action, method) and field count.
 * Does NOT capture field values to avoid collecting PII.
 * Respects data-jct-ignore.
 */

import type { FormSubmitOptions, TeardownFn, Trackable } from "../types.js";
import { isIgnored, readDataAttributes } from "../utils/dom.js";

export function collectFormSubmit(collector: Trackable, options: FormSubmitOptions = {}): TeardownFn {
  const selector = options.selector ?? "form";

  function handleSubmit(e: SubmitEvent): void {
    const form = e.target as HTMLFormElement | null;
    if (!form || !(form instanceof HTMLFormElement)) return;
    if (!form.matches(selector)) return;
    if (isIgnored(form)) return;

    const jctData = readDataAttributes(form);
    const fields = form.elements.length;

    // Count field types without capturing values
    const fieldTypes: Record<string, number> = {};
    for (const el of form.elements) {
      if (el instanceof HTMLInputElement) {
        const type = el.type || "text";
        fieldTypes[type] = (fieldTypes[type] ?? 0) + 1;
      } else if (el instanceof HTMLTextAreaElement) {
        fieldTypes.textarea = (fieldTypes.textarea ?? 0) + 1;
      } else if (el instanceof HTMLSelectElement) {
        fieldTypes.select = (fieldTypes.select ?? 0) + 1;
      }
    }

    collector.track(jctData.entity ?? "form", jctData.action ?? "submitted", {
      form_id: form.id || undefined,
      form_name: form.name || undefined,
      action: form.action || undefined,
      method: (form.method || "get").toUpperCase(),
      field_count: fields,
      field_types: fieldTypes,
      ...propsFromData(jctData),
    });
  }

  document.addEventListener("submit", handleSubmit, { capture: true });

  return () => {
    document.removeEventListener("submit", handleSubmit, { capture: true });
  };
}

function propsFromData(data: Record<string, string>): Record<string, string> {
  const props: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith("prop-")) {
      props[key.slice("prop-".length)] = value;
    }
  }
  if (data.name) props.name = data.name;
  return props;
}
