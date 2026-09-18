'use client';

import * as React from 'react';
import { ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { cn } from '@/lib/utils';

export type ChartConfig = Record<string, { label: string; color?: string }>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error('ChartTooltipContent debe usarse dentro de un ChartContainer');
  return ctx;
}

type ChartContainerProps = React.ComponentProps<'div'> & {
  config: ChartConfig;
  children: React.ReactElement;
};

/**
 * Envoltorio ligero estilo shadcn/ui "Chart" sobre Recharts: fija el layout (ResponsiveContainer
 * + tipografía tabular en ejes), e inyecta el `config` (color/label por serie) para que
 * ChartTooltipContent pueda pintar el mismo color y nombre que usa cada Bar/Line/Area, sin
 * tener que repetirlo a mano en cada tooltip.
 */
const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ config, children, className, ...props }, ref) => (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        className={cn(
          'w-full [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-axis-tick_text]:tabular-nums',
          className
        )}
        {...props}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
);
ChartContainer.displayName = 'ChartContainer';

const ChartTooltip = RechartsTooltip;

type ChartTooltipContentProps = {
  active?: boolean;
  payload?: ReadonlyArray<{
    dataKey?: string | number;
    name?: string | number;
    value?: number | string;
    color?: string;
    fill?: string;
    payload?: any;
  }>;
  label?: React.ReactNode;
  formatter?: (value: number, name: string, entry: any) => React.ReactNode;
  labelFormatter?: (label: React.ReactNode) => React.ReactNode;
  hideLabel?: boolean;
  className?: string;
};

/**
 * Tooltip flotante: borde fino, `backdrop-blur`, y cifras con `tabular-nums`. Lee el color y
 * la etiqueta de cada serie desde el `ChartConfig` del ChartContainer, así que el punto de
 * color del tooltip siempre coincide exactamente con el de la barra/línea/área.
 */
const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  ({ active, payload, label, formatter, labelFormatter, hideLabel, className }, ref) => {
    const { config } = useChart();
    if (!active || !payload?.length) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'min-w-[150px] rounded-xl border border-border/60 bg-popover/85 backdrop-blur-md px-3 py-2 text-xs shadow-lg',
          className
        )}
      >
        {!hideLabel && label !== undefined && (
          <p className="mb-1.5 font-semibold text-foreground">
            {labelFormatter ? labelFormatter(label) : label}
          </p>
        )}
        <div className="space-y-1">
          {payload.map((entry, i) => {
            const key = String(entry.dataKey ?? entry.name ?? i);
            const cfg = config[key];
            const color = cfg?.color || entry.color || entry.fill || '#71717a';
            const name = cfg?.label || String(entry.name ?? key);
            const value = typeof entry.value === 'number' ? entry.value : Number(entry.value ?? 0);
            return (
              <div key={key} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  {name}
                </span>
                <span className="font-semibold tabular-nums text-foreground">
                  {formatter ? formatter(value, name, entry) : value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
ChartTooltipContent.displayName = 'ChartTooltipContent';

export { ChartContainer, ChartTooltip, ChartTooltipContent };
