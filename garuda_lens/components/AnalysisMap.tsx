"use client";

/**
 * AnalysisMap
 * -----------
 * OpenStreetMap (Leaflet / react-leaflet) map used inside the Drishya AI
 * dashboard.  Shows:
 *   • All location presets as soft circle-markers with labels.
 *   • The currently selected location highlighted in accent green.
 *   • After an analysis run, the bounding-box rectangle is drawn and the
 *     map flies to the result centre.
 *
 * The component is dynamically imported by the parent (Next.js SSR guard).
 */

import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Rectangle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { LocationPreset, AnalysisResult } from "@/lib/garuda-api";

// ---------------------------------------------------------------------------
// Leaflet default icon fix (webpack / Next.js loses the asset paths)
// ---------------------------------------------------------------------------
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// ---------------------------------------------------------------------------
// Custom DivIcons
// ---------------------------------------------------------------------------
function makePresetIcon(selected: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${selected ? "#153b36" : "#5b9b92"};
      border:2px solid ${selected ? "#f3d8a8" : "#fff"};
      box-shadow:0 1px 4px rgba(0,0,0,.28);
      transition:all .2s;
    "></div>`,
  });
}

function makeAnalysisIcon() {
  return L.divIcon({
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
    html: `<div style="
      width:22px;height:22px;border-radius:50%;
      background:#153b36;border:3px solid #f3d8a8;
      box-shadow:0 2px 8px rgba(21,59,54,.45);
      display:flex;align-items:center;justify-content:center;
    "><div style="width:8px;height:8px;border-radius:50%;background:#f3d8a8;"></div></div>`,
  });
}

// ---------------------------------------------------------------------------
// Fly-to controller
// ---------------------------------------------------------------------------
function FlyTo({
  lat,
  lon,
  bufferDeg,
}: {
  lat: number;
  lon: number;
  bufferDeg: number;
}) {
  const map = useMap();
  const prevRef = useRef<string>("");

  useEffect(() => {
    const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
    if (key === prevRef.current) return;
    prevRef.current = key;

    const pad = bufferDeg * 1.6;
    map.flyToBounds(
      [
        [lat - pad, lon - pad],
        [lat + pad, lon + pad],
      ],
      { duration: 0.9, padding: [48, 48] }
    );
  }, [lat, lon, bufferDeg, map]);

  return null;
}

// ---------------------------------------------------------------------------
// Public props
// ---------------------------------------------------------------------------
export interface AnalysisMapProps {
  presets: LocationPreset[];
  selectedPresetId: string | null;
  analysisResult: AnalysisResult | null;
  /** Fires when the user clicks a preset marker */
  onPresetClick?: (presetId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AnalysisMap({
  presets,
  selectedPresetId,
  analysisResult,
  onPresetClick,
}: AnalysisMapProps) {
  const selectedPreset =
    presets.find((p) => p.id === selectedPresetId) ?? presets[0] ?? null;

  const initialCenter: [number, number] = selectedPreset
    ? [selectedPreset.coordinates.lat, selectedPreset.coordinates.lon]
    : [20.5937, 78.9629]; // centre of India

  // Fly-to target — prefer live analysis result, fall back to selected preset
  const flyTarget = analysisResult
    ? {
        lat: analysisResult.location.latitude,
        lon: analysisResult.location.longitude,
        buf: selectedPreset?.bufferDegrees ?? 0.025,
      }
    : selectedPreset
    ? {
        lat: selectedPreset.coordinates.lat,
        lon: selectedPreset.coordinates.lon,
        buf: selectedPreset.bufferDegrees,
      }
    : null;

  // Bounding box rectangle
  const bbox: [[number, number], [number, number]] | null = analysisResult
    ? (() => {
        const b = selectedPreset?.bufferDegrees ?? 0.025;
        const lat = analysisResult.location.latitude;
        const lon = analysisResult.location.longitude;
        return [
          [lat - b, lon - b],
          [lat + b, lon + b],
        ];
      })()
    : null;

  // Extra nearby boxes shown for demo purposes (seeded from lat/lon so stable)
  const extraBoxes: [[number, number], [number, number]][] = analysisResult
    ? (() => {
        const b = selectedPreset?.bufferDegrees ?? 0.025;
        const lat = analysisResult.location.latitude;
        const lon = analysisResult.location.longitude;
        const sz = b * 0.7; // slightly smaller boxes
        return [
          // North-east cluster
          [[lat + b * 0.9, lon + b * 1.1], [lat + b * 0.9 + sz, lon + b * 1.1 + sz]],
          // South-west cluster
          [[lat - b * 1.5, lon - b * 1.3], [lat - b * 1.5 + sz, lon - b * 1.3 + sz]],
          // North-west cluster
          [[lat + b * 0.6, lon - b * 1.6], [lat + b * 0.6 + sz, lon - b * 1.6 + sz]],
        ] as [[number, number], [number, number]][];
      })()
    : [];

  return (
    <MapContainer
      center={initialCenter}
      zoom={5}
      style={{ width: "100%", height: "100%" }}
      zoomControl={false}
      attributionControl={true}
      className="z-0"
    >
      {/* OSM tile layer */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />

      {/* Fly to selected location */}
      {flyTarget ? (
        <FlyTo lat={flyTarget.lat} lon={flyTarget.lon} bufferDeg={flyTarget.buf} />
      ) : null}

      {/* Preset markers */}
      {presets.map((preset) => {
        const isSelected = preset.id === selectedPresetId;
        return (
          <Marker
            key={preset.id}
            position={[preset.coordinates.lat, preset.coordinates.lon]}
            icon={makePresetIcon(isSelected)}
            eventHandlers={{
              click: () => onPresetClick?.(preset.id),
            }}
            zIndexOffset={isSelected ? 600 : 200}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-semibold text-slate-900">{preset.label}</p>
                <p className="text-slate-600">{preset.country}</p>
                <p className="mt-1 text-slate-500">{preset.description}</p>
                <p className="mt-1 text-[10px] text-slate-400">
                  {preset.coordinates.lat.toFixed(4)},{" "}
                  {preset.coordinates.lon.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Analysis result — accent marker + bounding box */}
      {analysisResult ? (
        <>
          <Marker
            position={[
              analysisResult.location.latitude,
              analysisResult.location.longitude,
            ]}
            icon={makeAnalysisIcon()}
            zIndexOffset={1000}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-semibold text-slate-900">
                  {analysisResult.location.name}
                </p>
                <p className="text-slate-600">
                  {analysisResult.statistics.change_percentage.toFixed(2)}%
                  changed · {analysisResult.statistics.severity}
                </p>
                <p className="mt-1 text-slate-500">
                  {analysisResult.statistics.changed_area_sq_km.toFixed(3)} km²
                </p>
              </div>
            </Popup>
          </Marker>

          {bbox ? (
            <Rectangle
              bounds={bbox}
              className="bbox-flash"
              pathOptions={{
                color: "#dc2626",
                weight: 2.5,
                fillColor: "#0a0a0a",
                fillOpacity: 0.35,
                dashArray: "6 4",
              }}
            />
          ) : null}

          {/* Extra nearby activity boxes */}
          {extraBoxes.map((bounds, i) => (
            <Rectangle
              key={`extra-${i}`}
              className="bbox-flash"
              bounds={bounds}
              pathOptions={{
                color: "#dc2626",
                weight: 2,
                fillColor: "#0a0a0a",
                fillOpacity: 0.28,
                dashArray: "5 4",
              }}
            />
          ))}
        </>
      ) : null}
    </MapContainer>
  );
}
