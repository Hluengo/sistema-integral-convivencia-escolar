/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router, type Request } from "express";
import multer from "multer";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { requireAuth } from "../../middleware/auth.js";
import { isValidUuid } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { requireTenant } from "../../middleware/requireTenant.js";
import { clientErrorBody } from "../../middleware/errorHandler.js";
import type { AuthenticatedRequest, ProfileRole } from "../../types.js";
import {
  bulkCourseKey,
  bulkNameKey,
  BULK_QUERY_MAX_ROWS,
  chunkQueryIds,
  parseBulkDisciplinaryPdf,
  selectNewBulkAnnotations,
  type BulkAnnotation,
} from "../../lib/bulkDisciplinaryPdf.js";
import {
  previewBulkCartas,
  syncBulkPendingCartas,
} from "../../lib/bulkCartaWorkflow.js";

const router = Router();
const ownUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});
const ADMIN_ROLES: readonly ProfileRole[] = [
  "superadmin",
  "admin",
  "direccion",
];
const APPLICATION_CODE = "convivencia";
const VALID_ROLES: readonly ProfileRole[] = [
  "admin",
  "direccion",
  "convivencia",
  "inspectoria",
  "profesor_jefe",
  "teacher",
  "inspector",
  "user",
  "staff",
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface BulkPreviewAnnotation extends BulkAnnotation {
  student_id: string;
  student_name: string;
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d];
const BULK_MAX_ANNOTATIONS = 5000;

function hasPdfMagic(buffer: Uint8Array): boolean {
  return PDF_MAGIC.every((byte, index) => buffer[index] === byte);
}

function isPdfUpload(
  file: { buffer?: Uint8Array; mimetype?: string } | undefined,
): boolean {
  return Boolean(
    file?.buffer &&
    file.mimetype === "application/pdf" &&
    hasPdfMagic(file.buffer),
  );
}

function safeFileName(name: unknown): string {
  if (typeof name !== "string") return "archivo.pdf";
  const printable = name
    .split("")
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 0x20 && code !== 0x7f;
    })
    .join("");
  const base = printable.split(/[\\/]/).pop()?.trim() ?? "";
  return base.slice(0, 128) || "archivo.pdf";
}

async function fetchExistingBulkRecords(
  client: SupabaseClient,
  tenantId: string,
  studentIds: string[],
) {
  const pages = await Promise.all(
    chunkQueryIds(studentIds).map(async (chunk) => {
      const { data, error } = await client
        .from("inspectorate_records")
        .select("student_id,type,date_time,observation")
        .eq("tenant_id", tenantId)
        .in("student_id", chunk)
        .limit(BULK_QUERY_MAX_ROWS);
      if (error) throw error;
      return data ?? [];
    }),
  );
  return pages.flat();
}

function invitationErrorStatus(message: string): number {
  return /rate limit|too many requests|email rate/i.test(message) ? 429 : 500;
}

interface ProfileRow {
  user_id: string;
  tenant_id: string;
  email: string | null;
  full_name: string | null;
  role: ProfileRole;
  course_ids: string[] | null;
  is_active: boolean;
  updated_at: string | null;
}

interface MembershipRow {
  user_id: string;
  role: ProfileRole;
  is_active: boolean;
  application_code: string;
}

interface InvitationRow {
  id: string;
  tenant_id: string;
  email: string;
  role: ProfileRole;
  application_code: string;
  auth_user_id: string | null;
  invited_by: string;
  status: "pending" | "accepted" | "cancelled";
  created_at: string;
  updated_at: string;
  last_sent_at: string;
  cancelled_at: string | null;
  accepted_at: string | null;
}

interface AuditRow {
  id: string;
  actor_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  previous_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  occurred_at: string;
}

