import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { TrasladoTransparenciaSnapshot } from './traslados.service';

@Component({
  selector: 'app-traslados-transparencia-snapshot',
  standalone: true,
  imports: [DatePipe],
  template: `
@if (transparencia; as t) {
  <div class="rounded-xl border border-amber-100 bg-amber-50/60 p-4 space-y-3 text-sm" role="region" aria-label="Transparencia del snapshot">
    <div>
      <h3 class="font-bold text-amber-950">Datos congelados al registrar</h3>
      <p class="text-xs text-amber-900/80 mt-0.5">
        Los datos de IE y ámbito territorial corresponden al {{ t.datosCongeladosEn | date:'dd/MM/yyyy HH:mm' }}
        y no se actualizan automáticamente si cambia el padrón.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="rounded-lg border border-amber-100 bg-white/80 p-3">
        <p class="text-xs font-semibold text-[#64748b] uppercase tracking-wide">IE origen (snapshot)</p>
        <p class="font-medium text-[#1a202c] mt-1">{{ t.snapshot.ieOrigen.nombre }}</p>
        <p class="text-xs text-[#64748b]">Modular {{ t.snapshot.ieOrigen.codigoModular }}</p>
        <p class="text-xs text-[#64748b]">UGEL {{ t.snapshot.ieOrigen.ugel || '—' }} · DRE {{ t.snapshot.ieOrigen.dre || '—' }}</p>
      </div>
      <div class="rounded-lg border border-amber-100 bg-white/80 p-3">
        <p class="text-xs font-semibold text-[#64748b] uppercase tracking-wide">IE destino (snapshot)</p>
        <p class="font-medium text-[#1a202c] mt-1">{{ t.snapshot.ieDestino.nombre }}</p>
        <p class="text-xs text-[#64748b]">Modular {{ t.snapshot.ieDestino.codigoModular }}</p>
        <p class="text-xs text-[#64748b]">UGEL {{ t.snapshot.ieDestino.ugel || '—' }} · DRE {{ t.snapshot.ieDestino.dre || '—' }}</p>
      </div>
    </div>

    @if (t.padronDestinoActual; as padron) {
      @if (padron.encontrada) {
        <div class="rounded-lg border p-3" [class.border-amber-200]="padron.difiereDelSnapshot" [class.bg-white]="padron.difiereDelSnapshot" [class.border-emerald-100]="!padron.difiereDelSnapshot" [class.bg-emerald-50/50]="!padron.difiereDelSnapshot">
          <p class="text-xs font-semibold text-[#64748b] uppercase tracking-wide">Padrón destino actual (consulta viva)</p>
          @if (padron.difiereDelSnapshot) {
            <p class="text-xs text-amber-800 mt-1">
              El padrón difiere del snapshot en: {{ padron.camposDistintos.join(', ') }}.
            </p>
          } @else {
            <p class="text-xs text-emerald-800 mt-1">Coincide con el snapshot registrado.</p>
          }
          <p class="font-medium text-[#1a202c] mt-1">{{ padron.nombre }}</p>
          <p class="text-xs text-[#64748b]">UGEL {{ padron.ugel || '—' }} · DRE {{ padron.dre || '—' }}</p>
        </div>
      } @else {
        <p class="text-xs text-amber-800">La IE destino ya no aparece en el padrón institucional.</p>
      }
    }

    @if (t.vacanteAprobacion; as v) {
      <div class="rounded-lg border border-teal-100 bg-teal-50/50 p-3">
        <p class="text-xs font-semibold text-[#64748b] uppercase tracking-wide">Vacante al aprobar</p>
        <p class="text-sm text-[#1a202c] mt-1">
          {{ v.nivel }} {{ v.grado }} · sección {{ v.seccionAsignada || '—' }}
          · cupos libres {{ v.vacantesDisponibles }} / {{ v.vacantesEnSeccion }}
        </p>
        @if (v.registradaEn) {
          <p class="text-xs text-[#64748b]">Registrado {{ v.registradaEn | date:'dd/MM/yyyy HH:mm' }}</p>
        }
      </div>
    }
  </div>
}
  `,
})
export class TrasladosTransparenciaSnapshotComponent {
  @Input({ required: true }) transparencia!: TrasladoTransparenciaSnapshot | null;
}
