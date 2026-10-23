import { test, expect, type Page } from "@playwright/test";
import { build } from "esbuild";

// Componentes reales, identidades ficticias y red bloqueada: nunca usa una base remota.
async function mount(
  page: Page,
  source: string,
  overrides: Record<string, string> = {},
) {
  const bundle = await build({
    stdin: { contents: source, resolveDir: process.cwd(), loader: "tsx" },
    bundle: true,
    write: false,
    platform: "browser",
    format: "iife",
    loader: { ".css": "empty" },
    define: { "process.env.NODE_ENV": '"test"' },
    plugins: [
      {
        name: "identidad-ficticia",
        setup(plugin) {
          plugin.onResolve(
            {
              filter:
                /(?:stores\/authStore|services\/(?:annotations|institution|causas|bitacora|checklist|storage|disciplinary-storage|disciplinary-rules).service|lib\/supabase)$/,
            },
            (args) => ({
              path: args.path.split("/").at(-1)!,
              namespace: "falso",
            }),
          );
          plugin.onLoad({ filter: /.*/, namespace: "falso" }, (args) => ({
            resolveDir: process.cwd(),
            loader: "ts",
            contents:
              overrides[args.path] ??
              (args.path.endsWith("authStore")
                ? `
          import { create } from 'zustand';
          export const useAuthStore = create(() => ({ user: { id: 'user-a' }, tenantId: 'tenant-a', isAuthenticated: true }));
        `
                : args.path === "institution.service"
                  ? `export async function fetchInstitutionDocumentSettings() { return { official_name: 'Colegio ficticio' }; }`
                  : args.path === "supabase"
                    ? `export const supabase = { from: () => ({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})}), auth:{getSession:async()=>({data:{session:null}})} };`
                    : args.path === "causas.service"
                      ? `export function updateCausa(causa) { window.saveCalls = [...(window.saveCalls||[]), causa.observaciones]; return new Promise(resolve=>{window.completeSave=()=>resolve(true)}); }`
                      : args.path === "bitacora.service"
                        ? `export async function saveBitacora(){return true;}`
                        : args.path === "checklist.service"
                          ? `export async function saveChecklist(){return true;}`
                          : args.path === "disciplinary-rules.service"
                            ? `export async function fetchDisciplinaryRules(){return [];}`
                            : args.path === "disciplinary-storage.service"
                              ? `
                              export const MAX_DISCIPLINARY_PDF_BYTES=10485760;
                              export function validateDisciplinaryPdf(){return null;}
                              export async function uploadDisciplinaryFile(file,tenant,student='pending-student') {window.uploadCalls=(window.uploadCalls||0)+1;return {bucket:'disciplinary-processes',storagePath:tenant+'/'+student+'/draft/test.pdf',originalName:file.name,storedName:'test.pdf',mimeType:'application/pdf',size:file.size};}
                              export async function deleteDisciplinaryFile(){window.deleteCalls=(window.deleteCalls||0)+1;}
                              export async function restoreDisciplinaryFile(input){window.restoreCalls=(window.restoreCalls||0)+1;if(sessionStorage.getItem('fail-pdf-restore'))throw new Error('Archivo no disponible; su revisión se conserva.');return new File(['%PDF-test'],input.originalName,{type:'application/pdf'});}
                            `
                              : `export async function fetchDocumentAnalyses(){return [];} export async function updateAnnotation() { if (window.failSave) throw new Error('Fallo de red simulado'); }`),
          }));
        },
      },
    ],
  });
  await page.route("**/*", (route) =>
    route.request().url() === "https://drafts.test/"
      ? route.fulfill({
          contentType: "text/html",
          body:
            '<div id="root"></div><script>' +
            bundle.outputFiles[0].text.replace(/<\/script/gi, "<\\/script") +
            "</script>",
        })
      : route.abort(),
  );
  await page.goto("https://drafts.test/");
}

const pdfFixture = `
  const analysis={success:true,analysis_id:'analysis-a',file_id:null,selected_student_id:'student-a',detected_student_name:'Estudiante ficticio',detected_course:'8 A',student_candidates:[],summary:{negativas:5,positivas:0,informativas:0},annotations:Array.from({length:5},(_,i)=>({raw_text:'Anotación ficticia '+(i+1),type:'negative',page_number:1,sequence_number:i+1,detected_date:'2026-04-15',detected_teacher:'Inspectoría',confidence:1})),recommended_letter_type:'amonestacion',warnings:[],processing_status:'completed',file_hash:'a'.repeat(64),analyzed_at:'2026-04-15T12:00:00Z',duplicate_file:null};
  window.fetch=async(url,options)=>{if(String(url).endsWith('/confirm')){window.confirmCalls=(window.confirmCalls||0)+1;window.confirmInput=JSON.parse(options.body);return new Response(JSON.stringify(window.failConfirm?{error:'Fallo de confirmación simulado'}:{success:true,processId:'process-a',processNumber:'DEMO-1',insertedAnnotations:{negativas:5,positivas:0,informativas:0}}),{status:window.failConfirm?503:200});}window.analysisCalls=(window.analysisCalls||0)+1;return new Response(JSON.stringify(analysis),{status:200});};
`;

