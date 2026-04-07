import { useState, useEffect } from 'react';
import { Save, ChevronDown, ChevronRight, Loader2, Check } from 'lucide-react';

export interface CaseFormValues {
  caseType: string | null;
  reportType: string | null;
  jurisdiction: string | null;
  opposingExpert: string | null;
  deadline: string | null;
}

interface CaseFormProps {
  initial: CaseFormValues;
  onSave: (values: Partial<CaseFormValues>) => Promise<void>;
  defaultOpen?: boolean;
}

const CASE_TYPES = [
  { value: 'slip_fall', label: 'Slip & Fall' },
  { value: 'trip_fall', label: 'Trip & Fall' },
  { value: 'stair_incident', label: 'Stair Incident' },
  { value: 'walkway_hazard', label: 'Walkway Hazard' },
  { value: 'construction_defect', label: 'Construction Defect' },
  { value: 'surveillance', label: 'Surveillance Analysis' },
];

const REPORT_TYPES = [
  { value: 'initial', label: 'Initial Report' },
  { value: 'rebuttal', label: 'Rebuttal Report' },
  { value: 'supplemental', label: 'Supplemental Report' },
];

function toDateInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function CaseForm({ initial, onSave, defaultOpen = true }: CaseFormProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [values, setValues] = useState<CaseFormValues>(initial);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => { setValues(initial); }, [initial]);

  const dirty =
    values.caseType !== initial.caseType ||
    values.reportType !== initial.reportType ||
    values.jurisdiction !== initial.jurisdiction ||
    values.opposingExpert !== initial.opposingExpert ||
    values.deadline !== initial.deadline;

  const handleSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const payload: Partial<CaseFormValues> = {
        caseType: values.caseType,
        reportType: values.reportType,
        jurisdiction: values.jurisdiction,
        opposingExpert: values.opposingExpert,
        deadline: values.deadline ? new Date(values.deadline).toISOString() : null,
      };
      await onSave(payload);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = 'w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-primary)]';

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-[var(--color-bg-elevated)] transition-colors"
      >
        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">Case Details</h3>
        {open ? <ChevronDown size={14} className="text-[var(--color-text-muted)]" /> : <ChevronRight size={14} className="text-[var(--color-text-muted)]" />}
      </button>
      {open && (
        <div className="px-5 pb-4 space-y-3">
          <div>
            <label className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">Case Type</label>
            <select
              value={values.caseType ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, caseType: e.target.value || null }))}
              className={fieldClass}
            >
              <option value="">—</option>
              {CASE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">Report Type</label>
            <select
              value={values.reportType ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, reportType: e.target.value || null }))}
              className={fieldClass}
            >
              <option value="">—</option>
              {REPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">Jurisdiction</label>
            <input
              type="text"
              value={values.jurisdiction ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, jurisdiction: e.target.value || null }))}
              placeholder="Clark County, Nevada"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">Opposing Expert</label>
            <input
              type="text"
              value={values.opposingExpert ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, opposingExpert: e.target.value || null }))}
              placeholder="Plaintiff Expert name"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">Deadline</label>
            <input
              type="date"
              value={toDateInput(values.deadline)}
              onChange={(e) => setValues((v) => ({ ...v, deadline: e.target.value || null }))}
              className={fieldClass}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors ${
              dirty
                ? 'bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-hover)] text-white'
                : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] cursor-not-allowed'
            }`}
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : savedFlash ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
            {saving ? 'Saving…' : savedFlash ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
