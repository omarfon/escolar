import type { ParamMap } from '@angular/router';

export function transferIdDesdeQuery(params: ParamMap): number | null {
  const raw = params.get('transferId');
  if (!raw) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}
