/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import { AlertTriangle } from 'lucide-react';

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className = '', ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    ref={ref}
    className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out ${className}`}
    {...props}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className = '', children, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={`fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 animate-scale-in rounded-2xl bg-white p-6 shadow-xl outline-none data-[state=closed]:animate-scale-out ${className}`}
      {...props}
    >
      {children}
    </AlertDialogPrimitive.Content>
  </AlertDialogPortal>
));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({ className = '', ...props }: ComponentPropsWithoutRef<'div'>) => (
  <div className={`mb-4 flex items-center gap-3 ${className}`} {...props} />
);
AlertDialogHeader.displayName = 'AlertDialogHeader';

const AlertDialogIcon = ({ className = '' }: { className?: string }) => (
  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 ${className}`}>
    <AlertTriangle className="h-5 w-5 text-red-500" />
  </div>
);
AlertDialogIcon.displayName = 'AlertDialogIcon';

const AlertDialogTitle = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className = '', ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={`font-semibold text-base text-neutral-900 ${className}`}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className = '', ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={`ml-[52px] text-neutral-500 text-sm ${className}`}
    {...props}
  />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

const AlertDialogFooter = ({ className = '', ...props }: ComponentPropsWithoutRef<'div'>) => (
  <div className={`mt-6 flex justify-end gap-3 ${className}`} {...props} />
);
AlertDialogFooter.displayName = 'AlertDialogFooter';

const AlertDialogCancel = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Cancel>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className = '', children, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={`cursor-pointer rounded-xl bg-neutral-100 px-4 py-2 font-medium text-neutral-700 text-sm transition-colors hover:bg-neutral-200 ${className}`}
    {...props}
  >
    {children}
  </AlertDialogPrimitive.Cancel>
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

const AlertDialogAction = forwardRef<
  ElementRef<typeof AlertDialogPrimitive.Action>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className = '', children, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={`cursor-pointer rounded-xl bg-red-500 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-red-600 ${className}`}
    {...props}
  >
    {children}
  </AlertDialogPrimitive.Action>
));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogIcon,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
};
