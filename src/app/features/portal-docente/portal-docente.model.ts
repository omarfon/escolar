import type { AuthUser } from '../../core/auth/models/auth.model';
import type {
  DocenteAsignacion,
  DocenteDetail,
  DocenteEstado,
  DocenteSalon,
} from '../matricula/maestros/docentes/docentes.model';

export interface PortalDocenteCursoCard {
  id: string;
  assignmentId: number;
  cursoId: number;
  cursoNombre: string;
  nivel: string;
  grado: string;
  seccion: string;
  gradoLabel: string;
  aulaLabel: string;
  alumnosCount: number;
  aforo: number;
  horario: string;
  horasSemanales: number;
}

export interface PortalDocenteCursoDocente {
  id: number;
  clave: string;
  nombre: string;
  gradoLabel: string;
  nivel: string;
  grado: string;
  seccion: string;
}

export function mapPortalCursoToDocente(
  c: PortalDocenteCursoCard,
): PortalDocenteCursoDocente {
  return {
    id: c.cursoId,
    clave: c.id,
    nombre: c.cursoNombre,
    gradoLabel: c.gradoLabel,
    nivel: c.nivel,
    grado: c.grado,
    seccion: c.seccion,
  };
}

export interface PortalDocenteMiAulaResponse {
  docente: {
    id: number;
    nombreCompleto: string;
    especialidad: string;
    sede: string;
    abrev: string;
  };
  anioEscolar: number;
  cursos: PortalDocenteCursoCard[];
  resumen: {
    totalCursos: number;
    totalSalones: number;
    totalAlumnos: number;
    horasSemanales: number;
  };
}

/** Construye perfil docente desde mi-aula + sesión cuando /me/perfil no está disponible. */
export function mapMiAulaToDocenteDetail(
  aula: PortalDocenteMiAulaResponse,
  user: AuthUser | null,
): DocenteDetail {
  const asignacionesMap = new Map<number, DocenteAsignacion>();

  for (const c of aula.cursos) {
    let asg = asignacionesMap.get(c.assignmentId);
    if (!asg) {
      asg = {
        id: c.assignmentId,
        cursoId: c.cursoId,
        cursoNombre: c.cursoNombre,
        nivel: c.nivel,
        grado: c.grado,
        secciones: [],
        horasSemanales: c.horasSemanales,
        salones: [],
      };
      asignacionesMap.set(c.assignmentId, asg);
    }
    if (!asg.secciones.includes(c.seccion)) {
      asg.secciones.push(c.seccion);
    }
    if (c.aforo && !asg.salones.some((s) => s.seccion === c.seccion)) {
      asg.salones.push({ seccion: c.seccion, aforo: c.aforo });
    }
  }

  const salonesMap = new Map<string, DocenteSalon>();
  for (const c of aula.cursos) {
    const gradoNorm = c.grado.replace(/^(\d+)°?$/, '$1°').trim();
    const seccionNorm = c.seccion.trim().toUpperCase();
    const key = `${c.nivel.trim()}|${gradoNorm}|${seccionNorm}`;
    if (!salonesMap.has(key)) {
      salonesMap.set(key, {
        nivel: c.nivel.trim(),
        grado: gradoNorm,
        seccion: seccionNorm,
        aforo: c.aforo,
        anioEscolar: aula.anioEscolar,
      });
    }
  }

  const [apellidosRaw, nombresRaw] = aula.docente.nombreCompleto.split(',').map((s) => s.trim());

  return {
    id: aula.docente.id,
    nombres: user?.nombre ?? nombresRaw ?? '',
    apellidos: user?.apellido ?? apellidosRaw ?? '',
    nombreCompleto: aula.docente.nombreCompleto,
    dni: '—',
    email: user?.email ?? '',
    username: user?.username ?? '',
    telefono: '—',
    direccion: '',
    sede: aula.docente.sede,
    estado: (user?.estado ?? 'activo') as DocenteEstado,
    especialidad: aula.docente.especialidad,
    tipo: 'nombrado',
    maxHoras: 30,
    horasAsignadas: aula.resumen.horasSemanales,
    totalAsignaciones: asignacionesMap.size,
    totalSalones: salonesMap.size,
    asignaciones: [...asignacionesMap.values()],
    salones: [...salonesMap.values()],
  };
}
