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
import Button from './Button';

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
            <Button variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={destructive ? 'danger' : 'primary'}
              disabled={!value.trim()}
            >
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
