import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  DirectorioInstitucionesService,
  InstitucionDirectorio,
} from '../../features/instituciones/directorio-instituciones.service';
import { TenantContextService } from './tenant-context.service';

export type TenantInstitutionPickerValue = '' | 'all' | number;

/** Emite el modo de consulta según la selección del picker. */
export type TenantInstitutionConsultaModo = 'pending' | 'global' | 'institution';

@Component({
  selector: 'app-tenant-institution-picker',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (tenant.canSelectInstitution()) {
      <div [class]="wrapperClass">
        <label [class]="labelClass" [attr.for]="inputId">
          {{ label }}
          @if (required) {
            <span class="text-red-400">*</span>
          }
        </label>
        <select
          [id]="inputId"
          [class]="selectClass"
          [ngModel]="modelValue()"
          (ngModelChange)="onModelChange($event)"
          [class.border-amber-400]="required && modelValue() === ''"
          [class.ring-amber-100]="required && modelValue() === ''">
          <option value="">{{ placeholder }}</option>
          @if (allowGlobal) {
            <option value="all">Todas las instituciones (vista SIAGIE)</option>
          }
          @for (ie of instituciones(); track ie.id) {
            <option [value]="ie.id">{{ formatLabel(ie) }}</option>
          }
        </select>
        @if (hint) {
          <p class="text-[11px] text-gray-400 mt-1">{{ hint }}</p>
        }
      </div>
    }
  `,
})
export class TenantInstitutionPickerComponent implements OnInit {
  @Input() label = 'Institución educativa';
  @Input() placeholder = '— Seleccione institución —';
  @Input() hint = '';
  @Input() allowGlobal = false;
  @Input() required = true;
  @Input() wrapperClass = '';
  @Input() labelClass =
    'text-[11px] font-semibold uppercase tracking-wide text-gray-400';
  @Input() selectClass =
    'mt-1.5 w-full min-w-[16rem] rounded-xl border-2 border-gray-100 bg-gray-50/80 px-3 py-2.5 text-sm text-gray-700 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all';
  @Input() inputId = 'tenant-institution-picker';

  /** Valor controlado desde el padre ('' | 'all' | id). */
  @Input() value: TenantInstitutionPickerValue = '';

  @Output() valueChange = new EventEmitter<TenantInstitutionPickerValue>();
  @Output() modoChange = new EventEmitter<TenantInstitutionConsultaModo>();

  readonly tenant = inject(TenantContextService);
  private readonly directorio = inject(DirectorioInstitucionesService);

  readonly instituciones = signal<InstitucionDirectorio[]>([]);
  readonly modelValue = signal<string>('');

  ngOnInit(): void {
    if (this.tenant.canSelectInstitution()) {
      const id = this.tenant.activeInstitutionId();
      if (id != null) {
        this.modelValue.set(String(id));
      } else {
        this.syncFromInput();
      }
    } else {
      this.syncFromInput();
    }
    if (!this.tenant.canSelectInstitution()) return;
    this.directorio.instituciones().subscribe({
      next: (list) => {
        this.instituciones.set(list);
        this.syncLabelFromList(list);
      },
      error: () => this.instituciones.set([]),
    });
  }

  formatLabel(ie: InstitucionDirectorio): string {
    return `${ie.siglas} · ${ie.nombre}`;
  }

  onModelChange(raw: string): void {
    const parsed = this.parseRaw(raw);
    this.applySelection(parsed);
  }

  /** Sincroniza desde tenant/header externo. */
  syncFromTenant(): void {
    if (!this.tenant.canSelectInstitution()) return;
    const id = this.tenant.activeInstitutionId();
    if (id != null) {
      this.applySelection(id, { syncTenant: false });
      return;
    }
    if (this.allowGlobal && this.modelValue() === 'all') {
      return;
    }
    this.applySelection('', { syncTenant: false });
  }

  private syncFromInput(): void {
    const v = this.value;
    if (v === 'all') {
      this.modelValue.set('all');
      return;
    }
    if (typeof v === 'number' && v > 0) {
      this.modelValue.set(String(v));
      return;
    }
    this.modelValue.set('');
  }

  private parseRaw(raw: string): TenantInstitutionPickerValue {
    if (!raw) return '';
    if (raw === 'all') return 'all';
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : '';
  }

  private applySelection(
    parsed: TenantInstitutionPickerValue,
    options?: { syncTenant?: boolean },
  ): void {
    const syncTenant = options?.syncTenant !== false;
    this.modelValue.set(
      parsed === '' ? '' : parsed === 'all' ? 'all' : String(parsed),
    );
    this.valueChange.emit(parsed);

    if (parsed === '') {
      if (syncTenant) this.tenant.clear();
      this.modoChange.emit('pending');
      return;
    }

    if (parsed === 'all') {
      if (syncTenant) this.tenant.clear();
      this.modoChange.emit('global');
      return;
    }

    const ie = this.instituciones().find((item) => item.id === parsed);
    if (syncTenant) {
      this.tenant.setActiveInstitutionId(parsed, {
        label: ie ? this.formatLabel(ie) : undefined,
      });
    }
    this.modoChange.emit('institution');
  }

  private syncLabelFromList(list: InstitucionDirectorio[]): void {
    const id = this.tenant.activeInstitutionId();
    if (id == null) return;
    const ie = list.find((item) => item.id === id);
    if (ie) {
      this.tenant.setActiveInstitutionId(id, { label: this.formatLabel(ie) });
    }
  }
}
