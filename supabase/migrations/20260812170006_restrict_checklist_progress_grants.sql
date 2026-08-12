/** @license SPDX-License-Identifier: Apache-2.0 */

revoke references, trigger, truncate
  on table public.checklist_progress_entries
  from authenticated;