function getAdminClient(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase administrativo no configurado.");
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function getRequest(req: Request): AuthenticatedRequest {
  return req as AuthenticatedRequest;
}

function isRole(value: unknown): value is ProfileRole {
  return (
    typeof value === "string" && VALID_ROLES.includes(value as ProfileRole)
  );
}

async function assertFreshAdmin(
  client: SupabaseClient,
  request: AuthenticatedRequest,
): Promise<ProfileRow> {
  if (!request.user?.sub || !request.tenantId)
    throw new Error("Contexto administrativo inválido.");
  const { data, error } = await client
    .from("profiles")
    .select(
      "user_id,tenant_id,email,full_name,role,course_ids,is_active,updated_at",
    )
    .eq("user_id", request.user.sub)
    .eq("tenant_id", request.tenantId)
    .maybeSingle();
  if (error || !data)
    throw new Error("No fue posible validar al administrador.");
  const profile = data as unknown as ProfileRow;
  if (!profile.is_active || !ADMIN_ROLES.includes(profile.role)) {
    throw new Error("La cuenta no tiene permisos administrativos activos.");
  }
  return profile;
}

async function recordAudit(
  client: SupabaseClient,
  request: AuthenticatedRequest,
  action: string,
  entityId: string,
  previousValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
): Promise<void> {
  const { error } = await client.from("audit_events").insert({
    tenant_id: request.tenantId,
    actor_user_id: request.user?.sub,
    action,
    entity_type: "membership",
    entity_id: entityId,
    previous_values: previousValues,
    new_values: newValues,
  });
  if (error) throw error;
}

async function listAuthUsers(
  client: SupabaseClient,
): Promise<Map<string, User>> {
  const result = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (result.error) throw result.error;
  return new Map(result.data.users.map((user) => [user.id, user]));
}

// Guard acotado al prefijo propio para no interceptar otras rutas /api/*.
router.use("/admin", requireAuth, requireTenant, requireRole(ADMIN_ROLES));

router.get("/admin/members", async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    await assertFreshAdmin(client, request);
    const [
      profilesResult,
      membershipsResult,
      invitationsResult,
      auditResult,
      users,
    ] = await Promise.all([
      client
        .from("profiles")
        .select(
          "user_id,tenant_id,email,full_name,role,course_ids,is_active,updated_at",
        )
        .eq("tenant_id", request.tenantId)
        .order("full_name", { ascending: true }),
      client
        .from("app_memberships")
        .select("user_id,role,is_active,application_code")
        .eq("tenant_id", request.tenantId)
        .eq("application_code", APPLICATION_CODE),
      client
        .from("membership_invitations")
        .select(
          "id,tenant_id,email,role,application_code,auth_user_id,invited_by,status,created_at,updated_at,last_sent_at,cancelled_at,accepted_at",
        )
        .eq("tenant_id", request.tenantId)
        .order("created_at", { ascending: false }),
      client
        .from("audit_events")
        .select(
          "id,actor_user_id,action,entity_type,entity_id,previous_values,new_values,occurred_at",
        )
        .eq("tenant_id", request.tenantId)
        .eq("entity_type", "membership")
        .order("occurred_at", { ascending: false })
        .limit(200),
      listAuthUsers(client),
    ]);
    if (profilesResult.error) throw profilesResult.error;
    if (membershipsResult.error) throw membershipsResult.error;
    if (invitationsResult.error) throw invitationsResult.error;
    if (auditResult.error) throw auditResult.error;

    const profiles = (profilesResult.data ?? []) as unknown as ProfileRow[];
    const memberships = (membershipsResult.data ??
      []) as unknown as MembershipRow[];
    const membershipByUser = new Map(
      memberships.map((membership) => [membership.user_id, membership]),
    );
    const invitations = (invitationsResult.data ??
      []) as unknown as InvitationRow[];
    const audits = (auditResult.data ?? []) as unknown as AuditRow[];
    const actorEmails = new Map(
      profiles.map((profile) => [profile.user_id, profile.email ?? ""]),
    );
    const currentInvitations = invitations.map((invitation) => {
      const user = invitation.auth_user_id
        ? users.get(invitation.auth_user_id)
        : undefined;
      if (invitation.status === "pending" && user?.confirmed_at) {
        return {
          ...invitation,
          status: "accepted" as const,
          accepted_at: user.confirmed_at,
        };
      }
      return invitation;
    });

    res.json({
      members: profiles.map((profile) => {
        const membership = membershipByUser.get(profile.user_id);
        const user = users.get(profile.user_id);
        return {
          ...profile,
          membershipRole: membership?.role ?? profile.role,
          membershipActive: membership?.is_active ?? profile.is_active,
          confirmed: Boolean(user?.confirmed_at),
          lastSignInAt: user?.last_sign_in_at ?? null,
        };
      }),
      invitations: currentInvitations,
      history: audits.map((audit) => ({
        ...audit,
        actorEmail: actorEmails.get(audit.actor_user_id) ?? null,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al cargar la administraci�n.";
    const status = message.includes("permisos") ? 403 : 500;
    res.status(status).json(clientErrorBody(message, status));
  }
});

router.patch("/admin/members/:userId", async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    await assertFreshAdmin(client, request);
    const userId = req.params.userId;
    const role = req.body?.role;
    const accessEnabled = req.body?.accessEnabled;
    if (
      !userId ||
      !isValidUuid(userId) ||
      !isRole(role) ||
      typeof accessEnabled !== "boolean"
    ) {
      res
        .status(400)
        .json({ error: "userId, role y accessEnabled son obligatorios." });
      return;
    }

    const { data: targetData, error: targetError } = await client
      .from("profiles")
      .select(
        "user_id,tenant_id,email,full_name,role,course_ids,is_active,updated_at",
      )
      .eq("user_id", userId)
      .eq("tenant_id", request.tenantId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!targetData) {
      res
        .status(404)
        .json({ error: "Usuario no encontrado en este establecimiento." });
      return;
    }
    const target = targetData as unknown as ProfileRow;
    if (target.role === "admin" && (!accessEnabled || role !== "admin")) {
      const { count, error: countError } = await client
        .from("profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("tenant_id", request.tenantId)
        .eq("role", "admin")
        .eq("is_active", true)
        .neq("user_id", userId);
      if (countError) throw countError;
      if ((count ?? 0) < 1) {
        res.status(409).json({
          error:
            "No puede dejar al establecimiento sin un administrador activo.",
        });
        return;
      }
    }

    const { error: profileError } = await client
      .from("profiles")
      .update({
        role,
        is_active: accessEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("tenant_id", request.tenantId);
    if (profileError) throw profileError;
    const { error: membershipError } = await client
      .from("app_memberships")
      .upsert(
        {
          tenant_id: request.tenantId,
          user_id: userId,
          application_code: APPLICATION_CODE,
          role,
          is_active: accessEnabled,
        },
        { onConflict: "tenant_id,user_id,application_code" },
      );
    if (membershipError) throw membershipError;
    await recordAudit(
      client,
      request,
      "member_updated",
      userId,
      {
        role: target.role,
        is_active: target.is_active,
      },
      { role, is_active: accessEnabled },
    );
    res.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible actualizar al usuario.";
    const status = message.includes("administrador") ? 409 : 500;
    res.status(status).json(clientErrorBody(message, status));
  }
});

router.post("/admin/invitations", async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    await assertFreshAdmin(client, request);
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const role = req.body?.role;
    if (!EMAIL_RE.test(email) || !isRole(role)) {
      res
        .status(400)
        .json({ error: "Ingrese un correo válido y un rol existente." });
      return;
    }
    const { data: existingProfile, error: profileError } = await client
      .from("profiles")
      .select("user_id,email")
      .eq("tenant_id", request.tenantId)
      .ilike("email", email)
      .maybeSingle();
    if (profileError) throw profileError;
    if (existingProfile) {
      res.status(409).json({
        error: "Ese correo ya pertenece a un usuario del establecimiento.",
      });
      return;
    }
    const { data: existingInvitation, error: invitationError } = await client
      .from("membership_invitations")
      .select("id")
      .eq("tenant_id", request.tenantId)
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();
    if (invitationError) throw invitationError;
    if (existingInvitation) {
      res
        .status(409)
        .json({ error: "Ya existe una invitación pendiente para ese correo." });
      return;
    }

    const invitation = await client.auth.admin.inviteUserByEmail(email, {
      data: { tenant_id: request.tenantId, role },
    });
    if (invitation.error || !invitation.data.user)
      throw invitation.error ?? new Error("No se creó el usuario invitado.");
    const invitedUser = invitation.data.user;
    const { data: invitationRow, error: insertError } = await client
      .from("membership_invitations")
      .insert({
        tenant_id: request.tenantId,
        email,
        role,
        application_code: APPLICATION_CODE,
        auth_user_id: invitedUser.id,
        invited_by: request.user?.sub,
      })
      .select("id,email,role,status,created_at,last_sent_at")
      .single();
    if (insertError) throw insertError;
    await client
      .from("profiles")
      .update({ role, is_active: true })
      .eq("user_id", invitedUser.id)
      .eq("tenant_id", request.tenantId);
    await client.from("app_memberships").upsert(
      {
        tenant_id: request.tenantId,
        user_id: invitedUser.id,
        application_code: APPLICATION_CODE,
        role,
        is_active: true,
      },
      { onConflict: "tenant_id,user_id,application_code" },
    );
    await recordAudit(
      client,
      request,
      "invitation_created",
      invitedUser.id,
      null,
      { email, role },
    );
    res.status(201).json({ invitation: invitationRow });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible enviar la invitaci�n.";
    res
      .status(invitationErrorStatus(message))
      .json(clientErrorBody(message, invitationErrorStatus(message)));
  }
});

router.post("/admin/invitations/:invitationId/resend", async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    await assertFreshAdmin(client, request);
    if (!req.params.invitationId || !isValidUuid(req.params.invitationId)) {
      res.status(400).json({ error: "Identificador de invitación inválido." });
      return;
    }
    const { data, error } = await client
      .from("membership_invitations")
      .select("id,tenant_id,email,role,auth_user_id,status")
      .eq("id", req.params.invitationId)
      .eq("tenant_id", request.tenantId)
      .maybeSingle();
    if (error) throw error;
    const invitation = data as unknown as Pick<
      InvitationRow,
      "id" | "tenant_id" | "email" | "role" | "auth_user_id" | "status"
    > | null;
    if (!invitation || invitation.status !== "pending") {
      res.status(404).json({ error: "Invitación pendiente no encontrada." });
      return;
    }
    const resend = await client.auth.admin.inviteUserByEmail(invitation.email, {
      data: { tenant_id: request.tenantId, role: invitation.role },
    });
    if (resend.error) throw resend.error;
    const now = new Date().toISOString();
    await client
      .from("membership_invitations")
      .update({ last_sent_at: now, updated_at: now })
      .eq("id", invitation.id)
      .eq("tenant_id", request.tenantId);
    await recordAudit(
      client,
      request,
      "invitation_resent",
      invitation.auth_user_id ?? invitation.id,
      null,
      { email: invitation.email },
    );
    res.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible reenviar la invitaci�n.";
    res
      .status(invitationErrorStatus(message))
      .json(clientErrorBody(message, invitationErrorStatus(message)));
  }
});

router.post("/admin/invitations/:invitationId/cancel", async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    await assertFreshAdmin(client, request);
    if (!req.params.invitationId || !isValidUuid(req.params.invitationId)) {
      res.status(400).json({ error: "Identificador de invitación inválido." });
      return;
    }
    const { data, error } = await client
      .from("membership_invitations")
      .select("id,email,role,auth_user_id,status")
      .eq("id", req.params.invitationId)
      .eq("tenant_id", request.tenantId)
      .maybeSingle();
    if (error) throw error;
    const invitation = data as unknown as Pick<
      InvitationRow,
      "id" | "email" | "role" | "auth_user_id" | "status"
    > | null;
    if (!invitation || invitation.status !== "pending") {
      res.status(404).json({ error: "Invitación pendiente no encontrada." });
      return;
    }
    const now = new Date().toISOString();
    const { error: updateError } = await client
      .from("membership_invitations")
      .update({ status: "cancelled", cancelled_at: now, updated_at: now })
      .eq("id", invitation.id)
      .eq("tenant_id", request.tenantId);
    if (updateError) throw updateError;
    if (invitation.auth_user_id) {
      await client
        .from("profiles")
        .update({ is_active: false, updated_at: now })
        .eq("user_id", invitation.auth_user_id)
        .eq("tenant_id", request.tenantId);
      await client
        .from("app_memberships")
        .update({ is_active: false, updated_at: now })
        .eq("user_id", invitation.auth_user_id)
        .eq("tenant_id", request.tenantId)
        .eq("application_code", APPLICATION_CODE);
    }
    await recordAudit(
      client,
      request,
      "invitation_cancelled",
      invitation.auth_user_id ?? invitation.id,
      { email: invitation.email, role: invitation.role },
      null,
    );
    res.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible cancelar la invitación.";
    res.status(500).json(clientErrorBody(message, 500));
  }
});

