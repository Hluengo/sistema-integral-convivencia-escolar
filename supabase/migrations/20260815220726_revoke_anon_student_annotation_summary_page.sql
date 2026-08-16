/**
 * Restrict the student annotation summary to authenticated users.
 * The RPC returns student names, RUTs, courses and AI analysis metadata.
 */
revoke execute on function public.get_student_annotation_summary_page(integer, integer) from anon;
grant execute on function public.get_student_annotation_summary_page(integer, integer) to authenticated;
