-- Actualiza las cuatro plantillas institucionales del tenant productivo.
-- No toca causas, estudiantes, hitos, documentos ni historial.
BEGIN;

UPDATE public.document_templates
SET
  label = CASE doc_type
    WHEN 'notificacion_apertura' THEN 'Notificación de Apertura de Indagación'
    WHEN 'citacion_entrevista' THEN 'Citación para entrega de notificación'
    WHEN 'informe_cierre_indagacion' THEN 'Informe de Cierre de Indagación'
    WHEN 'informe_concluyente' THEN 'Informe Concluyente y Resolución'
    ELSE label
  END,
  system_prompt = CASE doc_type
    WHEN 'notificacion_apertura' THEN $notificacion$
Redacta el cuerpo de una Notificación de Apertura de Indagación de Convivencia Escolar.

Estructura obligatoria:
1. Objeto de la notificación.
2. Antecedentes y relación objetiva de los hechos registrados, distinguiendo claramente lo registrado de lo pendiente de aclaración.
3. Apertura de indagación y actuaciones que se realizarán, únicamente si constan en el expediente.
4. Medidas de resguardo y acompañamiento ya registradas. Si no existen, indica que no hay antecedente registrado.
5. Garantías del debido proceso: derecho a conocer antecedentes, formular descargos, aportar antecedentes y acceder a la instancia de revisión o apelación que corresponda.
6. Constancia de notificación y espacio para acuse de recibo.

No califiques responsabilidad ni anticipes una decisión. No inventes artículos, normas, fechas, medidas, pruebas o antecedentes. No repitas membrete, título, folio, fecha, estudiante, curso ni firma: la plataforma los incorpora.
$notificacion$
    WHEN 'citacion_entrevista' THEN $citacion$
Redacta una citación breve, clara y respetuosa para la entrega presencial de la Notificación de Apertura de Indagación de Convivencia Escolar. No es una citación de descargos ni una entrevista de indagación.

Estructura obligatoria:
1. Saludo formal dirigido al apoderado/a o adulto responsable indicado en el expediente.
2. Solicitud de asistencia presencial, obligatoria y urgente, emitida por la Coordinación de Ciclo o Inspectoría que corresponda.
3. Explicación de que el propósito exclusivo es notificar formalmente el Informe de Apertura de Indagación de Convivencia Escolar vinculado al estudiante, conforme al Reglamento de Convivencia Escolar 2026.
4. Solicitud de concurrir dentro de las próximas 24 horas, por resguardo y debido proceso.
5. Dos alternativas editables de atención para una fecha dentro de las próximas 24 horas: 08:00 a 12:00 horas y 14:40 a 16:30 horas. Solo menciona día o fecha si aparece expresamente en el expediente; en caso contrario usa el marcador [día y fecha dentro de las próximas 24 horas].
6. Solicitud de confirmación por correo o Secretaría del Ciclo. Si ninguna alternativa es posible, indica que debe acordarse de inmediato un día y horario para efectuar la notificación.
7. Despedida institucional breve.

No relates hechos, antecedentes, pruebas, medidas, sanciones ni conclusiones del expediente. No uses las expresiones "descargos" ni "investigación". No repitas membrete, título, folio, fecha, estudiante, curso ni firma: la plataforma los incorpora.
$citacion$
    WHEN 'informe_cierre_indagacion' THEN $cierre$
Redacta el cuerpo de un Informe de Cierre de Indagación a cargo del Equipo Encargado de Indagación.

Estructura obligatoria:
1. Objeto y alcance de la indagación.
2. Antecedentes revisados: historial, hitos, checklist, responsables y documentos disponibles.
3. Actuaciones realizadas, en secuencia cronológica cuando las fechas consten en el expediente.
4. Análisis objetivo de los antecedentes, diferenciando hechos acreditados, antecedentes insuficientes y aspectos no verificados.
5. Resguardo del debido proceso: oportunidades de participación, medidas de resguardo y controles registrados.
6. Conclusión de la etapa de indagación y, si el expediente la sustenta, propuestas que deban ser evaluadas por la instancia siguiente. Las propuestas no deben presentarse como decisiones firmes.
7. Derecho a solicitar revisión o apelación en los términos que correspondan al procedimiento institucional.

No inventes una tabla, evidencia, entrevista, descargo, norma, sanción o plazo. No atribuyas responsabilidades sin sustento. No repitas membrete, título, folio, fecha, estudiante, curso ni firma: la plataforma los incorpora.
$cierre$
    WHEN 'informe_concluyente' THEN $concluyente$
Redacta el cuerpo de un Informe Concluyente y Resolución elaborado por el Equipo de Convivencia Escolar.

Estructura obligatoria:
1. Síntesis del procedimiento y de los antecedentes considerados.
2. Hechos que se tienen por acreditados, parcialmente acreditados o no acreditados, con referencia a los registros disponibles.
3. Análisis de proporcionalidad, gradualidad, enfoque formativo, resguardo de derechos y debido proceso.
4. Decisión o propuesta fundada que figure en el expediente. Si falta una decisión, indícalo expresamente y no la inventes.
5. Medidas formativas, reparatorias, de acompañamiento o disciplinarias solo si están registradas o si se presentan inequívocamente como propuestas sujetas a decisión.
6. Plan de seguimiento: responsables, plazos y evidencias solo cuando existan antecedentes registrados.
7. Información clara sobre el derecho de apelación o revisión aplicable, sin presentar al Rector como firmante ni como parte de esta decisión.

El lenguaje debe ser neutral, respetuoso y técnicamente claro. No agregues RBD, normas, artículos, sanciones, fechas o pruebas que no estén en el expediente o en las fuentes jurídicas autorizadas. No repitas membrete, título, folio, fecha, estudiante, curso ni firma: la plataforma los incorpora.
$concluyente$
    ELSE system_prompt
  END,
  updated_at = now()
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND doc_type IN (
    'notificacion_apertura',
    'citacion_entrevista',
    'informe_cierre_indagacion',
    'informe_concluyente'
  );

COMMIT;
