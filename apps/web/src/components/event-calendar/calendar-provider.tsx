import type { ReactNode } from 'react';
import { useState } from 'react';
import { CalendarContext } from '@/components/event-calendar/calendar-context';
import { etiquettes } from '@/components/event-calendar/constants';
import type { CalendarView } from '@/components/event-calendar/types';

interface CalendarProviderProps {
  children: ReactNode;
  initialView?: CalendarView;
}

export function CalendarProvider({ children, initialView = 'month' }: CalendarProviderProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [view, setView] = useState<CalendarView>(initialView);

  // Initialize visibleColors based on the isActive property in etiquettes
  const [visibleColors, setVisibleColors] = useState<string[]>(() => {
    // Filter etiquettes to get only those that are active
    return etiquettes.filter((etiquette) => etiquette.isActive).map((etiquette) => etiquette.color);
  });

  // Toggle visibility of a color
  const toggleColorVisibility = (color: string) => {
    setVisibleColors((prev) => {
      if (prev.includes(color)) {
        return prev.filter((c) => c !== color);
      }
      return [...prev, color];
    });
  };

  // Check if a color is visible
  const isColorVisible = (color: string | undefined) => {
    if (!color) return true; // Events without a color are always visible
    return visibleColors.includes(color);
  };

  const value = {
    currentDate,
    setCurrentDate,
    view,
    setView,
    visibleColors,
    toggleColorVisibility,
    isColorVisible,
  };

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
}
