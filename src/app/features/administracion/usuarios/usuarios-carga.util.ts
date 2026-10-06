import * as XLSX from 'xlsx';
import { CreateUsuarioPayload, EstadoUsuario, RolUsuario } from './usuarios.model';

export const PLANTILLA_HEADERS = [
  'nombres',
  'apellidos',
  'dni',
  'email',
  'telefono',
  'rol',
  'sede',
  'estado',
  'cargo',
  'password',
] as const;

const PLANTILLA_EJEMPLOS: string[][] = [
  [
    'Juan',
    'Perez Torres',
    '12345678',
    'juan.perez@colegio.edu.pe',
    '987654321',
    'DOCENTE',
    'Sede Central',
    'activo',
    'Docente de Matematicas',
    'Clave1234',
  ],
  [
    'Maria',
    'Garcia Lopez',
    '87654321',
    'maria.garcia@colegio.edu.pe',
    '987123456',
    'SECRETARIA',
    'Sede Central',
    'activo',
    'Secretaria Academica',
    'Clave1234',
  ],
];

export const ROLES_VALIDOS: RolUsuario[] = [
  'ADMIN',
  'DIRECTOR',
  'DOCENTE',
  'SECRETARIA',
  'TESORERO',
  'PADRE',
  'ESTUDIANTE',
  'BIBLIOTECARIO',
  'UGEL',
  'DRE',
  'MINEDU',
];

export const ESTADOS_VALIDOS: EstadoUsuario[] = ['activo', 'inactivo', 'bloqueado'];

export type FormatoPlantilla = 'csv' | 'excel';

export interface FilaCargaUsuario extends CreateUsuarioPayload {
  fila: number;
  errores: string[];
  valido: boolean;
}

export interface ResultadoCargaMasiva {
  total: number;
  creados: number;
  errores: { fila: number; email: string; dni: string; mensaje: string }[];
}

function normalizeHeader(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, '_');
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    if (Number.isInteger(value) && value >= 0 && value <= 99999999) {
      return String(value).padStart(8, '0').slice(-8);
    }
    return String(value);
  }
  return String(value).trim();
}

function validarColumnas(headers: string[]): void {
  const required = ['nombres', 'apellidos', 'dni', 'email', 'rol', 'password'];
  const missing = required.filter((h) => !headers.includes(h));
  if (missing.length) {
    throw new Error(`La plantilla no tiene las columnas requeridas: ${missing.join(', ')}`);
  }
}

function buildFilasFromRecords(
  records: { fila: number; data: Record<string, string> }[],
): FilaCargaUsuario[] {
  if (!records.length) return [];

  const headers = Object.keys(records[0].data);
  validarColumnas(headers);

  const filas = records
    .map(({ fila, data }) => {
      if (!Object.values(data).some(Boolean)) return null;

      return validarFilaUsuario({
        fila,
        nombres: data['nombres'] ?? '',
        apellidos: data['apellidos'] ?? '',
        dni: data['dni'] ?? '',
        email: data['email'] ?? '',
        telefono: data['telefono'] ?? '',
        rol: (data['rol'] ?? '').toUpperCase() as RolUsuario,
        sede: data['sede'] || 'Sede Central',
        estado: (data['estado'] || 'activo').toLowerCase() as EstadoUsuario,
        cargo: data['cargo'] ?? '',
        password: data['password'] ?? '',
      });
    })
    .filter((row): row is FilaCargaUsuario => row !== null);

  const dnis = new Set<string>();
  const emails = new Set<string>();
  return filas.map((fila) => {
    const errores = [...fila.errores];
    if (dnis.has(fila.dni)) errores.push('DNI duplicado en el archivo');
    if (emails.has(fila.email.toLowerCase())) errores.push('Email duplicado en el archivo');
    dnis.add(fila.dni);
    emails.add(fila.email.toLowerCase());
    return { ...fila, errores, valido: errores.length === 0 };
  });
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

export function parsearCsvUsuarios(text: string): FilaCargaUsuario[] {
  const clean = text.replace(/^\uFEFF/, '').trim();
  if (!clean) return [];

  const lines = clean.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader);

  const records = lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line, delimiter);
    const data: Record<string, string> = {};
    headers.forEach((header, i) => {
      data[header] = (values[i] ?? '').trim();
    });
    return { fila: index + 2, data };
  });

  return buildFilasFromRecords(records);
}

export async function parsearExcelUsuarios(file: File): Promise<FilaCargaUsuario[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('El archivo Excel no contiene hojas de calculo');
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][];

  if (matrix.length < 2) return [];

  const headers = (matrix[0] ?? []).map((cell) => normalizeHeader(cellToString(cell)));
  const records = matrix.slice(1).map((row, index) => {
    const data: Record<string, string> = {};
    headers.forEach((header, i) => {
      data[header] = cellToString(row[i]);
    });
    return { fila: index + 2, data };
  });

  return buildFilasFromRecords(records);
}

export async function parsearArchivoUsuarios(file: File): Promise<FilaCargaUsuario[]> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'csv') {
    const text = await file.text();
    return parsearCsvUsuarios(text);
  }
  if (ext === 'xlsx' || ext === 'xls') {
    return parsearExcelUsuarios(file);
  }
  throw new Error('Formato no soportado. Use CSV (.csv) o Excel (.xlsx, .xls)');
}

function validarFilaUsuario(
  data: Omit<FilaCargaUsuario, 'errores' | 'valido'>,
): FilaCargaUsuario {
  const errores: string[] = [];

  if (!data.nombres) errores.push('Nombres es obligatorio');
  if (!data.apellidos) errores.push('Apellidos es obligatorio');
  if (!/^\d{8}$/.test(data.dni)) errores.push('DNI debe tener 8 digitos');
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errores.push('Email invalido');
  }
  if (!ROLES_VALIDOS.includes(data.rol)) {
    errores.push(`Rol invalido. Valores: ${ROLES_VALIDOS.join(', ')}`);
  }
  if (data.estado && !ESTADOS_VALIDOS.includes(data.estado)) {
    errores.push(`Estado invalido. Valores: ${ESTADOS_VALIDOS.join(', ')}`);
  }
  if (!data.password || data.password.length < 8) {
    errores.push('Password debe tener al menos 8 caracteres');
  }

  return { ...data, errores, valido: errores.length === 0 };
}

export function descargarPlantillaUsuarios(formato: FormatoPlantilla = 'excel'): void {
  if (formato === 'csv') {
    descargarPlantillaCsv();
    return;
  }
  descargarPlantillaExcel();
}

function descargarPlantillaCsv(): void {
  const csv = [
    PLANTILLA_HEADERS.join(','),
    ...PLANTILLA_EJEMPLOS.map((row) => row.join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'plantilla_usuarios.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function descargarPlantillaExcel(): void {
  const sheetData = [[...PLANTILLA_HEADERS], ...PLANTILLA_EJEMPLOS];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  worksheet['!cols'] = [
    { wch: 14 },
    { wch: 18 },
    { wch: 10 },
    { wch: 30 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 10 },
    { wch: 24 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');
  XLSX.writeFile(workbook, 'plantilla_usuarios.xlsx');
}
