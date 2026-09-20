import { PdfItem } from '../types';
import { createValidPdfBlob } from './pdfGenerator';

interface InitialPdfDef {
  name: string;
  folder: string;
  category: string;
  desc: string;
  sizeKb: number;
  daysAgo: number;
}

const INITIAL_DEFINITIONS: InitialPdfDef[] = [
  {
    name: 'factura_enero_2024_proveedor_it.pdf',
    folder: 'documentos/finanzas/2024/facturas',
    category: 'Finanzas y Facturación',
    desc: 'Factura fiscal emitida por proveedor de servicios cloud e infraestructura de enero 2024.',
    sizeKb: 142,
    daysAgo: 240
  },
  {
    name: 'factura_febrero_2024_servicios_nube.pdf',
    folder: 'documentos/finanzas/2024/facturas',
    category: 'Finanzas y Facturación',
    desc: 'Comprobante de pago de servicios gestionados y licencias corporativas de febrero 2024.',
    sizeKb: 188,
    daysAgo: 210
  },
  {
    name: 'factura_marzo_2024_alquiler_oficinas.pdf',
    folder: 'documentos/finanzas/2024/facturas',
    category: 'Finanzas y Facturación',
    desc: 'Recibo y factura electrónica por canon de arrendamiento sede central marzo 2024.',
    sizeKb: 125,
    daysAgo: 180
  },
  {
    name: 'cierre_contable_anual_ejercicio_2023.pdf',
    folder: 'documentos/finanzas/2023/cierre',
    category: 'Auditoría Contable',
    desc: 'Estado financiero consolidado, balance general y cuenta de resultados auditoría 2023.',
    sizeKb: 540,
    daysAgo: 290
  },
  {
    name: 'presupuesto_anual_operaciones_2024.pdf',
    folder: 'documentos/finanzas/presupuestos',
    category: 'Planificación Financiera',
    desc: 'Asignación presupuestaria departamental y desglose de costes operativos del ejercicio.',
    sizeKb: 310,
    daysAgo: 160
  },
  {
    name: 'contrato_prestacion_servicios_tech_corp.pdf',
    folder: 'documentos/legal/contratos',
    category: 'Asuntos Legales',
    desc: 'Contrato marco de desarrollo tecnológico y soporte con cláusulas de nivel de servicio SLA.',
    sizeKb: 275,
    daysAgo: 95
  },
  {
    name: 'contrato_arrendamiento_inmuebles_2024.pdf',
    folder: 'documentos/legal/contratos',
    category: 'Asuntos Legales',
    desc: 'Contrato legal de renovación de alquiler con garantías y fianza depositada.',
    sizeKb: 198,
    daysAgo: 120
  },
  {
    name: 'acuerdo_confidencialidad_nda_partner_global.pdf',
    folder: 'documentos/legal/nda',
    category: 'Acuerdos de Confidencialidad',
    desc: 'Convenio bilateral de estricta reserva y secreto comercial con socio estratégico internacional.',
    sizeKb: 165,
    daysAgo: 45
  },
  {
    name: 'estatutos_corporativos_modificacion_v2.pdf',
    folder: 'documentos/legal/estatutos',
    category: 'Gobierno Corporativo',
    desc: 'Acta notarial y transcripción de estatutos fundacionales debidamente certificados.',
    sizeKb: 430,
    daysAgo: 310
  },
  {
    name: 'nomina_enero_2024_departamento_it.pdf',
    folder: 'documentos/recursos_humanos/nominas/2024',
    category: 'Recursos Humanos',
    desc: 'Planilla consolidada de liquidación de haberes y aportes de seguridad social enero 2024.',
    sizeKb: 215,
    daysAgo: 235
  },
  {
    name: 'nomina_febrero_2024_departamento_it.pdf',
    folder: 'documentos/recursos_humanos/nominas/2024',
    category: 'Recursos Humanos',
    desc: 'Planilla consolidada de nómina mensual para equipo de ingeniería febrero 2024.',
    sizeKb: 218,
    daysAgo: 205
  },
  {
    name: 'manual_bienvenida_y_politicas_empleado.pdf',
    folder: 'documentos/recursos_humanos/politicas',
    category: 'Cultura y Políticas',
    desc: 'Guía de inducción para nuevos ingresos con normativa interna, horarios y beneficios.',
    sizeKb: 680,
    daysAgo: 80
  },
  {
    name: 'propuesta_tecnica_arquitectura_cloud.pdf',
    folder: 'documentos/operaciones/proyectos',
    category: 'Arquitectura Técnica',
    desc: 'Diseño de microservicios, esquemas de escalabilidad y plan de despliegue en Kubernetes.',
    sizeKb: 720,
    daysAgo: 30
  },
  {
    name: 'manual_procedimientos_calidad_iso9001.pdf',
    folder: 'documentos/operaciones/manuales',
    category: 'Calidad y Procesos',
    desc: 'Protocolos de gestión de calidad, trazabilidad y control de incidencias normadas.',
    sizeKb: 890,
    daysAgo: 150
  },
  {
    name: 'cotizacion_licenciamiento_empresa_acme.pdf',
    folder: 'documentos/ventas/cotizaciones',
    category: 'Propuestas Comerciales',
    desc: 'Oferta económica y términos comerciales formalizados para cliente corporativo.',
    sizeKb: 175,
    daysAgo: 18
  },
  {
    name: 'informe_rendimiento_comercial_q1.pdf',
    folder: 'documentos/ventas/informes',
    category: 'Métricas Comerciales',
    desc: 'Balance trimestral de conversiones de ventas, embudo comercial y retención de cuentas.',
    sizeKb: 340,
    daysAgo: 70
  }
];

export function getInitialRepositoryItems(): PdfItem[] {
  const now = Date.now();
  return INITIAL_DEFINITIONS.map((def, idx) => {
    const fullPath = `${def.folder}/${def.name}`;
    const blob = createValidPdfBlob(def.name, fullPath, {
      category: def.category,
      description: def.desc,
      creationDate: new Date(now - def.daysAgo * 86400000).toLocaleDateString('es-ES')
    });

    return {
      id: `repo-item-${idx + 1}`,
      name: def.name,
      folder: def.folder,
      path: fullPath,
      size: def.sizeKb * 1024,
      lastModified: now - def.daysAgo * 86400000,
      origin: 'repository',
      blob,
      summary: def.desc
    };
  });
}