test("PDF del estudiante: recupera revisión y revalida el archivo sin repetir subidas, análisis ni confirmación", async ({
  page,
}) => {
  await mount(
    page,
    `
    import React from 'react'; import {createRoot} from 'react-dom/client'; import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
    import RevisionTab from './src/features/anotaciones/AnotacionesStudentDetailModal/RevisionTab';
    ${pdfFixture}
    function App(){return <RevisionTab student={{id:'student-a',full_name:'Estudiante ficticio',course_name:'8 A'}} counts={{negativas:5,positivas:0,informativas:0}} currentCarta={null} onConfirmed={()=>{}}/>;}
    createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><App/></QueryClientProvider>);
  `,
  );
  await page
    .getByLabel("Seleccionar PDF de hoja de vida", { exact: true })
    .setInputFiles({
      name: "prueba.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-test"),
    });
  await page
    .getByRole("button", {
      name: "Editar texto de la anotación 1",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Texto de la anotación 1", { exact: true })
    .fill("Corrección de PDF pendiente.");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.evaluate(() => sessionStorage.setItem("fail-pdf-restore", "true"));
  await page.reload();
  await expect(
    page.getByText("Corrección de PDF pendiente.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Archivo no disponible");
  await expect(
    page.getByRole("button", { name: "Confirmar actualización" }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => (window as unknown as { uploadCalls?: number }).uploadCalls || 0,
    ),
  ).toBe(0);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { analysisCalls?: number }).analysisCalls || 0,
    ),
  ).toBe(0);
  expect(
    await page.evaluate(
      () => (window as unknown as { confirmCalls?: number }).confirmCalls || 0,
    ),
  ).toBe(0);
  await page.evaluate(() => sessionStorage.removeItem("fail-pdf-restore"));
  await page
    .getByRole("button", { name: "Reintentar archivo guardado" })
    .click();
  await expect(
    page.getByRole("button", { name: "Confirmar actualización" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Confirmar actualización" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Actualización confirmada" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        sessionStorage.getItem(
          "draft:v2:user-a:tenant-a:student-pdf-review:student-a",
        ),
      ),
    )
    .toBeNull();
});

test("nuevo proceso PDF: cerrar o recargar conserva paso, revisión e idempotencia sin borrar el archivo", async ({
  page,
}) => {
  await mount(
    page,
    `
    import React from 'react'; import {createRoot} from 'react-dom/client'; import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
    import Modal from './src/features/anotaciones/NewDisciplinaryProcessModal';
    ${pdfFixture}
    const students=[{id:'student-a',full_name:'Estudiante ficticio',rut:'',course_id:'course-a',course_name:'8 A',teacher_id:'',annotations_count:0}];
    function App(){const [open,setOpen]=React.useState(true);return <>{open?<Modal students={students} currentUserEmail="" onClose={()=>setOpen(false)} onProcessCreated={()=>{}}/>:<button onClick={()=>setOpen(true)}>Reabrir proceso</button>}</>;}
    createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><App/></QueryClientProvider>);
  `,
  );
  await page.getByLabel("Seleccionar PDF", { exact: true }).setInputFiles({
    name: "prueba.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-test"),
  });
  await page.getByRole("button", { name: "Analizar PDF", exact: true }).click();
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Editar texto de la anotación 1",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Texto de la anotación 1", { exact: true })
    .fill("Texto del proceso sin terminar.");
  await expect(
    page.getByRole("button", { name: "Confirmar proceso", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { deleteCalls?: number }).deleteCalls || 0,
    ),
  ).toBe(0);
  await page.getByRole("button", { name: "Reabrir proceso" }).click();
  await expect(
    page.getByLabel("Texto de la anotación 1", { exact: true }),
  ).toHaveValue("Texto del proceso sin terminar.");
  await page.getByRole("button", { name: "Anterior", exact: true }).click();
  await page.getByRole("button", { name: "Anterior", exact: true }).click();
  const key = await page.evaluate(
    () =>
      JSON.parse(
        sessionStorage.getItem(
          "draft:v2:user-a:tenant-a:new-disciplinary-process:new",
        )!,
      ).idempotencyKey,
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Continuar revisión", exact: true })
    .click();
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(
    page.getByLabel("Texto de la anotación 1", { exact: true }),
  ).toHaveValue("Texto del proceso sin terminar.");
  expect(
    await page.evaluate(
      () => (window as unknown as { uploadCalls?: number }).uploadCalls || 0,
    ),
  ).toBe(0);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { analysisCalls?: number }).analysisCalls || 0,
    ),
  ).toBe(0);
  expect(
    await page.evaluate(
      () => (window as unknown as { confirmCalls?: number }).confirmCalls || 0,
    ),
  ).toBe(0);
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Confirmar proceso", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Confirmar proceso", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Reabrir proceso" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { confirmInput: { idempotencyKey: string } })
          .confirmInput.idempotencyKey,
    ),
  ).toBe(key);
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem(
        "draft:v2:user-a:tenant-a:new-disciplinary-process:new",
      ),
    ),
  ).toBeNull();
});

