/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

revoke all on function public.get_teacher_annotation_ranking() from anon;
grant execute on function public.get_teacher_annotation_ranking() to authenticated;
grant execute on function public.get_teacher_annotation_ranking() to service_role;
