/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useId, useState, type FormEvent } from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./Dialog";
import Button from "./Button";
import {
  clearSessionDraft,
  readSessionDraft,
  registerSessionDraftSave,
  writeSessionDraft,
} from "../lib/sessionDraft";

interface TextInputDialogProps {
  open: boolean;
  draftKey: string | null;
  title: string;
  description: string;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: (value: string) => void | Promise<string | null | void>;
}

export default function TextInputDialog({
  open,
  draftKey,
  title,
  description,
  label,
  placeholder,
  confirmLabel,
  destructive = false,
  onCancel,
  onConfirm,
}: TextInputDialogProps) {
  const [draft, setDraft] = useState(() =>
    readSessionDraft(
      draftKey,
      { value: "" },
      z.object({ value: z.string().max(5000) }).partial(),
    ),
  );
  const value = draft.value;
  const setValue = (nextValue: string) => {
    const next = { value: nextValue };
    setDraft(next);
    writeSessionDraft(draftKey, next);
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputId = useId();

  useEffect(() => {
    if (open) {
      setDraft(
        readSessionDraft(
          draftKey,
          { value: "" },
          z.object({ value: z.string().max(5000) }).partial(),
        ),
      );
    }
  }, [draftKey, open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    const normalizedValue = value.trim();
    if (!normalizedValue) return;
    setIsSubmitting(true);
    try {
      const result = await onConfirm(normalizedValue);
      if (typeof result === "string") {
        registerSessionDraftSave(draftKey, result, JSON.stringify(draft));
        clearSessionDraft(draftKey, JSON.stringify(draft));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="block">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="mt-2">
              {description}
            </DialogDescription>
          </DialogHeader>

          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-neutral-700"
          >
            {label}
            <textarea
              id={inputId}
              aria-label={label}
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={placeholder}
              rows={4}
              className="mt-2 w-full resize-y rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <DialogFooter>
            <Button
              variant="ghost"
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                if (!draftKey || clearSessionDraft(draftKey))
                  setDraft({ value: "" });
              }}
            >
              Descartar borrador
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !value.trim()}
              variant={destructive ? "danger" : "primary"}
            >
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