test("carta: restaura edición al recargar, aísla estudiante e identidad y no restaura autorizaciones", async ({
  page,
}) => {
  await mount(
    page,
    `
    import React from 'react'; import { createRoot } from 'react-dom/client';
    import { useDocumentState } from './src/features/anotaciones/docgen/hooks/useDocumentState';
    import { useAuthStore } from './src/shared/lib/stores/authStore';
    function Form({ record }) {
      const state = useDocumentState(record);
      return <><label>Apoderado<input aria-label="Apoderado" value={state.apoderadoName} onChange={e=>state.setApoderadoName(e.target.value)} /></label>
        <button onClick={()=>state.setAuthorizedBypass(true)}>Autorizar excepción</button>
        <output>{state.authorizedBypass ? 'Autorizado' : 'Sin autorización'}</output></>;
    }
    function App() {
      const user = useAuthStore(s=>s.user.id); const [record, setRecord] = React.useState('student-a');
      return <><button onClick={()=>setRecord(r=>r==='student-a'?'student-b':'student-a')}>Cambiar estudiante</button>
        <button onClick={()=>useAuthStore.setState({user:{id:'user-b'}})}>Cambiar usuario</button><Form key={user+record} record={record}/></>;
    }
    createRoot(document.getElementById('root')).render(<App/>);
  `,
  );
  await page
    .getByLabel("Apoderado", { exact: true })
    .fill("Texto privado de prueba");
  await page.getByRole("button", { name: "Autorizar excepción" }).click();
  await expect(page.getByText("Autorizado", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Apoderado", { exact: true })).toHaveValue(
    "Texto privado de prueba",
  );
  await expect(
    page.getByText("Sin autorización", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cambiar estudiante" }).click();
  await expect(page.getByLabel("Apoderado", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Cambiar estudiante" }).click();
  await expect(page.getByLabel("Apoderado", { exact: true })).toHaveValue(
    "Texto privado de prueba",
  );
  await page.getByRole("button", { name: "Cambiar usuario" }).click();
  await expect(page.getByLabel("Apoderado", { exact: true })).toHaveValue("");
});

test("editor: conserva el respaldo y envía la edición encolada durante un guardado lento", async ({
  page,
}) => {
  await page.clock.install();
  await mount(
    page,
    `
    import React from 'react'; import { createRoot } from 'react-dom/client';
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
    import Editor from './src/features/causas/EditCausaModal/EditCausaModalForm';
    import { useCausasPersistence } from './src/shared/lib/hooks/useCausasPersistence';
    import { createDraftCausa } from './src/lib/causaFactory';
    const causa = createDraftCausa({counter:1, estudianteNombre:'Estudiante ficticio',estudianteCurso:'8 A',runEstudiante:'',tipoInfraccion:'Leve',comprometeAulaSegura:false,observaciones:'Relato original.',responsable:'Inspectoría'});
    causa.id='case-a';causa.bitacora=[];causa.checklistDebidoProceso=[];
    function App(){const [causas,setCausas]=React.useState([causa]);const [status,setStatus]=React.useState('idle');
      useCausasPersistence({causas,setSaveStatus:setStatus,isAuthenticated:true,onPersisted:React.useCallback(()=>{},[]),saveRetryNonce:0});
      return <><output>{status}</output><button onClick={()=>window.completeSave?.()}>Confirmar remoto</button><Editor causa={causas[0]} canReopen={false} draftKey="draft:v2:user-a:tenant-a:edit-causa:case-a" onSave={updated=>setCausas([updated])} onDelete={()=>{}} onClose={()=>{}}/></>;}
    createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}><App/></QueryClientProvider>);
  `,
  );
  const texto = page.getByLabel("Observaciones", { exact: true });
  await texto.fill("Primera edición pendiente.");
  await page.getByRole("button", { name: "Guardar Cambios" }).click();
  await page.clock.runFor(2100);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { saveCalls: string[] }).saveCalls?.length,
      ),
    )
    .toBe(1);
  await texto.fill("Segunda edición más reciente.");
  await page.getByRole("button", { name: "Guardar Cambios" }).click();
  await page.clock.runFor(2100);
  await page.getByRole("button", { name: "Confirmar remoto" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { saveCalls: string[] }).saveCalls?.length,
      ),
    )
    .toBe(2);
  await expect(texto).toHaveValue("Segunda edición más reciente.");
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("draft:v2:user-a:tenant-a:edit-causa:case-a"),
    ),
  ).toContain("Segunda edición");
  await texto.fill("Tercera edición aún sin enviar.");
  await page.getByRole("button", { name: "Confirmar remoto" }).click();
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("draft:v2:user-a:tenant-a:edit-causa:case-a"),
    ),
  ).toContain("Tercera edición");
  await page.getByRole("button", { name: "Guardar Cambios" }).click();
  await page.clock.runFor(2100);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { saveCalls: string[] }).saveCalls?.length,
      ),
    )
    .toBe(3);
  await page.getByRole("button", { name: "Confirmar remoto" }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        sessionStorage.getItem("draft:v2:user-a:tenant-a:edit-causa:case-a"),
      ),
    )
    .toBeNull();
});

