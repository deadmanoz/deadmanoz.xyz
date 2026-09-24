"use client";

import { useEffect, useRef, useState } from "react";
import type { Data, Layout, Config } from "plotly.js-basic-dist";
import {
  applyPlotChrome,
  encodingRestyle,
  layoutMarkRelayout,
  paperEncodings,
  plotChromeRelayout,
  snapshotEncodings,
  type PlotTrace,
} from "@/lib/plot-theme";
import { currentTheme, THEME_EVENT } from "@/lib/theme-boot";

export interface InteractivePlotProps {
  data: Data[];
  layout?: Partial<Layout>;
  config?: Partial<Config>;
  className?: string;
  id?: string;
}

export function InteractivePlot({
  data,
  layout = {},
  config = {},
  className = "",
  id = "plot"
}: InteractivePlotProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [plotlyLoaded, setPlotlyLoaded] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !plotRef.current) return;

    const plotElement = plotRef.current; // Capture ref value for cleanup
    let Plotly: typeof import("plotly.js-basic-dist");
    let onTheme: (() => void) | undefined;

    const loadPlotly = async () => {
      try {
        Plotly = await import("plotly.js-basic-dist");
        setPlotlyLoaded(true);

        const defaultLayout: Partial<Layout> = {
          font: {
            family: "var(--font-inter), sans-serif",
            size: 12,
          },
          xaxis: {
            rangeslider: {
              visible: true,
              borderwidth: 1,
            },
          },
          hovermode: "x unified",
          margin: {
            l: 60,
            r: 40,
            t: 40,
            b: 80,
          },
          height: 600,
        };

        const defaultConfig: Partial<Config> = {
          responsive: true,
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToRemove: ["lasso2d", "select2d"],
          toImageButtonOptions: {
            format: "png",
            filename: id || "plot",
            height: 800,
            width: 1200,
            scale: 2,
          },
        };

        // Calculate data range to constrain panning
        let minX: string | number | undefined;
        let maxX: string | number | undefined;

        if (data && data.length > 0) {
          // Find min and max across all data series
          for (const trace of data) {
            // Check if trace has x property (not all plot types do)
            const traceX = (trace as { x?: (string | number)[] }).x;
            if (traceX && Array.isArray(traceX) && traceX.length > 0) {
              const traceMin = traceX[0];
              const traceMax = traceX[traceX.length - 1];

              if (minX === undefined || traceMin < minX) minX = traceMin;
              if (maxX === undefined || traceMax > maxX) maxX = traceMax;
            }
          }
        }

        const theme = currentTheme();
        const traces = data as PlotTrace[];
        const mergedLayout = applyPlotChrome({ ...defaultLayout, ...layout }, theme);
        const mergedConfig = { ...defaultConfig, ...config };
        const originalEncodings = snapshotEncodings(traces);
        const paper = paperEncodings(traces);

        if (plotElement) {
          await Plotly.newPlot(
            plotElement,
            data,
            mergedLayout,
            mergedConfig
          );
          if (theme === "paper") {
            await Plotly.update(
              plotElement,
              encodingRestyle(paper) as never,
              layoutMarkRelayout(mergedLayout, "paper"),
            );
          }
          onTheme = () => {
            const next = currentTheme();
            void Plotly.update(
              plotElement,
              encodingRestyle(next === "paper" ? paper : originalEncodings) as never,
              {
                ...plotChromeRelayout(next),
                ...layoutMarkRelayout(mergedLayout, next),
              },
            );
          };
          window.addEventListener(THEME_EVENT, onTheme);

          // Add event listener to constrain panning to data range
          if (minX !== undefined && maxX !== undefined) {
            const plotDiv = plotElement;
            // Use addEventListener for plotly events
            plotDiv.addEventListener('plotly_relayout', ((event: CustomEvent) => {
              const eventData = event.detail as { [key: string]: unknown };
              if (eventData['xaxis.range[0]'] || eventData['xaxis.range']) {
                const currentRange = eventData['xaxis.range'] as [string | number, string | number] | undefined;
                let needsUpdate = false;
                const updates: { 'xaxis.range': [string | number, string | number] } = {
                  'xaxis.range': currentRange || [minX, maxX]
                };

                // Check if panning went outside data bounds
                if (currentRange) {
                  const [rangeMin, rangeMax] = currentRange;

                  if (rangeMin < minX) {
                    updates['xaxis.range'][0] = minX;
                    needsUpdate = true;
                  }
                  if (rangeMax > maxX) {
                    updates['xaxis.range'][1] = maxX;
                    needsUpdate = true;
                  }

                  // Apply correction if needed
                  if (needsUpdate && plotDiv) {
                    Plotly.relayout(plotDiv, updates);
                  }
                }
              }
            }) as EventListener);
          }
        }
      } catch (error) {
        console.error("Failed to load Plotly:", error);
      }
    };

    loadPlotly();

    // Cleanup
    return () => {
      if (onTheme) window.removeEventListener(THEME_EVENT, onTheme);
      if (plotElement && plotlyLoaded) {
        import("plotly.js-basic-dist").then((Plotly) => {
          Plotly.purge(plotElement);
        });
      }
    };
  }, [isClient, data, layout, config, id, plotlyLoaded]);

  if (!isClient) {
    return (
      <div className={`w-full h-[600px] flex items-center justify-center bg-synthwave-bg-card rounded-lg ${className}`}>
        <p className="text-synthwave-neon-cyan">Loading plot...</p>
      </div>
    );
  }

  return (
    <div
      ref={plotRef}
      id={id}
      className={`plot-frame w-full min-h-[600px] rounded-lg border-2 border-synthwave-neon-cyan/30 overflow-hidden ${className}`}
    />
  );
}
