"use client";

import { useEffect, useRef, useState } from "react";
import type { Data, Layout, Config } from "plotly.js-basic-dist";

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

    const loadPlotly = async () => {
      try {
        Plotly = await import("plotly.js-basic-dist");
        setPlotlyLoaded(true);

        // Synthwave theme defaults
        const defaultLayout: Partial<Layout> = {
          paper_bgcolor: "rgba(38, 20, 71, 0.7)", // --theme-bg-card
          plot_bgcolor: "rgba(0, 2, 33, 0.5)", // --theme-bg-primary with transparency
          font: {
            family: "var(--font-inter), sans-serif",
            color: "#FF8664", // --theme-peach
            size: 12,
          },
          xaxis: {
            gridcolor: "rgba(255, 108, 17, 0.2)", // --theme-neon-orange with transparency
            linecolor: "#00A0D0", // --theme-neon-cyan
            tickfont: {
              color: "#00A0D0",
            },
            rangeslider: {
              visible: true,
              bgcolor: "rgba(0, 2, 33, 0.8)",
              bordercolor: "#00A0D0",
              borderwidth: 1,
            },
          },
          yaxis: {
            gridcolor: "rgba(255, 108, 17, 0.2)",
            linecolor: "#00A0D0",
            tickfont: {
              color: "#00A0D0",
            },
          },
          hovermode: "x unified",
          hoverlabel: {
            bgcolor: "rgba(38, 20, 71, 0.95)",
            bordercolor: "#00A0D0",
            font: {
              color: "#FF8664",
            },
          },
          margin: {
            l: 60,
            r: 40,
            t: 40,
            b: 80,
          },
          height: 600, // Default height in pixels
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

        // Merge user layout/config with defaults
        const mergedLayout = { ...defaultLayout, ...layout };
        const mergedConfig = { ...defaultConfig, ...config };

        if (plotElement) {
          await Plotly.newPlot(
            plotElement,
            data,
            mergedLayout,
            mergedConfig
          );

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
      className={`w-full min-h-[600px] rounded-lg border-2 border-synthwave-neon-cyan/30 overflow-hidden ${className}`}
      style={{
        boxShadow: "0 0 20px rgba(0, 160, 208, 0.2)",
      }}
    />
  );
}