test("carta: conserva las anotaciones seleccionadas al recargar", async ({
  page,
}) => {
  await mount(
    page,
    `
    import React from 'react'; import { createRoot } from 'react-dom/client';
    import { useSelectedAnnotations } from './src/features/anotaciones/docgen/hooks/useSelectedAnnotations';
    const annotations=[{id:'a',type:'Negativa'},{id:'b',type:'Negativa'}];
    function App(){ const selection=useSelectedAnnotations(annotations,'student-a:letter-a');return <>{annotations.map(a=><label key={a.id}>{a.id}<input type="checkbox" aria-label={a.id} checked={selection.selectedIds.has(a.id)} onChange={()=>selection.toggleAnnotation(a.id)}/></label>)}</>;}
    createRoot(document.getElementById('root')).render(<App/>);
  `,
  );
  await page.getByLabel("a", { exact: true }).check();
  await page.getByLabel("b", { exact: true }).uncheck();
  await page.reload();
  await expect(page.getByLabel("a", { exact: true })).toBeChecked();
  await expect(page.getByLabel("b", { exact: true })).not.toBeChecked();
});

test("notificación: recupera texto pendiente sin enviar ni alterar un snapshot notificado", async ({
  page,
}) => {
  await mount(
    page,
    `
    import React from 'react'; import { createRoot } from 'react-dom/client';
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
    import Generator from './src/features/causas/notificacionDocgen/CausaNotificationGenerator';
    import { buildPrefilledNotificationContent } from './src/features/causas/notificacionDocgen/builders';
    const causa={id:'causa-a',estudianteNombre:'Estudiante ficticio',estudianteCurso:'8 A',responsable:'Inspectoría',observaciones:'Hecho ficticio',medidasEjecutadas:[],tipoInfraccion:'Leve',estadoActual:'Recepción de Denuncia',fechaApertura:'2026-04-15'};
    function App(){ const [final, setFinal]=React.useState(false);return <QueryClientProvider client={new QueryClient()}><button onClick={()=>setFinal(true)}>Mostrar snapshot notificado</button><Generator key={String(final)} causa={causa} privacyMode={false} initialSnapshot={final?{content:{...buildPrefilledNotificationContent(causa),hallazgoIncidente:'Texto histórico intacto'},apoderadoName:'Adulto histórico',emittedBy:'Inspectoría'}:null} documentStatus={final?'Notificada':null} isProcessing={false} feedback={null} onSaveDraft={()=>{}} onMarkNotified={()=>{}} onSaveApoderadoEmail={()=>{}} onAnnul={()=>{}} /></QueryClientProvider>; }
    createRoot(document.getElementById('root')).render(<App/>);
  `,
  );
  const relato = page.getByLabel("Hechos que motivan la indagación", {
    exact: true,
  });
  await relato.fill("Relato pendiente que debe restaurarse");
  await page.reload();
  await expect(relato).toHaveValue("Relato pendiente que debe restaurarse");
  await page
    .getByRole("button", { name: "Mostrar snapshot notificado" })
    .click();
  await expect(
    page.getByText("Texto histórico intacto", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Relato pendiente que debe restaurarse", { exact: true }),
  ).not.toBeVisible();
});

test("anotaciones: conserva edición entre pestañas internas, tras fallo y recarga", async ({
  page,
}) => {
  await mount(
    page,
    `
    import React from 'react'; import { createRoot } from 'react-dom/client';
    import EditAnnotationsTab from './src/features/anotaciones/AnotacionesStudentDetailModal/EditAnnotationsTab';
    const annotations = [{ id:'annotation-a', student_id:'student-a', text:'Texto original', date:'2026-04-15T12:00:00Z', type:'Negativa', severity:'Leve', registered_by:'Inspectoría' }];
    function App() { const [open, setOpen] = React.useState(true); return <><button onClick={()=>setOpen(v=>!v)}>Alternar pestaña</button>
      {open && <EditAnnotationsTab studentId="student-a" annotations={annotations} onSaved={()=>{}} />}</>; }
    createRoot(document.getElementById('root')).render(<App/>);
  `,
  );
  await page.getByRole("button", { name: /Editar anotación/i }).click();
  await page
    .getByLabel("Texto de la anotación")
    .fill("Trabajo pendiente de prueba");
  await page.getByRole("button", { name: "Alternar pestaña" }).click();
  await page.getByRole("button", { name: "Alternar pestaña" }).click();
  await expect(page.getByLabel("Texto de la anotación")).toHaveValue(
    "Trabajo pendiente de prueba",
  );
  await page.evaluate(() => {
    Object.assign(window, { failSave: true });
  });
  await page.getByRole("button", { name: /Guardar cambios/i }).click();
  await expect(page.getByRole("alert")).toContainText("Fallo de red simulado");
  await page.reload();
  await expect(page.getByLabel("Texto de la anotación")).toHaveValue(
    "Trabajo pendiente de prueba",
  );
});

test("incidente: restaura curso, estudiantes y fecha chilena sin crear registros al recuperar", async ({
  page,
}) => {
  await mount(
    page,
    `
    import React from 'react'; import { createRoot } from 'react-dom/client';
    import Modal from './src/features/causas/ui/NewIncidenteModal';
    const courses=[{id:'course-a',name:'8 A'},{id:'course-b',name:'8 B'}];
    const students=[{id:'student-a',full_name:'Estudiante ficticio A',rut:''},{id:'student-b',full_name:'Estudiante ficticio B',rut:''}];
    function App(){const [course,setCourse]=React.useState('');return <Modal courses={courses} students={course==='course-a'?students:[]} selectedCourseId={course} isLoadingStudents={false} onCourseChange={setCourse} onClose={()=>{}} onSubmit={async input=>{window.groupSubmitted=input;throw new Error('Fallo de red simulado');}}/>;}
    createRoot(document.getElementById('root')).render(<App/>);
  `,
  );
  await page.getByLabel("Curso", { exact: true }).selectOption("course-a");
  await page
    .getByLabel("Estudiantes involucrados", { exact: true })
    .selectOption(["student-a", "student-b"]);
  const conduct = page.getByLabel("Autocompletar desde Reglamento (RICE):", {
    exact: true,
  });
  const conductId = await conduct
    .locator("option")
    .nth(1)
    .getAttribute("value");
  await conduct.selectOption(conductId!);
  await page
    .getByLabel("Hechos comunes", { exact: true })
    .fill("Relato común pendiente de prueba.");
  await page
    .getByLabel("Fecha y hora (Chile continental)", { exact: true })
    .fill("2026-04-15T09:45");
  const requestId = await page.evaluate(
    () =>
      JSON.parse(
        sessionStorage.getItem("draft:v2:user-a:tenant-a:new-incidente:new")!,
      ).requestId,
  );
  expect(requestId).toMatch(/^[a-f0-9-]{36}$/);
  await page.reload();
  await expect(page.getByLabel("Curso", { exact: true })).toHaveValue(
    "course-a",
  );
  await expect(
    page.getByLabel("Estudiantes involucrados", { exact: true }),
  ).toHaveValues(["student-a", "student-b"]);
  await expect(page.getByLabel("Hechos comunes", { exact: true })).toHaveValue(
    "Relato común pendiente de prueba.",
  );
  await expect(
    page.getByLabel("Fecha y hora (Chile continental)", { exact: true }),
  ).toHaveValue("2026-04-15T09:45");
  expect(
    await page.evaluate(
      () => (window as unknown as { groupSubmitted?: unknown }).groupSubmitted,
    ),
  ).toBeUndefined();
  await page
    .getByRole("button", { name: "Crear incidente y expedientes" })
    .click();
  await expect(page.getByRole("alert")).toContainText("Fallo de red simulado");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { groupSubmitted: { fechaHora: string } })
          .groupSubmitted.fechaHora,
    ),
  ).toBe("2026-04-15T13:45:00.000Z");
  expect(
    await page.evaluate(
      () =>
        (
          window as unknown as {
            groupSubmitted: { requestId: string; courseId: string };
          }
        ).groupSubmitted,
    ),
  ).toMatchObject({ requestId, courseId: "course-a" });
  await page.reload();
  await expect(page.getByLabel("Hechos comunes", { exact: true })).toHaveValue(
    "Relato común pendiente de prueba.",
  );
  await page
    .getByRole("button", { name: "Crear incidente y expedientes" })
    .click();
  await expect(page.getByRole("alert")).toContainText("Fallo de red simulado");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { groupSubmitted: { requestId: string } })
          .groupSubmitted.requestId,
    ),
  ).toBe(requestId);
  await page.getByLabel("Curso", { exact: true }).selectOption("course-b");
  await expect(
    page.getByLabel("Estudiantes involucrados", { exact: true }),
  ).toHaveValues([]);
});

