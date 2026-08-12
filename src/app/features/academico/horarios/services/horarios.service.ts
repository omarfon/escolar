import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '@environments/environment';
import { AuthService } from '../../../../core/auth/services/auth.service';
import {
  DIAS,
  PERIODOS,
} from '../data/horario.constants';
import {
  HorarioContext,
  enrichCursoHorario,
  mapHorarioContext,
  normalizeGrado,
  normalizeSeccion,
} from '../models/horarios-admin.model';
import {
  CeldaCalendario,
  Curso,
  Docente,
  EntradaHorario,
  Nivel,
  PerfilEstudiante,
  Periodo,
} from '../models/horario.model';
import { PortalEstudianteService } from '../../../portal-estudiante/services/portal-estudiante.service';

const CURSO_COLORS: { colorClass: string; dotClass: string }[] = [
  { colorClass: 'bg-indigo-100 text-indigo-800 border-indigo-200', dotClass: 'bg-indigo-500' },
  { colorClass: 'bg-blue-100 text-blue-800 border-blue-200', dotClass: 'bg-blue-500' },
  { colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200', dotClass: 'bg-emerald-500' },
  { colorClass: 'bg-amber-100 text-amber-800 border-amber-200', dotClass: 'bg-amber-500' },
  { colorClass: 'bg-pink-100 text-pink-800 border-pink-200', dotClass: 'bg-pink-500' },
];

@Injectable({ providedIn: 'root' })
export class HorariosService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly portal = inject(PortalEstudianteService);
  private readonly base = environment.apiUrl;

  private readonly _perfil = signal<PerfilEstudiante | null>(null);
  private readonly _entradas = signal<EntradaHorario[]>([]);
  private readonly _cursos = signal<Curso[]>([]);
  private readonly _docentes = signal<Docente[]>([]);
  private readonly _periodosApi = signal<Periodo[]>([]);
  readonly perfil = this._perfil.asReadonly();
  readonly entradas = this._entradas.asReadonly();
  readonly loading = signal(false);

  constructor() {
    if (this.auth.isAuthenticated() && !this.auth.hasRole('PADRE')) {
      this.load();
    }
  }

  /** Carga el horario de un hijo (portal padre) desde el endpoint filtrado. */
  applyParentHorario(
    perfil: PerfilEstudiante,
    ctx: Pick<HorarioContext, 'periodos' | 'cursos' | 'docentes' | 'blocks'>,
  ): void {
    this._perfil.set(perfil);

    this._periodosApi.set(
      ctx.periodos.map(p => ({
        id: p.id,
        nombre: p.nombre,
        horaInicio: p.horaInicio,
        horaFin: p.horaFin,
        isReceso: p.isReceso,
        niveles: p.niveles as Nivel[],
      })),
    );

    this._cursos.set(
      ctx.cursos.map(c => {
        const enriched = enrichCursoHorario({
          id: c.id,
          nombre: c.nombre,
          area: c.area,
          nivel: (c.nivel ?? perfil.nivel) as typeof perfil.nivel,
        });
        return {
          id: enriched.id,
          nombre: enriched.nombre,
          area: enriched.area,
          colorClass: enriched.colorClass,
          dotClass: enriched.dotClass,
        };
      }),
    );

    this._docentes.set(
      ctx.docentes.map(d => ({
        id: d.id,
        apellidos: d.apellidos,
        nombres: d.nombres,
        abrev: d.abrev,
      })),
    );

    this._entradas.set(
      ctx.blocks.map(b => ({
        id: b.id,
        nivel: b.nivel as Nivel,
        grado: normalizeGrado(b.grado),
        seccion: normalizeSeccion(b.seccion),
        dia: b.dia,
        periodoId: b.periodoId,
        cursoId: b.cursoId,
        docenteId: b.docenteId,
      })),
    );
  }

  clearSchedule(): void {
    this._perfil.set(null);
    this._periodosApi.set([]);
    this._cursos.set([]);
    this._docentes.set([]);
    this._entradas.set([]);
  }

  load(): void {
    this.loading.set(true);

    const perfil$ = this.auth.isPortalEstudiante()
      ? this.portal.ensureLoaded()
      : of(null);

    perfil$.pipe(
      switchMap(perfilPortal => {
        if (perfilPortal) {
          this._perfil.set({
            nivel: perfilPortal.nivel,
            grado: perfilPortal.grado,
            seccion: perfilPortal.seccion,
            aulaLabel: perfilPortal.aulaLabel,
          });
        } else {
          this._perfil.set({
            nivel: 'Primaria',
            grado: '5°',
            seccion: 'A',
            aulaLabel: 'Primaria 5° · Sección A',
          });
        }
        return this.http.get<HorarioContext>(`${this.base}/horarios/context`);
      }),
      tap(ctx => {
        const mapped = mapHorarioContext(ctx);
        const perfil = this._perfil()!;
        const grado = normalizeGrado(perfil.grado);
        const seccion = normalizeSeccion(perfil.seccion);

        const blocks = mapped.blocks.filter(
          b =>
            b.nivel === perfil.nivel &&
            b.grado === grado &&
            b.seccion === seccion,
        );

        const cursoIds = new Set(blocks.map(b => b.cursoId));
        const docenteIds = new Set(blocks.map(b => b.docenteId));

        this._periodosApi.set(
          mapped.periodos.map(p => ({
            id: p.id,
            nombre: p.nombre,
            horaInicio: p.horaInicio,
            horaFin: p.horaFin,
            isReceso: p.isReceso,
            niveles: p.niveles as Nivel[],
          })),
        );

        this._cursos.set(
          mapped.cursos
            .filter(c => cursoIds.has(c.id))
            .map(c => ({
              id: c.id,
              nombre: c.nombre,
              area: c.area,
              colorClass: c.colorClass,
              dotClass: c.dotClass,
            })),
        );

        this._docentes.set(mapped.docentes.filter(d => docenteIds.has(d.id)));
        this._entradas.set(blocks);
        this.loading.set(false);
      }),
      catchError(() => {
        this.applyFallback();
        this.loading.set(false);
        return of(null);
      }),
    ).subscribe();
  }

  getPerfilEstudiante(): PerfilEstudiante {
    return this._perfil() ?? {
      nivel: 'Primaria',
      grado: '5°',
      seccion: 'A',
      aulaLabel: 'Primaria 5° · Sección A',
    };
  }

  getEntradas(perfil: PerfilEstudiante): EntradaHorario[] {
    return this._entradas().filter(
      (e) =>
        e.nivel === perfil.nivel &&
        normalizeGrado(e.grado) === normalizeGrado(perfil.grado) &&
        normalizeSeccion(e.seccion) === normalizeSeccion(perfil.seccion),
    );
  }

  getPeriodos(nivel: Nivel): Periodo[] {
    const fromApi = this._periodosApi();
    if (fromApi.length) {
      return fromApi.filter(p => p.niveles.includes(nivel));
    }
    return PERIODOS.filter((p) => p.niveles.includes(nivel));
  }

  curById(id: number): Curso | undefined {
    return this._cursos().find((c) => c.id === id);
  }

  docById(id: number): Docente | undefined {
    return this._docentes().find((d) => d.id === id);
  }

  diaHorarioDesdeFecha(fecha: Date): number | null {
    const jsDay = getDay(fecha);
    if (jsDay >= 1 && jsDay <= 5) return jsDay - 1;
    return null;
  }

  getEntrada(
    entradas: EntradaHorario[],
    dia: number,
    periodoId: number,
  ): EntradaHorario | null {
    return entradas.find((e) => e.dia === dia && e.periodoId === periodoId) ?? null;
  }

  clasesDelDia(
    entradas: EntradaHorario[],
    diaHorario: number,
    nivel: Nivel,
  ): { curso: Curso; periodo: Periodo; docente: Docente; entrada: EntradaHorario }[] {
    const periodos = this.getPeriodos(nivel).filter((p) => !p.isReceso);
    return periodos
      .map((periodo) => {
        const entrada = this.getEntrada(entradas, diaHorario, periodo.id);
        if (!entrada) return null;
        const curso = this.curById(entrada.cursoId);
        const docente = this.docById(entrada.docenteId);
        if (!curso || !docente) return null;
        return { curso, periodo, docente, entrada };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.periodo.id - b.periodo.id);
  }

  construirCalendarioMensual(
    mes: Date,
    entradas: EntradaHorario[],
    nivel: Nivel,
  ): CeldaCalendario[][] {
    const inicio = startOfWeek(startOfMonth(mes), { weekStartsOn: 1 });
    const fin = endOfWeek(endOfMonth(mes), { weekStartsOn: 1 });
    const dias = eachDayOfInterval({ start: inicio, end: fin });

    const semanas: CeldaCalendario[][] = [];
    for (let i = 0; i < dias.length; i += 7) {
      semanas.push(
        dias.slice(i, i + 7).map((fecha) => {
          const diaHorario = this.diaHorarioDesdeFecha(fecha);
          const clases =
            diaHorario !== null
              ? this.clasesDelDia(entradas, diaHorario, nivel).map(({ curso, periodo, docente }) => ({
                  curso,
                  periodo,
                  docente,
                }))
              : [];
          return {
            fecha,
            enMes: isSameMonth(fecha, mes),
            esHoy: isToday(fecha),
            esEscolar: diaHorario !== null,
            diaHorario,
            clases,
          };
        }),
      );
    }
    return semanas;
  }

  fechasSemanaLaboral(semanaRef: Date): Date[] {
    const lunes = startOfWeek(semanaRef, { weekStartsOn: 1 });
    return Array.from({ length: 5 }, (_, i) => addDays(lunes, i));
  }

  diaActualHorario(): number | null {
    return this.diaHorarioDesdeFecha(new Date());
  }

  horaSalida(nivel: Nivel): string {
    if (nivel === 'Inicial') return '1:00 PM';
    if (nivel === 'Primaria') return '2:15 PM';
    return '3:00 PM';
  }

  legendaCursos(entradas: EntradaHorario[]): Curso[] {
    const ids = new Set(entradas.map((e) => e.cursoId));
    return this._cursos().filter((c) => ids.has(c.id));
  }

  formatFecha(fecha: Date, patron = 'd MMM'): string {
    return format(fecha, patron, { locale: es });
  }

  formatMesAnio(fecha: Date): string {
    return format(fecha, 'MMMM yyyy', { locale: es });
  }

  formatDiaSemana(fecha: Date): string {
    return format(fecha, 'EEE', { locale: es });
  }

  nombreDia(dia: number): string {
    return DIAS[dia] ?? '';
  }

  esMismaFecha(a: Date, b: Date): boolean {
    return isSameDay(a, b);
  }

  private applyFallback(): void {
    this._perfil.set({
      nivel: 'Primaria',
      grado: '5°',
      seccion: 'A',
      aulaLabel: 'Primaria 5° · Sección A',
    });
    this._periodosApi.set([]);
    this._cursos.set([]);
    this._docentes.set([]);
    this._entradas.set([]);
  }
}
