/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useId, useState, type FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './Dialog';

interface TextInputDialogProps {
  open: boolean;
  title: string;
  description: string;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}

export default function TextInputDialog({
  open,
  title,
  description,
  label,
  placeholder,
  confirmLabel,
  destructive = false,
  onCancel,
  onConfirm,
}: TextInputDialogProps) {
  const [value, setValue] = useState('');
  const inputId = useId();

  useEffect(() => {
    if (open) setValue('');
  }, [open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedValue = value.trim();
    if (!normalizedValue) return;
    onConfirm(normalizedValue);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="block">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="mt-2">{description}</DialogDescription>
          </DialogHeader>

          <label htmlFor={inputId} className="block text-sm font-semibold text-neutral-700">
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
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'
              }`}
            >
              {confirmLabel}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