test("hito: recupera campos incompletos por expediente e hito y exige reseleccionar archivo", async ({
  page,
}) => {
  await mount(
    page,
    `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { createDraftCausa } from './src/lib/causaFactory';
    import { useChecklistRegistration } from './src/shared/lib/hooks/useChecklistRegistration';
    const causaInicial=createDraftCausa({counter:1,estudianteNombre:'Estudiante ficticio',estudianteCurso:'8 A',runEstudiante:'',tipoInfraccion:'Leve',comprometeAulaSegura:false,observaciones:'',responsable:'Inspectoría'});
    causaInicial.id='case-a';causaInicial.incidenteId='incident-a';
    causaInicial.checklistDebidoProceso=[{...causaInicial.checklistDebidoProceso[0],id:'chk-test',label:'Entrevista de prueba',completado:false}];
    function App(){const [causa,setCausa]=React.useState(causaInicial);const hook=useChecklistRegistration({causa,onUpdateCausa:setCausa,currentRole:'encargado_convivencia',privacyMode:false});
      React.useEffect(()=>{hook.handleStartRegister(causa.checklistDebidoProceso[0]);},[]);
      return <><input aria-label="Responsable" value={hook.regName} onChange={e=>hook.setRegName(e.target.value)}/>
        <input aria-label="Fecha" value={hook.regActionDate} onChange={e=>hook.setRegActionDate(e.target.value)}/>
        <textarea aria-label="Observaciones" value={hook.regObservations} onChange={e=>hook.setRegObservations(e.target.value)}/>
        <textarea aria-label="Evidencia" value={hook.regText} onChange={e=>hook.setRegText(e.target.value)}/>
        <input aria-label="Archivo" type="file" onChange={hook.handleFileChange}/>
        <input aria-label="Compartir" type="checkbox" checked={hook.documentScope==='incidente'} onChange={e=>hook.setDocumentScope(e.target.checked?'incidente':'causa')}/>
        <output>{hook.regFileName}</output></>;}
    createRoot(document.getElementById('root')).render(<App/>);
  `,
    {
      "storage.service":
        "export function resolveDocumentOwnerId(id,incident,scope){return scope==='incidente'?incident:id;} export async function uploadDocument(){return 'ficticio/documento.txt';}",
    },
  );
  await expect(page.getByLabel("Responsable")).toHaveValue("Inspectoría");
  await page.getByLabel("Responsable").fill("Equipo de convivencia");
  await page.getByLabel("Fecha").fill("2026-04-20");
  await page.getByLabel("Observaciones").fill("Observación pendiente.");
  await page.getByLabel("Evidencia").fill("Acta aún no adjuntada.");
  await page.getByLabel("Compartir").check();
  await page.reload();
  await expect(page.getByLabel("Responsable")).toHaveValue(
    "Equipo de convivencia",
  );
  await expect(page.getByLabel("Fecha")).toHaveValue("2026-04-20");
  await expect(page.getByLabel("Observaciones")).toHaveValue(
    "Observación pendiente.",
  );
  await expect(page.getByLabel("Evidencia")).toHaveValue(
    "Acta aún no adjuntada.",
  );
  await expect(page.getByLabel("Compartir")).toBeChecked();
  await expect(page.getByLabel("Archivo")).toHaveValue("");
});

