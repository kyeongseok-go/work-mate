'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue>({
  open: false,
  onOpenChange: () => {},
});

function Sheet({
  open = false,
  onOpenChange = () => {},
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
}

function SheetTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactNode;
}) {
  const { onOpenChange } = React.useContext(SheetContext);

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<React.HTMLAttributes<HTMLElement>>;
    return React.cloneElement(child, {
      onClick: () => onOpenChange(true),
    });
  }

  return (
    <div onClick={() => onOpenChange(true)} style={{ display: 'contents' }}>
      {children}
    </div>
  );
}

function SheetContent({
  side = 'left',
  className,
  children,
  style,
}: {
  side?: 'left' | 'right';
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const { open, onOpenChange } = React.useContext(SheetContext);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          'fixed top-0 z-50 h-full shadow-2xl',
          side === 'left' ? 'left-0' : 'right-0',
          className
        )}
        style={style}
      >
        {children}
      </div>
    </>
  );
}

export { Sheet, SheetTrigger, SheetContent };
