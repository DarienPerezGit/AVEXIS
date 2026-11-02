import { hoyEnEstudio, sumarDias } from '../audiencias/calendario.js';
import { hashPassword } from '../auth/password.js';
import { Audiencia, Cliente, Expediente, Honorario, Movimiento, Usuario } from '../models/index.js';
import type { Rol } from '../models/index.js';

/** Shared password of every demo user, documented in the README. Meets the 15 character policy (ADR 0001). */
export const DEMO_PASSWORD = 'demo avexis 2026';

export const DEMO_USUARIOS = {
  titular: { nombre: 'Marta Sosa', email: 'titular@avexis.demo', rol: 'ABOGADO', esTitular: true },
  abogado: { nombre: 'Julian Rios', email: 'abogado@avexis.demo', rol: 'ABOGADO', esTitular: false },
  abogada: { nombre: 'Paula Mendez', email: 'abogada@avexis.demo', rol: 'ABOGADO', esTitular: false },
  asistente: { nombre: 'Lucia Fernandez', email: 'asistente@avexis.demo', rol: 'ASISTENTE', esTitular: false },
} as const satisfies Record<string, { nombre: string; email: string; rol: Rol; esTitular: boolean }>;

export interface SeedOptions {
  nodeEnv: string;
  /** Hearings are scheduled relative to this moment, so the alert always has something to show. */
  now: Date;
}

/**
 * Resets the database to a known demo state: empties every collection and loads a small Argentine law firm.
 * Running it twice leaves the same data. It never runs in production, where the data is real;
 * the first real titular comes from `crearTitularInicial` instead.
 */