test("evidencia adicional: recupera texto, alcance y exige reseleccionar archivo", async ({
  page,
}) => {
  const key = "draft:v2:user-a:tenant-a:additional-evidence:case-a";
  await mount(
    page,
    `
    import React from "react";
    import { createRoot } from "react-dom/client";
    import Form from "./src/shared/ui/HistoryEntryForm";
    const draftKey="draft:v2:user-a:tenant-a:additional-evidence:case-a";
    function App(){return <Form idPrefix="additional-evidence" draftKey={draftKey} isSaving={false} error={null} helperText="Evidencia adicional" onResetError={()=>{}} onSave={async ()=>"entry-a"} additionalFields={(values,update)=><>
      <input aria-label="Documento de evidencia adicional" type="file" />
      <input aria-label="Compartir evidencia adicional con el incidente grupal" type="checkbox" checked={values.documentScope==="incidente"} onChange={e=>update({documentScope:e.target.checked?"incidente":"causa"})}/>
    </>} />;}
    createRoot(document.getElementById("root")).render(<App/>);
  `,
  );
  await page.getByRole("button", { name: "Registrar entrada manual" }).click();
  await page.getByLabel("Título de la entrada").fill("Evidencia pendiente");
  await page.getByLabel("Descripción").fill("Descripción aún no guardada.");
  await page
    .getByLabel("Texto de evidencia adicional")
    .fill("Texto de acta pendiente.");
  await page
    .getByLabel("Compartir evidencia adicional con el incidente grupal")
    .check();
  await page.getByLabel("Documento de evidencia adicional").setInputFiles({
    name: "acta.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("archivo ficticio"),
  });
  await page.reload();
  await page.getByRole("button", { name: "Registrar entrada manual" }).click();
  await expect(page.getByLabel("Título de la entrada")).toHaveValue(
    "Evidencia pendiente",
  );
  await expect(page.getByLabel("Descripción")).toHaveValue(
    "Descripción aún no guardada.",
  );
  await expect(page.getByLabel("Texto de evidencia adicional")).toHaveValue(
    "Texto de acta pendiente.",
  );
  await expect(
    page.getByLabel("Compartir evidencia adicional con el incidente grupal"),
  ).toBeChecked();
  await expect(page.getByLabel("Documento de evidencia adicional")).toHaveValue(
    "",
  );
  await page.getByRole("button", { name: "Guardar en historial" }).click();
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), key),
  ).not.toBeNull();
});

