import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { catchError, finalize, switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiStudentGrades } from '../../../../core/api/api.models';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { GradingConfigService } from '../../../../core/grading/grading-config.service';
import { PerfilEstudiante } from '../../../academico/horarios/models/horario.model';
import { PortalEstudianteService } from '../../../portal-estudiante/services/portal-estudiante.service';
import { CursoNotasEstudiante, NivelLogro, NotaItem } from '../models/nota.model';

const CURSO_STYLE: Record<string, { emoji: string; colorClass: string; dotClass: string }> = {
  Matemática: { emoji: '🔢', colorClass: 'bg-indigo-100 text-indigo-800 border-indigo-200', dotClass: 'bg-indigo-500' },
  'Comprensión Lectora': { emoji: '📖', colorClass: 'bg-blue-100 text-blue-800 border-blue-200', dotClass: 'bg-blue-500' },
  'Ciencia y Tecnología': { emoji: '🔬', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200', dotClass: 'bg-emerald-500' },
  Comunicación: { emoji: '✍️', colorClass: 'bg-blue-100 text-blue-800 border-blue-200', dotClass: 'bg-blue-500' },
};

const DEFAULT_STYLE = { emoji: '📚', colorClass: 'bg-gray-100 text-gray-800 border-gray-200', dotClass: 'bg-gray-500' };

@Injectable({ providedIn: 'root' })
export class NotasEstudianteService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly grading = inject(GradingConfigService);
  private readonly portal = inject(PortalEstudianteService);
  private readonly base = `${environment.apiUrl}/students/me/grades`;

  readonly anioEscolar = new Date().getFullYear();

  private readonly _cursos = signal<CursoNotasEstudiante[]>([]);
  private readonly _bimestreActual = signal(1);
  readonly cursos = this._cursos.asReadonly();
  readonly bimestreActual = this._bimestreActual.asReadonly();
  readonly loading = signal(false);

  constructor() {
    if (this.auth.isAuthenticated()) {
      this.load();
    }
  }

  load(): void {
    this.loading.set(true);

    const request$ = this.auth.isPortalEstudiante()
      ? this.portal.ensureLoaded().pipe(
          switchMap(() =>
            this.http.get<ApiStudentGrades>(this.base, {
              params: new HttpParams().set('anioEscolar', String(this.anioEscolar)),
            }),
          ),
        )
      : this.http.get<ApiStudentGrades>(this.base, {
          params: new HttpParams().set('anioEscolar', String(this.anioEscolar)),
        });

    request$
      .pipe(
        tap(res => {
          this._bimestreActual.set(res.bimestreActual);
          this._cursos.set(res.cursos.map(curso => this.mapCurso(curso)));
        }),
        catchError(() => {
          this._cursos.set([]);
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe();
  }

  bimestrePermitido(bimestre: number): boolean {
    return bimestre <= this._bimestreActual();
  }

  getPerfil(): PerfilEstudiante {
    const perfil = this.portal.getPerfilOrNull();
    if (perfil) {
      return {
        nivel: perfil.nivel,
        grado: perfil.grado,
        seccion: perfil.seccion,
        aulaLabel: perfil.aulaLabel,
      };
    }
    return {
      nivel: 'Primaria',
      grado: '—',
      seccion: '—',
      aulaLabel: '—',
    };
  }

  getCursos(): CursoNotasEstudiante[] {
    return this._cursos();
  }

  todasLasNotas(curso: CursoNotasEstudiante): NotaItem[] {
    return [...curso.controlesDiarios, ...curso.parciales, ...curso.finales];
  }

  notasPorBimestre(items: NotaItem[], bimestre: number | null): NotaItem[] {
    const habilitados = items.filter(i => i.bimestre <= this._bimestreActual());
    if (bimestre === null) return habilitados;
    return habilitados.filter(i => i.bimestre === bimestre);
  }

  promedioItems(items: NotaItem[]): number {
    if (!items.length) return 0;
    return items.reduce((s, i) => s + i.nota, 0) / items.length;
  }

  promedioCurso(curso: CursoNotasEstudiante, bimestre: number | null = null): number {
    const items = bimestre === null
      ? this.todasLasNotas(curso).filter(i => i.bimestre <= this._bimestreActual())
      : [
          ...this.notasPorBimestre(curso.controlesDiarios, bimestre),
          ...this.notasPorBimestre(curso.parciales, bimestre),
          ...this.notasPorBimestre(curso.finales, bimestre),
        ];
    return this.promedioItems(items);
  }

  promedioGeneral(cursos: CursoNotasEstudiante[], bimestre: number | null = null): number {
    const proms = cursos.map(c => this.promedioCurso(c, bimestre)).filter(p => p > 0);
    return proms.length ? proms.reduce((s, p) => s + p, 0) / proms.length : 0;
  }

  nivelDesdeNota(nota: number): NivelLogro {
    return this.grading.nivelDeNota(nota) as NivelLogro;
  }

  nivelBadge(nivel: NivelLogro): string {
    return this.grading.badgeNivel(nivel);
  }

  notaColor(nota: number): string {
    return this.grading.colorPromedio(nota);
  }

  formatFecha(fecha: string): string {
    return format(parseISO(fecha), 'dd/MM/yyyy', { locale: es });
  }

  private mapCurso(curso: ApiStudentGrades['cursos'][number]): CursoNotasEstudiante {
    const style = CURSO_STYLE[curso.nombre] ?? DEFAULT_STYLE;
    return {
      id: curso.id,
      nombre: curso.nombre,
      area: curso.area,
      emoji: style.emoji,
      colorClass: style.colorClass,
      dotClass: style.dotClass,
      docenteAbrev: curso.docenteAbrev,
      controlesDiarios: curso.controlesDiarios,
      parciales: curso.parciales,
      finales: curso.finales,
    };
  }
}