router.post("/admin/import", ownUpload.single("file"), async (req, res) => {
  try {
    const request = getRequest(req);
    const client = getAdminClient();
    await assertFreshAdmin(client, request);
    if (!request.tenantId)
      throw new Error("No fue posible determinar el establecimiento.");
    if (!req.file?.buffer) {
      res.status(400).json({ error: "Adjunte un archivo .xlsx válido." });
      return;
    }
    const defaultLevel =
      req.body?.defaultLevel === "MEDIA" ? "MEDIA" : "BASICA";
    const { parseImportWorkbook, runImport } =
      await import("../services/excelImport.js");
    const parsed = await parseImportWorkbook(req.file.buffer, defaultLevel);
    const result = await runImport(client, request.tenantId, parsed);
    await recordAudit(
      client,
      request,
      "tenant_base_imported",
      request.tenantId,
      null,
      {
        courses: result.coursesInserted,
        students: result.studentsInserted,
      },
    );
    res.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible importar la base.";
    const status = message.includes("permisos") ? 403 : 500;
    res.status(status).json(clientErrorBody(message, status));
  }
});

router.post(
  "/admin/profesores/import",
  ownUpload.single("file"),
  async (req, res) => {
    try {
      const request = getRequest(req);
      const client = getAdminClient();
      await assertFreshAdmin(client, request);
      const file = req.file as Express.Multer.File | undefined;
      if (!file) {
        res.status(400).json({ error: "Adjunte un archivo .xlsx." });
        return;
      }
      if (!file.originalname.toLowerCase().endsWith(".xlsx")) {
        res.status(400).json({ error: "Solo se permiten archivos .xlsx." });
        return;
      }
      const { importTeachers } = await import("../services/teachersImport.js");
      const result = await importTeachers(client, request.tenantId ?? "", {
        buffer: file.buffer,
        originalname: safeFileName(file.originalname),
      });
      await recordAudit(
        client,
        request,
        "teachers_roster_imported",
        request.tenantId ?? "",
        null,
        result as unknown as Record<string, unknown>,
      );
      res.json(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible importar la nómina docente.";
      res.status(500).json(clientErrorBody(message, 500));
    }
  },
);

async function loadTeacherNames(
  client: SupabaseClient,
  tenantId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from("teachers")
    .select("full_name")
    .eq("tenant_id", tenantId);
  if (error) return [];
  return ((data ?? []) as Array<{ full_name: string }>)
    .map((row) => row.full_name)
    .filter((name) => name.trim().length > 0);
}

router.post(
  "/admin/annotations/bulk-preview",
  ownUpload.single("file"),
  async (req, res) => {
    try {
      const request = getRequest(req);
      const client = getAdminClient();
      await assertFreshAdmin(client, request);
      if (!isPdfUpload(req.file)) {
        res.status(400).json({ error: "Adjunte un archivo PDF válido." });
        return;
      }

      const teacherNames = await loadTeacherNames(
        client,
        request.tenantId ?? "",
      );
      const parsed = await parseBulkDisciplinaryPdf(
        req.file!.buffer,
        teacherNames,
      );
      const detectedTotal = parsed.estudiantes.reduce(
        (total, student) => total + student.anotaciones.length,
        0,
      );
      if (detectedTotal > BULK_MAX_ANNOTATIONS) {
        res.status(400).json({
          error: "El PDF contiene demasiadas anotaciones para importar.",
        });
        return;
      }
      const { data: courses, error: coursesError } = await client
        .from("courses")
        .select("id,name,level")
        .eq("tenant_id", request.tenantId);
      if (coursesError) throw coursesError;
      const courseKeys = new Map(
        (courses ?? []).map((course) => [bulkCourseKey(course.name), course]),
      );
      const detectedCourse = parsed.estudiantes[0]?.curso ?? "";
      const course = courseKeys.get(bulkCourseKey(detectedCourse));
      if (!course) {
        res.status(422).json({
          error: `No existe en este establecimiento el curso detectado "${detectedCourse}".`,
          detected_course: detectedCourse,
        });
        return;
      }
      const { data: students, error: studentsError } = await client
        .from("students")
        .select("id,full_name,rut,course_id")
        .eq("tenant_id", request.tenantId)
        .eq("course_id", course.id);
      if (studentsError) throw studentsError;
      const studentsByName = new Map<string, (typeof students)[number][]>();
      for (const student of students ?? []) {
        const key = bulkNameKey(student.full_name);
        studentsByName.set(key, [...(studentsByName.get(key) ?? []), student]);
      }

      const matchedStudentIds = parsed.estudiantes.flatMap((source) => {
        const candidates = studentsByName.get(bulkNameKey(source.nombre)) ?? [];
        return candidates.length === 1 ? [candidates[0].id] : [];
      });
      const existingRecords = matchedStudentIds.length
        ? await fetchExistingBulkRecords(
            client,
            request.tenantId ?? "",
            matchedStudentIds,
          )
        : [];
      const existingByStudent = new Map<string, typeof existingRecords>();
      for (const record of existingRecords ?? []) {
        const records = existingByStudent.get(record.student_id) ?? [];
        records.push(record);
        existingByStudent.set(record.student_id, records);
      }

      const previewStudents = parsed.estudiantes.map((source) => {
        const candidates = studentsByName.get(bulkNameKey(source.nombre)) ?? [];
        const match = candidates.length === 1 ? candidates[0] : null;
        return {
          source_name: source.nombre,
          student_id: match?.id ?? null,
          matched_name: match?.full_name ?? null,
          rut: match?.rut ?? null,
          status:
            candidates.length === 1
              ? "matched"
              : candidates.length > 1
                ? "ambiguous"
                : "missing",
          annotation_count: source.anotaciones.length,
          duplicates_removed: source.duplicados_eliminados,
        };
      });
      const annotations: BulkPreviewAnnotation[] = parsed.estudiantes.flatMap(
        (source) => {
          const candidates =
            studentsByName.get(bulkNameKey(source.nombre)) ?? [];
          const match = candidates.length === 1 ? candidates[0] : null;
          return match
            ? selectNewBulkAnnotations(
                source.anotaciones,
                existingByStudent.get(match.id) ?? [],
              ).map((annotation) => ({
                ...annotation,
                student_id: match.id,
                student_name: match.full_name,
              }))
            : [];
        },
      );
      const additionalNegatives = new Map<string, number>();
      for (const annotation of annotations) {
        if (annotation.tipo === "Negativa") {
          additionalNegatives.set(
            annotation.student_id,
            (additionalNegatives.get(annotation.student_id) ?? 0) + 1,
          );
        }
      }
      const cartaPlan = await previewBulkCartas(
        {
          supabase: client,
          tenantId: request.tenantId ?? "",
          studentIds: matchedStudentIds,
        },
        additionalNegatives,
      );
      const cartasByStudent = new Map(
        cartaPlan.map((item) => [item.student.id, item]),
      );
      res.json({
        file_name: safeFileName(req.file?.originalname),
        file_hash: parsed.file_hash,
        paginas: parsed.paginas,
        detected_course: course.name,
        course_id: course.id,
        warnings: parsed.warnings,
        students: previewStudents.map((student) => ({
          ...student,
          existing_count:
            existingByStudent.get(student.student_id ?? "")?.length ?? 0,
          new_count: annotations.filter(
            (annotation) => annotation.student_id === student.student_id,
          ).length,
          current_letter:
            cartasByStudent.get(student.student_id ?? "")?.current_letter ??
            null,
          pending_letter:
            cartasByStudent.get(student.student_id ?? "")?.pending_letter ??
            null,
        })),
        annotations,
        summary: {
          students_in_file: parsed.estudiantes.length,
          students_in_database: students?.length ?? 0,
          matched_students: previewStudents.filter(
            (row) => row.status === "matched",
          ).length,
          missing_students: previewStudents.filter(
            (row) => row.status === "missing",
          ).length,
          ambiguous_students: previewStudents.filter(
            (row) => row.status === "ambiguous",
          ).length,
          annotations_detected: detectedTotal,
          annotations_existing: existingRecords?.length ?? 0,
          annotations_ready: annotations.length,
          duplicates_removed: parsed.estudiantes.reduce(
            (total, student) => total + student.duplicados_eliminados,
            0,
          ),
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible analizar el PDF.";
      res.status(500).json(clientErrorBody(message, 500));
    }
  },
);

router.post(
  "/admin/annotations/bulk-confirm",
  ownUpload.single("file"),
  async (req, res) => {
    try {
      const request = getRequest(req);
      const client = getAdminClient();
      await assertFreshAdmin(client, request);
      const courseId = req.body?.course_id;
      const fileHash = req.body?.file_hash;
      if (
        !isPdfUpload(req.file) ||
        !isValidUuid(courseId) ||
        typeof fileHash !== "string" ||
        !/^[a-f0-9]{64}$/.test(fileHash)
      ) {
        res
          .status(400)
          .json({ error: "Vista previa de importación inválida." });
        return;
      }
      const teacherNames = await loadTeacherNames(
        client,
        request.tenantId ?? "",
      );
      const parsed = await parseBulkDisciplinaryPdf(
        req.file!.buffer,
        teacherNames,
      );
      if (parsed.file_hash !== fileHash) {
        res
          .status(400)
          .json({ error: "El hash del PDF no coincide con la vista previa." });
        return;
      }
      const { data: course, error: courseError } = await client
        .from("courses")
        .select("id,name")
        .eq("id", courseId)
        .eq("tenant_id", request.tenantId)
        .maybeSingle();
      if (courseError) throw courseError;
      if (!course) {
        res
          .status(404)
          .json({ error: "Curso no encontrado en este establecimiento." });
        return;
      }
      const { data: students, error: studentsError } = await client
        .from("students")
        .select("id,full_name,course_id")
        .eq("tenant_id", request.tenantId)
        .eq("course_id", courseId);
      if (studentsError) throw studentsError;
      const studentsByName = new Map<string, (typeof students)[number][]>();
      for (const student of students ?? []) {
        const key = bulkNameKey(student.full_name);
        studentsByName.set(key, [...(studentsByName.get(key) ?? []), student]);
      }
      const matchOf = (source: { nombre: string }) =>
        studentsByName.get(bulkNameKey(source.nombre)) ?? [];
      const unresolvedSources = parsed.estudiantes.filter(
        (source) => matchOf(source).length !== 1,
      );
      if (unresolvedSources.length > 0) {
        res.status(409).json({
          error: `Hay ${unresolvedSources.length} estudiantes sin coincidencia única en este establecimiento; corrige el PDF y vuelve a intentarlo.`,
          unresolved: unresolvedSources
            .map((source) => source.nombre)
            .slice(0, 50),
        });
        return;
      }
      if (parsed.warnings.length > 0) {
        res.status(422).json({
          error:
            "El PDF contiene fichas con advertencias; corrígelas y vuelve a intentarlo.",
          warnings: parsed.warnings.slice(0, 50),
        });
        return;
      }
      const matchedStudentIds = parsed.estudiantes.flatMap((source) => {
        const candidates = studentsByName.get(bulkNameKey(source.nombre)) ?? [];
        return candidates.length === 1 ? [candidates[0].id] : [];
      });
      const existingRecords = matchedStudentIds.length
        ? await fetchExistingBulkRecords(
            client,
            request.tenantId ?? "",
            matchedStudentIds,
          )
        : [];
      const existingByStudent = new Map<string, typeof existingRecords>();
      for (const record of existingRecords ?? []) {
        const records = existingByStudent.get(record.student_id) ?? [];
        records.push(record);
        existingByStudent.set(record.student_id, records);
      }
      const newAnnotations: BulkPreviewAnnotation[] =
        parsed.estudiantes.flatMap((source) => {
          const candidates =
            studentsByName.get(bulkNameKey(source.nombre)) ?? [];
          if (candidates.length !== 1) return [];
          const student = candidates[0];
          return selectNewBulkAnnotations(
            source.anotaciones,
            existingByStudent.get(student.id) ?? [],
          ).map((annotation) => ({
            ...annotation,
            student_id: student.id,
            student_name: student.full_name,
          }));
        });
      const detectedTotal = parsed.estudiantes.reduce(
        (total, student) => total + student.anotaciones.length,
        0,
      );
      if (newAnnotations.length > BULK_MAX_ANNOTATIONS) {
        res.status(400).json({
          error: "El PDF contiene demasiadas anotaciones para importar.",
        });
        return;
      }
      const pdfPath = `bulk-pdf/${request.tenantId}/${courseId}/${fileHash}`;
      const { count: existingCount, error: existingError } = await client
        .from("inspectorate_records")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", request.tenantId)
        .eq("pdf_file_path", pdfPath);
      if (existingError) throw existingError;
      if ((existingCount ?? 0) > 0) {
        res
          .status(409)
          .json({ error: "Este PDF ya fue importado para este curso." });
        return;
      }

      const rows = newAnnotations.map((annotation) => ({
        student_id: annotation.student_id,
        date_time: `${annotation.fecha_iso}T12:00:00.000Z`,
        observation: `[${annotation.categoria}] ${annotation.texto}`,
        type: annotation.tipo,
        severity: "Leve",
        registered_by: annotation.profesor?.trim() || "PDF Importación Masiva",
        created_by: request.user?.sub ?? "",
        tenant_id: request.tenantId,
        pdf_file_path: pdfPath,
      }));
      if (rows.length > 0) {
        const { error: insertError } = await client
          .from("inspectorate_records")
          .insert(rows);
        if (insertError) throw insertError;
      }
      const pendingCartas = await syncBulkPendingCartas({
        supabase: client,
        tenantId: request.tenantId ?? "",
        studentIds: matchedStudentIds,
        actorUserId: request.user?.sub ?? "",
        sourceHash: fileHash,
      });
      const { error: auditError } = await client.from("audit_events").insert({
        tenant_id: request.tenantId,
        actor_user_id: request.user?.sub ?? "",
        action: "annotations_bulk_imported",
        entity_type: "annotation_bulk_import",
        entity_id: courseId,
        previous_values: null,
        new_values: {
          file_hash: fileHash,
          course_id: courseId,
          annotations: rows.length,
          pending_cartas: pendingCartas,
        },
      });
      if (auditError) throw auditError;
      res.json({
        imported: rows.length,
        skipped: detectedTotal - newAnnotations.length,
        course: course.name,
        pending_cartas: pendingCartas,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible confirmar la importación.";
      res.status(500).json(clientErrorBody(message, 500));
    }
  },
);

export default router;