export async function seedDemo({ nodeEnv, now }: SeedOptions) {
  if (nodeEnv === 'production') {
    throw new Error('The demo seed empties the database and never runs in production');
  }

  await Promise.all([
    Usuario.deleteMany({}),
    Cliente.deleteMany({}),
    Expediente.deleteMany({}),
    Movimiento.deleteMany({}),
    Audiencia.deleteMany({}),
    Honorario.deleteMany({}),
  ]);

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const [titular, abogado, abogada, asistente] = await Usuario.create(
    Object.values(DEMO_USUARIOS).map((usuario) => ({ ...usuario, passwordHash, debeCambiarPassword: false })),
  );

  const [laura, mario, sofia, constructora, logistica] = await Cliente.create([
    { tipo: 'FISICA', nombre: 'Laura Gimenez', dni: '28456123', email: 'laura.gimenez@mail.com', telefono: '11 5555-0101', direccion: 'Av. Corrientes 1234, CABA' },
    { tipo: 'FISICA', nombre: 'Mario Benitez', dni: '31789456', email: 'mario.benitez@mail.com', telefono: '11 5555-0102' },
    { tipo: 'FISICA', nombre: 'Sofia Acosta', dni: '40123987', email: 'sofia.acosta@mail.com', telefono: '221 555-0103', direccion: 'Calle 7 845, La Plata' },
    { tipo: 'JURIDICA', nombre: 'Constructora del Plata SA', cuit: '30-71548923-2', email: 'legales@delplata.com.ar', telefono: '11 4444-0201' },
    { tipo: 'JURIDICA', nombre: 'Logistica Sur SRL', cuit: '30-70891245-6', email: 'administracion@logisticasur.com.ar', telefono: '11 4444-0202' },
  ]);

  const hoy = hoyEnEstudio(now);
  const haceDias = (dias: number) => sumarDias(hoy, -dias);
  // Case numbers carry the year the case started, which moves with the run date.
  const numero = (n: number, inicio: Date) => `${n}/${inicio.getUTCFullYear()}`;

  const [despido, danios, cobro, divorcio, sucesion, amparo] = await Expediente.create([
    { numero: numero(12345, haceDias(300)), caratula: 'Gimenez, Laura c/ Logistica Sur SRL s/ despido', fuero: 'LABORAL', clienteId: laura._id, abogadoResponsableId: abogado._id, fechaInicio: haceDias(300) },
    { numero: numero(23456, haceDias(240)), caratula: 'Benitez, Mario c/ Transporte Rapido SA s/ daños y perjuicios', fuero: 'CIVIL', clienteId: mario._id, abogadoResponsableId: abogada._id, fechaInicio: haceDias(240) },
    { numero: numero(34567, haceDias(90)), caratula: 'Constructora del Plata SA c/ Inmobiliaria Norte SRL s/ cobro de pesos', fuero: 'COMERCIAL', clienteId: constructora._id, abogadoResponsableId: titular._id, fechaInicio: haceDias(90) },
    { numero: numero(45678, haceDias(60)), caratula: 'Acosta, Sofia s/ divorcio', fuero: 'FAMILIA', estado: 'EN_ESPERA', clienteId: sofia._id, abogadoResponsableId: abogada._id, fechaInicio: haceDias(60), observaciones: 'Se espera la ratificacion de la otra parte' },
    { numero: numero(56789, haceDias(700)), caratula: 'Benitez, Ramon s/ sucesion ab intestato', fuero: 'CIVIL', estado: 'ARCHIVADO', clienteId: mario._id, abogadoResponsableId: abogado._id, fechaInicio: haceDias(700) },
    { numero: numero(67890, haceDias(30)), caratula: 'Logistica Sur SRL c/ ARCA s/ amparo', fuero: 'ADMINISTRATIVO', clienteId: logistica._id, abogadoResponsableId: abogado._id, fechaInicio: haceDias(30) },
  ]);

  await Movimiento.create([
    { expedienteId: despido._id, usuarioId: abogado._id, tipo: 'ESCRITO', descripcion: 'Se presenta demanda con prueba documental', fecha: haceDias(295) },
    { expedienteId: despido._id, usuarioId: asistente._id, tipo: 'CEDULA', descripcion: 'Se diligencia cedula de traslado de demanda', fecha: haceDias(280) },
    { expedienteId: despido._id, usuarioId: asistente._id, tipo: 'NOTIFICACION', descripcion: 'Se notifica la apertura a prueba', fecha: haceDias(120) },
    { expedienteId: danios._id, usuarioId: abogada._id, tipo: 'ESCRITO', descripcion: 'Se contesta excepcion de prescripcion', fecha: haceDias(200) },
    { expedienteId: danios._id, usuarioId: asistente._id, tipo: 'OFICIO', descripcion: 'Se libra oficio al Registro de la Propiedad Automotor', fecha: haceDias(150) },
    { expedienteId: danios._id, usuarioId: abogada._id, tipo: 'RESOLUCION', descripcion: 'Se rechaza la excepcion de prescripcion, con costas', fecha: haceDias(100) },
    { expedienteId: cobro._id, usuarioId: titular._id, tipo: 'ESCRITO', descripcion: 'Se inicia ejecucion de facturas impagas', fecha: haceDias(88) },
    { expedienteId: divorcio._id, usuarioId: abogada._id, tipo: 'AUDIENCIA', descripcion: 'Audiencia de conciliacion sin acuerdo', fecha: haceDias(40) },
    { expedienteId: sucesion._id, usuarioId: abogado._id, tipo: 'RESOLUCION', descripcion: 'Se dicta declaratoria de herederos', fecha: haceDias(400) },
    { expedienteId: amparo._id, usuarioId: abogado._id, tipo: 'OTRO', descripcion: 'Se acompaña documental de la empresa', fecha: haceDias(25) },
  ]);

  const enDias = (dias: number) => sumarDias(hoy, dias);
  await Audiencia.create([
    { expedienteId: amparo._id, abogadoId: abogado._id, fecha: enDias(1), hora: '12:00', tipo: 'VENCIMIENTO', esVencimientoFatal: true },
    { expedienteId: despido._id, abogadoId: abogado._id, fecha: enDias(3), hora: '09:30', tipo: 'AUDIENCIA' },
    { expedienteId: danios._id, abogadoId: abogada._id, fecha: enDias(5), hora: '10:00', tipo: 'PERICIA' },
    { expedienteId: cobro._id, abogadoId: titular._id, fecha: enDias(6), hora: '11:00', tipo: 'AUDIENCIA' },
    { expedienteId: divorcio._id, abogadoId: abogada._id, fecha: enDias(15), hora: '09:00', tipo: 'VENCIMIENTO' },
    { expedienteId: despido._id, abogadoId: abogado._id, fecha: haceDias(10), hora: '10:30', tipo: 'AUDIENCIA', estado: 'REALIZADA' },
    { expedienteId: danios._id, abogadoId: abogada._id, fecha: enDias(8), hora: '08:30', tipo: 'AUDIENCIA', estado: 'CANCELADA' },
  ]);

  await Honorario.create([
    { expedienteId: despido._id, montoPactado: 1_800_000, pagos: [{ monto: 600_000, fecha: haceDias(200), usuarioId: abogado._id }] },
    { expedienteId: cobro._id, montoPactado: 2_500_000 },
    { expedienteId: sucesion._id, montoPactado: 900_000, pagos: [{ monto: 900_000, fecha: haceDias(390), usuarioId: abogado._id }] },
  ]);
}