test("historial manual: cerrar, recargar y cambiar identidad conserva solo el borrador propio", async ({
  page,
}) => {
  await mount(
    page,
    `
    import React from 'react';import {createRoot} from 'react-dom/client';
    import Form from './src/features/anotaciones/AnotacionesStudentDetailModal/ManualHistoryEntryForm';
    import {useAuthStore} from './src/shared/lib/stores/authStore';
    function App(){const [id,setId]=React.useState('student-a');return <>
      <button onClick={()=>setId(id==='student-a'?'student-b':'student-a')}>Cambiar estudiante</button>
      <button onClick={()=>useAuthStore.setState({user:{id:'user-b'}})}>Cambiar usuario</button>
      <Form studentId={id} isSaving={false} error={null} onResetError={()=>{}} onSave={async input=>{window.historyInput=input;await new Promise(resolve=>window.finishHistory=resolve);}}/>
    </>;}
    createRoot(document.getElementById('root')).render(<App/>);
  `,
  );
  await page.getByRole("button", { name: "Registrar entrada manual" }).click();
  await page.getByLabel("Título de la entrada", { exact: true }).fill("B");
  await page.getByLabel("Descripción", { exact: true }).fill("Bo");
  await page
    .getByLabel("Fecha de la acción", { exact: true })
    .fill("2026-04-15");
  await page
    .getByLabel("Texto de evidencia adicional", { exact: true })
    .fill("Texto incompleto de respaldo.");
  await page.getByRole("button", { name: "Cerrar formulario" }).click();
  await page.getByRole("button", { name: "Registrar entrada manual" }).click();
  await expect(
    page.getByLabel("Título de la entrada", { exact: true }),
  ).toHaveValue("B");
  await page.reload();
  await page.getByRole("button", { name: "Registrar entrada manual" }).click();
  await expect(page.getByLabel("Descripción", { exact: true })).toHaveValue(
    "Bo",
  );
  await expect(
    page.getByLabel("Fecha de la acción", { exact: true }),
  ).toHaveValue("2026-04-15");
  await expect(
    page.getByLabel("Texto de evidencia adicional", { exact: true }),
  ).toHaveValue("Texto incompleto de respaldo.");
  await page.getByRole("button", { name: "Cambiar estudiante" }).click();
  await page.getByRole("button", { name: "Registrar entrada manual" }).click();
  await expect(
    page.getByLabel("Título de la entrada", { exact: true }),
  ).toHaveValue("");
  await page.getByRole("button", { name: "Cambiar estudiante" }).click();
  await page.getByRole("button", { name: "Registrar entrada manual" }).click();
  await expect(
    page.getByLabel("Título de la entrada", { exact: true }),
  ).toHaveValue("B");
  await page.getByRole("button", { name: "Cambiar usuario" }).click();
  await page.getByRole("button", { name: "Registrar entrada manual" }).click();
  await expect(
    page.getByLabel("Título de la entrada", { exact: true }),
  ).toHaveValue("");
  await page
    .getByLabel("Título de la entrada", { exact: true })
    .fill("Entrada nueva del usuario B");
  await page
    .getByLabel("Descripción", { exact: true })
    .fill("Relato confirmado.");
  await page
    .getByLabel("Fecha de la acción", { exact: true })
    .fill("2026-04-17");
  await page
    .getByLabel("Texto de evidencia adicional", { exact: true })
    .fill("Evidencia confirmada.");
  await page.getByRole("button", { name: "Guardar en historial" }).click();
  const key = "draft:v2:user-b:tenant-a:student-history:student-a";
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), key),
  ).toContain("Entrada nueva");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { historyInput: { description: string } })
          .historyInput.description,
    ),
  ).toBe(
    "Relato confirmado.\n\nFecha de la acción: 2026-04-17\n\nTexto de evidencia:\nEvidencia confirmada.",
  );
  await page.evaluate(() =>
    (window as unknown as { finishHistory: () => void }).finishHistory(),
  );
  await expect
    .poll(() => page.evaluate((key) => sessionStorage.getItem(key), key))
    .toBeNull();
  await page.getByRole("button", { name: "Registrar entrada manual" }).click();
  await expect(
    page.getByLabel("Título de la entrada", { exact: true }),
  ).toHaveValue("");
  await page
    .getByLabel("Título de la entrada", { exact: true })
    .fill("Descartable");
  await page.getByRole("button", { name: "Descartar borrador" }).click();
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), key),
  ).toBeNull();
});

