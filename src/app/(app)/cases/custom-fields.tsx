export type TemplateField = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  options?: string[];
};

export function parseTemplateFields(fieldsJson: string): TemplateField[] {
  try {
    const parsed = JSON.parse(fieldsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseCustomValues(customFieldsJson: string): Record<string, string> {
  try {
    const parsed = JSON.parse(customFieldsJson);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Renders template-driven custom fields as form inputs named cf_<key>. */
export function CustomFieldInputs({
  fields,
  values = {},
}: {
  fields: TemplateField[];
  values?: Record<string, string>;
}) {
  if (fields.length === 0) return null;
  return (
    <fieldset className="card border-dashed p-4">
      <legend className="kicker px-1">Πεδια τομεα δικαιου</legend>
      <div className="grid sm:grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="label" htmlFor={`cf_${f.key}`}>
              {f.label}
            </label>
            {f.type === "select" ? (
              <select id={`cf_${f.key}`} name={`cf_${f.key}`} defaultValue={values[f.key] ?? ""} className="field">
                <option value="">—</option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`cf_${f.key}`}
                name={`cf_${f.key}`}
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                step={f.type === "number" ? "any" : undefined}
                defaultValue={values[f.key] ?? ""}
                className="field"
              />
            )}
          </div>
        ))}
      </div>
    </fieldset>
  );
}
