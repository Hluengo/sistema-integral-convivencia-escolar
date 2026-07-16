/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';

const Tabs = TabsPrimitive.Root;

const TabsList = forwardRef<
  ElementRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className = '', ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={`inline-flex items-center gap-1 rounded-xl bg-neutral-100 p-1 ${className}`}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & { count?: number }
>(({ className = '', children, count, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-neutral-500 transition-all duration-150 hover:text-neutral-700 data-[state=active]:bg-white data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm ${className}`}
    {...props}
  >
    {children}
    {count !== undefined && (
      <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-neutral-600">
        {count}
      </span>
    )}
  </TabsPrimitive.Trigger>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className = '', ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={`mt-4 outline-none ${className}`}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
export default Tabs;
