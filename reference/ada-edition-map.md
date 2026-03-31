# ADA / A117.1 Edition Mapping
## SOURCE: ICC adoption records + DOJ ADA Standards for Accessible Design
## LAST VERIFIED: [DATE — pending § citations from Lane/CBO]

> ⚠️ ADA applicability depends on property type, construction date, and alteration history.

### ENFORCEMENT ARCHITECTURE (per Lane, 28 Mar 2026)
> - **ADA (federal):** Enforced by the Department of Justice. Applies to places of public accommodation (Title III) and state/local government facilities (Title II).
> - **A117.1 (standards body):** Originally published as CABO/ANSI A117.1; now ICC A117.1. Incorporated by reference into the IBC.
> - **Historical note:** CABO (Council of American Building Officials) was the original publisher. ICC absorbed CABO. Older editions cite "CABO/ANSI A117.1"; current editions are "ICC A117.1."
> - The IBC adopted its own version of the A117.1 standards, so the IBC edition determines which A117.1 edition applies to a given property.

## A117.1 Edition Timeline

| A117.1 Edition | Publication Year | Referenced By | Key Floor Surface Provisions |
|---|---|---|---|
| A117.1-1998 | 1998 | IBC 2000, IBC 2003 | § , § |
| A117.1-2003 | 2003 | IBC 2006, IBC 2009 | § , § |
| A117.1-2009 | 2009 | IBC 2012 | § , § |
| A117.1-2017 | 2017 | IBC 2018, IBC 2021 | § , § |

## ADA Trigger Logic (for Research Agent)

```
IF property is "place of public accommodation" (Title III)
  AND construction/alteration date ≥ 1992-01-26 (ADA effective)
  THEN:
    1. Determine applicable IBC edition from nevada-code-table.md
    2. Map IBC edition → A117.1 edition (table above)
    3. Check A117.1 §302 (floor surfaces) and §303 (changes in level)
    4. Check IBC Chapter 11 (accessibility) interaction
    5. If property was ALTERED after original construction:
       → ADA Standards for Accessible Design (28 CFR Part 36) apply to altered elements
       → "Path of travel" obligation triggers (20% cost cap)
```

## Dimensional Thresholds (VERIFY AGAINST SOURCE)

| Standard | Provision | Threshold | Source (§/page) |
|---|---|---|---|
| A117.1 §302 | Floor surface — firm, stable, slip-resistant | [qualitative — no DCOF number] | |
| A117.1 §303 | Changes in level — vertical ≤ 1/4" | 0.25 inches | |
| A117.1 §303 | Changes in level — beveled 1/4" to 1/2" | 1:2 max slope | |
| A117.1 §303 | Changes in level — > 1/2" | Treated as ramp (§405) | |