test("bitácora: respalda detalles y espera confirmación durable sin borrar la edición posterior", async ({
  page,
}) => {
  await page.clock.install();
  await mount(
    page,
    `
    import React from 'react';import {createRoot} from 'react-dom/client';
    import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
    import Form from './src/features/timeline/BitacoraTab';
    import {TimelineContext} from './src/shared/lib/useTimelineContext';
    import {useBitacoraLog} from './src/shared/lib/hooks/useBitacoraLog';
    import {useCausasPersistence} from './src/shared/lib/hooks/useCausasPersistence';
    import {createDraftCausa} from './src/lib/causaFactory';
    import {useAuthStore} from './src/shared/lib/stores/authStore';
    const initial=createDraftCausa({counter:1,estudianteNombre:'Estudiante ficticio',estudianteCurso:'8 A',runEstudiante:'',tipoInfraccion:'Leve',comprometeAulaSegura:false,observaciones:'',responsable:'Inspectoría'});
    initial.id='case-a';initial.incidenteId='incident-a';initial.bitacora=[];initial.checklistDebidoProceso=[];
    function App(){const [causa,setCausa]=React.useState(initial);const [status,setStatus]=React.useState('idle');
      const persistence=useCausasPersistence({causas:[causa],setSaveStatus:setStatus,isAuthenticated:true,onPersisted:React.useCallback(()=>{},[]),saveRetryNonce:0});
      const log=useBitacoraLog({causa,onUpdateCausa:setCausa});
      React.useEffect(()=>{persistence.markCausaHydrated(initial);},[]);
      return <><output>{status}</output><button onClick={()=>window.finishBitacora?.()}>Confirmar remoto</button>
        <button onClick={()=>useAuthStore.setState({tenantId:'tenant-b'})}>Cambiar colegio</button>
        <TimelineContext.Provider value={{currentRole:'encargado_convivencia',...log}}><Form causa={causa}/></TimelineContext.Provider></>;
    }
    createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}><App/></QueryClientProvider>);
  `,
    {
      "causas.service": "export async function updateCausa(){return true;}",
      "bitacora.service":
        "export function saveBitacora(id,entries){window.bitacoraInput=entries;return new Promise(resolve=>window.finishBitacora=()=>resolve(true));}",
      "storage.service":
        "export const DOCUMENT_UPLOAD_ACCEPT='.pdf,.txt';export const DOCUMENT_UPLOAD_PLACEHOLDER='Seleccionar archivo';export function resolveDocumentOwnerId(id,incident,scope){return scope==='incidente'?incident:id;}export async function openDocument(){}export async function uploadDocument(owner,file){window.evidenceInput={owner,text:await file.text()};return owner+'/evidencia.txt';}",
    },
  );
  await page.getByRole("button", { name: "Registrar entrada manual" }).click();
  await page
    .getByLabel("Título de la entrada", { exact: true })
    .fill("Entrevista pendiente");
  await page
    .getByLabel("Descripción", { exact: true })
    .fill("Acuerdos aún en revisión.");
  await page
    .getByLabel("Fecha de la acción", { exact: true })
    .fill("2026-04-15");
  await page
    .getByLabel("Texto de evidencia adicional", { exact: true })
    .fill("Respaldo de la entrevista.");
  await page.getByRole("combobox").selectOption("Mediación");
  await page
    .getByLabel("Participantes", { exact: true })
    .fill("Inspectoría, Apoderado ficticio");
  await page
    .getByLabel("Compartir avance con el incidente grupal", { exact: true })
    .check();
  await page.reload();
  await page.getByRole("button", { name: "Registrar entrada manual" }).click();
  await expect(page.getByRole("combobox")).toHaveValue("Mediación");
  await expect(page.getByLabel("Participantes", { exact: true })).toHaveValue(
    "Inspectoría, Apoderado ficticio",
  );
  await expect(
    page.getByLabel("Compartir avance con el incidente grupal", {
      exact: true,
    }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Guardar en historial" }).click();
  const key = "draft:v2:user-a:tenant-a:causa-history:case-a";
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), key),
  ).toContain("Entrevista pendiente");
  await page.clock.runFor(2100);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { bitacoraInput?: unknown[] }).bitacoraInput
            ?.length,
      ),
    )
    .toBe(1);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { bitacoraInput: unknown[] }).bitacoraInput[0],
    ),
  ).toMatchObject({
    fecha: "2026-04-15T12:00:00.000Z",
    tipo: "Mediación",
    participantes: ["Inspectoría", "Apoderado ficticio"],
    documentoAdjunto: "incident-a/evidencia.txt",
    compartidoGrupal: true,
  });
  expect(
    await page.evaluate(
      () => (window as unknown as { evidenceInput: unknown }).evidenceInput,
    ),
  ).toEqual({ owner: "incident-a", text: "Respaldo de la entrevista." });
  await page.getByRole("button", { name: "Registrar entrada manual" }).click();
  await page
    .getByLabel("Título de la entrada", { exact: true })
    .fill("Edición posterior aún sin enviar");
  await page.getByRole("button", { name: "Confirmar remoto" }).click();
  await expect(
    page.getByLabel("Título de la entrada", { exact: true }),
  ).toHaveValue("Edición posterior aún sin enviar");
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), key),
  ).toContain("Edición posterior");
  await page.getByRole("button", { name: "Guardar en historial" }).click();
  await page.clock.runFor(2100);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { bitacoraInput: { titulo: string }[] })
            .bitacoraInput?.[0]?.titulo,
      ),
    )
    .toBe("Edición posterior aún sin enviar");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { bitacoraInput: unknown[] }).bitacoraInput
          .length,
    ),
  ).toBe(1);
  await page.getByRole("button", { name: "Confirmar remoto" }).click();
  await expect
    .poll(() => page.evaluate((key) => sessionStorage.getItem(key), key))
    .toBeNull();
  await page.getByRole("button", { name: "Registrar entrada manual" }).click();
  await expect(
    page.getByLabel("Título de la entrada", { exact: true }),
  ).toHaveValue("");
  await page
    .getByLabel("Título de la entrada", { exact: true })
    .fill("Otro borrador privado");
  await page
    .getByLabel("Descripción", { exact: true })
    .fill("Guardado pendiente con almacenamiento lleno.");
  await page
    .getByLabel("Texto de evidencia adicional", { exact: true })
    .fill("Texto junto al archivo.");
  await page
    .getByLabel("Documento de respaldo", { exact: true })
    .setInputFiles({
      name: "respaldo.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Archivo de respaldo."),
    });
  await page.getByRole("button", { name: "Guardar en historial" }).click();
  await page.clock.runFor(2100);
  await page.getByRole("button", { name: "Registrar entrada manual" }).click();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { bitacoraInput: { descripcion: string }[] })
          .bitacoraInput[0].descripcion,
    ),
  ).toContain("Texto junto al archivo.");
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key)
        throw new DOMException("Sin espacio", "QuotaExceededError");
      return original.call(this, name, value);
    };
  }, key);
  await page
    .getByLabel("Título de la entrada", { exact: true })
    .fill("Edición solo en memoria");
  await page.getByRole("button", { name: "Confirmar remoto" }).click();
  await expect(
    page.getByLabel("Título de la entrada", { exact: true }),
  ).toHaveValue("Edición solo en memoria");
  await page.getByRole("button", { name: "Cambiar colegio" }).click();
  await page.getByRole("button", { name: "Registrar entrada manual" }).click();
  await expect(
    page.getByLabel("Título de la entrada", { exact: true }),
  ).toHaveValue("");
});
