import { useState, useRef, useEffect } from "react";
import L from "leaflet";
import imgBike from "@/imports/DestinationNavigation/cb0afd1c8831cacec947b71a1ac0f19474ebe314.png";
import imgMilk from "@/imports/Map501WestboundSelected-2/e8d0b21b247328a8e92836e60bd74ba4fda1cb94.png";

const TORONTO: [number, number] = [43.6532, -79.3832];
const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 844;
type LocationStatus = "locating" | "ready" | "denied" | "unavailable" | "timeout";

interface LeafletMapProps {
  center: [number, number];
  zoom: number;
  userPos: [number, number] | null;
  locationStatus?: LocationStatus;
  stops?: NearbyStop[];
  routeLine?: [number, number][];
  destinationPos?: [number, number];
  transitMarkers?: Array<{
    pos: [number, number];
    mode: "BUS" | "STREETCAR" | "SUBWAY" | "TRANSIT";
    label: string;
  }>;
  selectedStopId?: string;
  onSelectStop?: (id: string) => void;
  onMoveEnd?: (center: [number, number]) => void;
  className?: string;
}

/** Pure-DOM Leaflet map — no react-leaflet context, works with any React version */
function LeafletMap({ center, zoom, userPos, locationStatus, stops, routeLine, destinationPos, transitMarkers, selectedStopId, onSelectStop, onMoveEnd, className }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const transitMarkersRef = useRef<L.Marker[]>([]);
  const skipNextMoveEndRef = useRef(false);

  // Boot the map once
  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

    map.on("moveend", () => {
      if (skipNextMoveEndRef.current) {
        skipNextMoveEndRef.current = false;
        return;
      }

      const nextCenter = map.getCenter();
      onMoveEnd?.([nextCenter.lat, nextCenter.lng]);
    });

    // Stop markers render in a separate effect so async nearby stops can update.
    if (false && stops) {
      stops.forEach(s => {
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:28px;height:28px;background:white;border:2px solid #555;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 5px rgba(0,0,0,0.3);font-size:14px;line-height:1">🚌</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const marker = L.marker(s.pos, { icon }).addTo(map);
        marker.bindTooltip(s.name, { permanent: false, direction: "top", offset: [0, -16] });
        if (onSelectStop) {
          marker.on("click", () => onSelectStop(s.stopId));
        }
      });
    }

    return () => { map.remove(); mapRef.current = null; };
  }, []);                                       // eslint-disable-line react-hooks/exhaustive-deps

  // Recenter when center changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentCenter = map.getCenter();
    const alreadyCentered =
      Math.abs(currentCenter.lat - center[0]) < 0.00001 &&
      Math.abs(currentCenter.lng - center[1]) < 0.00001 &&
      map.getZoom() === zoom;

    if (alreadyCentered) return;

    skipNextMoveEndRef.current = true;
    map.setView(center, zoom, { animate: false });
  }, [center[0], center[1], zoom]);             // eslint-disable-line react-hooks/exhaustive-deps

  // User location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    userMarkerRef.current?.remove();
    if (userPos) {
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;background:#007AFF;border:2.5px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(0,122,255,0.2)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      userMarkerRef.current = L.marker(userPos, { icon }).addTo(map);
      userMarkerRef.current.bindTooltip("You are here", { permanent: false, direction: "top" });
    }
  }, [userPos]);

  // Stop markers update after nearby stops load or the map center changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    stopMarkersRef.current.forEach(marker => marker.remove());
    stopMarkersRef.current = [];

    stops?.forEach(s => {
      const selected = s.stopId === selectedStopId;
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:${selected ? 36 : 30}px;height:${selected ? 36 : 30}px;background:${selected ? "#FFD84D" : "#fff"};border:${selected ? 3 : 2}px solid #1D1B20;border-radius:9px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.28);transform:${selected ? "translate(-3px,-3px)" : "none"}"><svg width="17" height="17" viewBox="0 0 16 19" aria-hidden="true"><path d="${P.bus}" fill="#1D1B20"/></svg></div>`,
        iconSize: selected ? [36, 36] : [30, 30],
        iconAnchor: selected ? [18, 18] : [15, 15],
      });
      const marker = L.marker(s.pos, { icon }).addTo(map);
      marker.bindTooltip(s.name, { permanent: false, direction: "top", offset: [0, -18] });
      if (onSelectStop) {
        marker.on("click", event => {
          L.DomEvent.stopPropagation(event);
          onSelectStop(s.stopId);
        });
      }
      stopMarkersRef.current.push(marker);
    });

    return () => {
      stopMarkersRef.current.forEach(marker => marker.remove());
      stopMarkersRef.current = [];
    };
  }, [stops, selectedStopId, onSelectStop]);

  // Navigation route line
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    routeLineRef.current?.remove();
    routeLineRef.current = null;

    if (routeLine && routeLine.length > 1) {
      routeLineRef.current = L.polyline(routeLine, {
        color: "#007AFF",
        weight: 5,
        opacity: 0.9,
      }).addTo(map);
    }

    return () => {
      routeLineRef.current?.remove();
      routeLineRef.current = null;
    };
  }, [routeLine]);

  // Destination marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    destinationMarkerRef.current?.remove();
    destinationMarkerRef.current = null;

    if (destinationPos) {
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35))"><svg width="30" height="34" viewBox="0 0 18 21" aria-hidden="true"><path d="${P.pinFill}" fill="#E53935"/><circle cx="8.7" cy="7.2" r="3.1" fill="white"/></svg></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 31],
      });
      destinationMarkerRef.current = L.marker(destinationPos, { icon }).addTo(map);
      destinationMarkerRef.current.bindTooltip("Destination", { permanent: false, direction: "top", offset: [0, -28] });
    }

    return () => {
      destinationMarkerRef.current?.remove();
      destinationMarkerRef.current = null;
    };
  }, [destinationPos]);

  // Route transit stop/station markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    transitMarkersRef.current.forEach(marker => marker.remove());
    transitMarkersRef.current = [];

    (transitMarkers ?? []).forEach(marker => {
      const isSubway = marker.mode === "SUBWAY";
      const glyph = isSubway
        ? `<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="3" y="2" width="14" height="14" rx="3" stroke="#1D1B20" stroke-width="2"/><path d="M6.5 6.5H13.5M6.5 10H13.5" stroke="#1D1B20" stroke-linecap="round" stroke-width="2"/><circle cx="7" cy="13.5" r="1.1" fill="#1D1B20"/><circle cx="13" cy="13.5" r="1.1" fill="#1D1B20"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="${P.bus}" stroke="#1D1B20" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:30px;height:30px;border-radius:15px;background:white;border:2px solid #1D1B20;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 5px rgba(0,0,0,0.25)">${glyph}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      const leafletMarker = L.marker(marker.pos, { icon }).addTo(map);
      leafletMarker.bindTooltip(marker.label, { permanent: false, direction: "top", offset: [0, -14] });
      transitMarkersRef.current.push(leafletMarker);
    });

    return () => {
      transitMarkersRef.current.forEach(marker => marker.remove());
      transitMarkersRef.current = [];
    };
  }, [transitMarkers]);

  const locationLabel =
    locationStatus === "locating" ? "Locating..."
      : locationStatus === "denied" ? "Location permission denied"
      : locationStatus === "timeout" ? "Location timeout"
      : locationStatus === "unavailable" ? "Location unavailable"
      : null;

  return (
    <div className={`relative ${className ?? ""}`} style={{ height: "100%", width: "100%" }}>
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
      {locationLabel && !userPos && (
        <div className="absolute right-2 top-2 z-[1001] rounded-full bg-white/95 px-2.5 py-1 text-[11px] text-[#585858] shadow-sm">
          {locationLabel}
        </div>
      )}
    </div>
  );
}

// ─── SVG path data ────────────────────────────────────────────────────────────

const P = {
  bus: "M2 19C1.71667 19 1.47917 18.9042 1.2875 18.7125C1.09583 18.5208 1 18.2833 1 18V15.95C0.7 15.6167 0.458333 15.2458 0.275 14.8375C0.0916667 14.4292 0 13.9833 0 13.5V4C0 2.61667 0.641667 1.60417 1.925 0.9625C3.20833 0.320833 5.23333 0 8 0C10.8667 0 12.9167 0.308333 14.15 0.925C15.3833 1.54167 16 2.56667 16 4V13.5C16 13.9833 15.9083 14.4292 15.725 14.8375C15.5417 15.2458 15.3 15.6167 15 15.95V18C15 18.2833 14.9042 18.5208 14.7125 18.7125C14.5208 18.9042 14.2833 19 14 19H13C12.7167 19 12.4792 18.9042 12.2875 18.7125C12.0958 18.5208 12 18.2833 12 18V17H4V18C4 18.2833 3.90417 18.5208 3.7125 18.7125C3.52083 18.9042 3.28333 19 3 19H2ZM2 8H14V5H2V8ZM4.5 14C4.91667 14 5.27083 13.8542 5.5625 13.5625C5.85417 13.2708 6 12.9167 6 12.5C6 12.0833 5.85417 11.7292 5.5625 11.4375C5.27083 11.1458 4.91667 11 4.5 11C4.08333 11 3.72917 11.1458 3.4375 11.4375C3.14583 11.7292 3 12.0833 3 12.5C3 12.9167 3.14583 13.2708 3.4375 13.5625C3.72917 13.8542 4.08333 14 4.5 14ZM11.5 14C11.9167 14 12.2708 13.8542 12.5625 13.5625C12.8542 13.2708 13 12.9167 13 12.5C13 12.0833 12.8542 11.7292 12.5625 11.4375C12.2708 11.1458 11.9167 11 11.5 11C11.0833 11 10.7292 11.1458 10.4375 11.4375C10.1458 11.7292 10 12.0833 10 12.5C10 12.9167 10.1458 13.2708 10.4375 13.5625C10.7292 13.8542 11.0833 14 11.5 14ZM2.45 3H13.65C13.4 2.71667 12.8625 2.47917 12.0375 2.2875C11.2125 2.09583 9.88333 2 8.05 2C6.26667 2 4.9625 2.10417 4.1375 2.3125C3.3125 2.52083 2.75 2.75 2.45 3ZM4 15H12C12.55 15 13.0208 14.8042 13.4125 14.4125C13.8042 14.0208 14 13.55 14 13V10H2V13C2 13.55 2.19583 14.0208 2.5875 14.4125C2.97917 14.8042 3.45 15 4 15Z",
  cloud: "M18.256 7.25H16.996C16.6218 5.801 15.8488 4.48599 14.7646 3.4544C13.6805 2.4228 12.3287 1.71599 10.8629 1.41428C9.3971 1.11256 7.87607 1.22804 6.47262 1.74759C5.06918 2.26714 3.83961 3.16994 2.92362 4.35338C2.00763 5.53683 1.44196 6.95348 1.29088 8.44235C1.13979 9.93123 1.40936 11.4326 2.06895 12.776C2.72853 14.1193 3.75169 15.2507 5.02215 16.0416C6.29262 16.8324 7.75945 17.2511 9.25597 17.25H18.256C19.5821 17.25 20.8538 16.7232 21.7915 15.7855C22.7292 14.8479 23.256 13.5761 23.256 12.25C23.256 10.9239 22.7292 9.65215 21.7915 8.71447C20.8538 7.77678 19.5821 7.25 18.256 7.25Z",
  traffic: "M8 15.35V9.65L9.4 5.65C9.48333 5.46667 9.6 5.31667 9.75 5.2C9.91667 5.06667 10.1167 5 10.35 5H17.65C17.8833 5 18.0833 5.06667 18.25 5.2C18.4167 5.31667 18.5333 5.46667 18.6 5.65L20 9.65V15.35C20 15.5333 19.9333 15.6917 19.8 15.825C19.6833 15.9417 19.5333 16 19.35 16H18.65C18.4667 16 18.3083 15.9417 18.175 15.825C18.0583 15.6917 18 15.5333 18 15.35V14.5H10V15.35C10 15.5333 9.93333 15.6917 9.8 15.825C9.68333 15.9417 9.53333 16 9.35 16H8.65C8.46667 16 8.30833 15.9417 8.175 15.825C8.05833 15.6917 8 15.5333 8 15.35ZM10 8.5H18L17.3 6.5H10.7L10 8.5ZM9.5 10V13V10ZM11 12.5C11.2833 12.5 11.5167 12.4083 11.7 12.225C11.9 12.025 12 11.7833 12 11.5C12 11.2167 11.9 10.9833 11.7 10.8C11.5167 10.6 11.2833 10.5 11 10.5C10.7167 10.5 10.475 10.6 10.275 10.8C10.0917 10.9833 10 11.2167 10 11.5C10 11.7833 10.0917 12.025 10.275 12.225C10.475 12.4083 10.7167 12.5 11 12.5ZM17 12.5C17.2833 12.5 17.5167 12.4083 17.7 12.225C17.9 12.025 18 11.7833 18 11.5C18 11.2167 17.9 10.9833 17.7 10.8C17.5167 10.6 17.2833 10.5 17 10.5C16.7167 10.5 16.475 10.6 16.275 10.8C16.0917 10.9833 16 11.2167 16 11.5C16 11.7833 16.0917 12.025 16.275 12.225C16.475 12.4083 16.7167 12.5 17 12.5ZM2 16V15L3 14C2.16667 14 1.45833 13.7083 0.875 13.125C0.291667 12.5417 0 11.8333 0 11V3C0 1.9 0.491667 1.125 1.475 0.675C2.45833 0.225 4.13333 0 6.5 0C8.96667 0 10.6667 0.216667 11.6 0.65C12.5333 1.08333 13 1.86667 13 3V4H11V3H2V9H7V16H2ZM3 12C3.28333 12 3.51667 11.9083 3.7 11.725C3.9 11.525 4 11.2833 4 11C4 10.7167 3.9 10.4833 3.7 10.3C3.51667 10.1 3.28333 10 3 10C2.71667 10 2.475 10.1 2.275 10.3C2.09167 10.4833 2 10.7167 2 11C2 11.2833 2.09167 11.525 2.275 11.725C2.475 11.9083 2.71667 12 3 12ZM9.5 13H18.5V10H9.5V13Z",
  walk: "M1 21.5L3.8 7.4L2 8.1V11.5H0V6.8L5.05 4.65C5.28333 4.55 5.52917 4.49167 5.7875 4.475C6.04583 4.45833 6.29167 4.49167 6.525 4.575C6.75833 4.65833 6.97917 4.775 7.1875 4.925C7.39583 5.075 7.56667 5.26667 7.7 5.5L8.7 7.1C9.13333 7.8 9.72083 8.375 10.4625 8.825C11.2042 9.275 12.05 9.5 13 9.5V11.5C11.8333 11.5 10.7917 11.2583 9.875 10.775C8.95833 10.2917 8.175 9.675 7.525 8.925L6.9 12L9 14V21.5H7V15L4.9 13.4L3.1 21.5H1ZM7.5 4C6.95 4 6.47917 3.80417 6.0875 3.4125C5.69583 3.02083 5.5 2.55 5.5 2C5.5 1.45 5.69583 0.979167 6.0875 0.5875C6.47917 0.195833 6.95 0 7.5 0C8.05 0 8.52083 0.195833 8.9125 0.5875C9.30417 0.979167 9.5 1.45 9.5 2C9.5 2.55 9.30417 3.02083 8.9125 3.4125C8.52083 3.80417 8.05 4 7.5 4Z",
  construction: "M4 11V3.825L1.425 6.4L0 5L5 0L10 5L8.575 6.4L6 3.825V11H4ZM11 20L6 15L7.425 13.6L10 16.175V9H12V16.175L14.575 13.6L16 15L11 20Z",
  star: "M6.85 14.825L10 12.925L13.15 14.85L12.325 11.25L15.1 8.85L11.45 8.525L10 5.125L8.55 8.5L4.9 8.825L7.675 11.25L6.85 14.825ZM3.825 19L5.45 11.975L0 7.25L7.2 6.625L10 0L12.8 6.625L20 7.25L14.55 11.975L16.175 19L10 15.275L3.825 19Z",
  close: "M1.4 14L0 12.6L5.6 7L0 1.4L1.4 0L7 5.6L12.6 0L14 1.4L8.4 7L14 12.6L12.6 14L7 8.4L1.4 14Z",
  pin: "M8 19.6C5.86667 17.7 4.25 15.9708 3.15 14.4125C2.05 12.8542 1.5 11.4 1.5 10.05C1.5 7.95 2.20417 6.22917 3.6125 4.8875C5.02083 3.54583 6.68333 2.875 8.6 2.875C10.5167 2.875 12.1792 3.54583 13.5875 4.8875C14.9958 6.22917 15.7 7.95 15.7 10.05C15.7 11.4 15.15 12.8542 14.05 14.4125C12.95 15.9708 11.3333 17.7 9.2 19.6H8ZM8.6 12.5C9.36667 12.5 10.025 12.2333 10.575 11.7C11.125 11.1667 11.4 10.5167 11.4 9.75C11.4 8.98333 11.125 8.325 10.575 7.775C10.025 7.225 9.36667 6.95 8.6 6.95C7.83333 6.95 7.17083 7.225 6.6125 7.775C6.05417 8.325 5.775 8.98333 5.775 9.75C5.775 10.5167 6.05417 11.1667 6.6125 11.7C7.17083 12.2333 7.83333 12.5 8.6 12.5Z",
  pinFill: "M8 0C5.6 0 3.6 0.85 1.975 2.55C0.658333 3.91667 0 5.51667 0 7.35C0 8.61667 0.35 9.89167 1.05 11.175C1.75 12.4583 2.59167 13.6583 3.575 14.775C4.55833 15.8917 5.525 16.8833 6.475 17.75C7.425 18.6167 8.15833 19.3333 8.675 19.9C9.19167 19.3333 9.925 18.6167 10.875 17.75C11.825 16.8833 12.7917 15.8917 13.775 14.775C14.7583 13.6583 15.5917 12.4583 16.275 11.175C16.9583 9.89167 17.3 8.61667 17.3 7.35C17.3 5.51667 16.6583 3.91667 15.375 2.55C13.75 0.85 11.75 0 9.35 0H8ZM8.675 10C7.90833 10 7.25 9.725 6.7 9.175C6.15 8.625 5.875 7.96667 5.875 7.2C5.875 6.43333 6.15 5.775 6.7 5.225C7.25 4.675 7.90833 4.4 8.675 4.4C9.44167 4.4 10.1 4.675 10.65 5.225C11.2 5.775 11.475 6.43333 11.475 7.2C11.475 7.96667 11.2 8.625 10.65 9.175C10.1 9.725 9.44167 10 8.675 10Z",
  car: "M16.5 13C16.5 13.4 16.35 13.7417 16.05 14.025C15.75 14.3083 15.3833 14.45 14.95 14.45H3.05C2.61667 14.45 2.25 14.3083 1.95 14.025C1.65 13.7417 1.5 13.4 1.5 13V6.5C1.5 5.16667 1.90833 4.04167 2.725 3.125C3.54167 2.20833 4.575 1.75 5.825 1.75H12.175C13.425 1.75 14.4583 2.20833 15.275 3.125C16.0917 4.04167 16.5 5.16667 16.5 6.5V13ZM4.375 10.275C4.65833 10.275 4.9 10.175 5.1 9.975C5.3 9.775 5.4 9.525 5.4 9.225C5.4 8.94167 5.3 8.7 5.1 8.5C4.9 8.3 4.65833 8.2 4.375 8.2C4.09167 8.2 3.85 8.3 3.65 8.5C3.45 8.7 3.35 8.94167 3.35 9.225C3.35 9.525 3.45 9.775 3.65 9.975C3.85 10.175 4.09167 10.275 4.375 10.275ZM13.625 10.275C13.9083 10.275 14.15 10.175 14.35 9.975C14.55 9.775 14.65 9.525 14.65 9.225C14.65 8.94167 14.55 8.7 14.35 8.5C14.15 8.3 13.9083 8.2 13.625 8.2C13.3417 8.2 13.1 8.3 12.9 8.5C12.7 8.7 12.6 8.94167 12.6 9.225C12.6 9.525 12.7 9.775 12.9 9.975C13.1 10.175 13.3417 10.275 13.625 10.275ZM3.25 6.75H14.75L13.825 3.925C13.7083 3.625 13.5167 3.38333 13.25 3.2C12.9833 3.01667 12.6917 2.925 12.375 2.925H5.625C5.30833 2.925 5.01667 3.01667 4.75 3.2C4.48333 3.38333 4.29167 3.625 4.175 3.925L3.25 6.75Z",
  dots: "M1.83333 1C1.83333 1.51667 1.64583 1.95833 1.27083 2.325C0.895833 2.69167 0.45 2.875 -0.0833333 2.875C-0.616667 2.875 -1.0625 2.69167 -1.4375 2.325C-1.8125 1.95833 -2 1.51667 -2 1C-2 0.483333 -1.8125 0.041667 -1.4375 -0.325C-1.0625 -0.691667 -0.616667 -0.875 -0.0833333 -0.875C0.45 -0.875 0.895833 -0.691667 1.27083 -0.325C1.64583 0.041667 1.83333 0.483333 1.83333 1Z",
  arrowUpRight: "M0.625 11.875L10 2.5M10 2.5H2.5M10 2.5V10",
  chevronDown: "M0.8 0.8L4.8 4.8L8.8 0.8",
};

function fmt(v: number) {
  if (v === 0) return "±0";
  return v > 0 ? `+${v}` : `${v}`;
}

import {
  getStopMeta, searchStops, searchDestinations, getNearbyStops,
  getPrediction, getBusReport as apiBusReport, getNavigationRoute, askTransitAssistant,
  type Prediction, type BusReport as BusReportData, type NavigationRoute,
  type NearbyStop, type TransitAssistantContext, type NavigationMode,
} from "@/api/ttc";
import {
  getCurrentWeather,
  type CurrentWeather,
} from "@/api/weather";
import {
  getTrafficImpact,
  type TrafficImpact,
} from "@/api/traffic";
import {
  getConstructionImpact,
  type ConstructionImpact,
} from "@/api/construction";

function estimateWeatherDelay(weather: CurrentWeather): number {
  const condition = weather.condition.toLowerCase();
  let delay = 0;

  if (condition.includes("rain") || condition.includes("drizzle")) delay += 2;
  if (condition.includes("snow") || condition.includes("sleet") || condition.includes("ice")) delay += 3;
  if (condition.includes("thunder") || condition.includes("storm")) delay += 4;
  if (condition.includes("fog") || condition.includes("mist") || condition.includes("overcast")) delay += 1;
  if ((weather.precipitationMm ?? 0) >= 2) delay += 2;
  else if ((weather.precipitationMm ?? 0) > 0) delay += 1;
  if (weather.windKph >= 45) delay += 2;
  else if (weather.windKph >= 30) delay += 1;

  return Math.min(delay, 6);
}

function describeWeatherDelay(weather: CurrentWeather, delay: number): string {
  const source = weather.source === "weatherapi" ? "WeatherAPI" : "mock weather data";

  if (delay === 0) {
    return `${source} reports ${weather.condition.toLowerCase()}, ${weather.temperatureC} C, wind ${weather.windKph} km/h. No weather delay is expected.`;
  }

  return `${source} reports ${weather.condition.toLowerCase()}, ${weather.temperatureC} C, wind ${weather.windKph} km/h. Current conditions may add about ${delay} min to this trip.`;
}

function describeTrafficDelay(impact: TrafficImpact, key: "traffic" | "accident" | "construction") {
  const event = impact.events.find(item => item.type === key || (key === "accident" && item.type === "accident"));

  if (event) {
    return `${event.title}. ${event.description}`;
  }

  if (key === "traffic") return "Traffic is normal, no additional delay expected.";
  if (key === "accident") return "No traffic incidents are reported near this route.";
  return "No construction activity is reported near this route.";
}

function describeConstructionDelay(impact: ConstructionImpact) {
  const event = impact.events[0];

  if (!event) {
    return impact.source === "geojson"
      ? "No nearby road reconstruction projects are listed in the static dataset."
      : "No construction dataset is configured yet.";
  }

  return `${event.title}. ${event.description} (${event.distanceKm.toFixed(1)} km away).`;
}

function estimateConfidenceFromFactors(factors: BusReportData["factors"]) {
  const variableDelay = Object.values(factors)
    .reduce((total, factor) => total + Math.abs(factor.value), 0);

  return Math.max(62, Math.min(94, 94 - variableDelay * 4));
}

// ─── Shared loading skeleton ──────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-[#e5e5e5] animate-pulse rounded ${className}`} />;
}

// ─── Icon components ──────────────────────────────────────────────────────────

const BusIcon = ({ fill = "#1D1B20" }: { fill?: string }) => (
  <svg className="block size-full" fill="none" viewBox="0 0 16 19">
    <path d={P.bus} fill={fill} />
  </svg>
);

const SubwayIcon = ({ fill = "#1D1B20" }: { fill?: string }) => (
  <svg className="block size-full" fill="none" viewBox="0 0 20 20">
    <rect x="3" y="2" width="14" height="14" rx="3" stroke={fill} strokeWidth="2" />
    <path d="M6.5 6.5H13.5M6.5 10H13.5" stroke={fill} strokeLinecap="round" strokeWidth="2" />
    <circle cx="7" cy="13.5" r="1.1" fill={fill} />
    <circle cx="13" cy="13.5" r="1.1" fill={fill} />
    <path d="M7 18H13" stroke={fill} strokeLinecap="round" strokeWidth="2" />
  </svg>
);

const CloudIcon = () => (
  <svg className="block size-full" fill="none" viewBox="0 0 24.506 18.5">
    <path d={P.cloud} stroke="#1E1E1E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
  </svg>
);

const TrafficIcon = () => (
  <svg className="block size-full" fill="none" viewBox="0 0 20 16">
    <path d={P.traffic} fill="#1D1B20" />
  </svg>
);

const WalkIcon = ({ fill = "#1D1B20" }: { fill?: string }) => (
  <svg className="block size-full" fill="none" viewBox="0 0 13 21.5">
    <path d={P.walk} fill={fill} />
  </svg>
);

const ConstructionIcon = () => (
  <svg className="block size-full" fill="none" viewBox="0 0 16 20">
    <path d={P.construction} fill="#1D1B20" />
  </svg>
);

const StarIcon = () => (
  <svg className="block size-full" fill="none" viewBox="0 0 20 19">
    <path d={P.star} fill="#1D1B20" />
  </svg>
);

const CloseIcon = ({ fill = "#1D1B20" }: { fill?: string }) => (
  <svg className="block size-full" fill="none" viewBox="0 0 14 14">
    <path d={P.close} fill={fill} />
  </svg>
);

const PinIcon = ({ fill = "#1D1B20" }: { fill?: string }) => (
  <svg className="block size-full" fill="none" viewBox="0 0 16 20">
    <path d={P.pin} fill={fill} />
  </svg>
);

const CarIcon = ({ fill = "#1D1B20" }: { fill?: string }) => (
  <svg className="block size-full" fill="none" viewBox="0 0 18 16">
    <path d={P.car} fill={fill} />
  </svg>
);

const ArrowUpRightIcon = () => (
  <svg className="block size-full" fill="none" viewBox="0 0 12.5 12.5">
    <path d={P.arrowUpRight} stroke="#1E1E1E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
  </svg>
);

interface OffsetItemProps { icon: React.ReactNode; value: number; label: string }
function OffsetItem({ icon, value, label }: OffsetItemProps) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[64px]">
      <span className="font-['Rowdies',sans-serif] text-[28px] leading-none text-[#7d7b7b]">{fmt(value)}</span>
      <div className="flex items-center gap-1">
        <div className="size-[16px] shrink-0 flex items-center justify-center">{icon}</div>
        <span className="font-['SF_Compact',system-ui,sans-serif] text-[11px] text-[#656565] whitespace-nowrap">{label}</span>
      </div>
    </div>
  );
}

function directionTextClass(label: string) {
  if (label.length > 44) {
    return "text-[10px] leading-[12px]";
  }

  if (label.length > 30) {
    return "text-[11px] leading-[13px]";
  }

  return "text-[13px] leading-[15px]";
}

// ─── Screen components ────────────────────────────────────────────────────────

// ── Search overlay ──
type SearchTarget = "general" | "origin" | "destination";
type OriginSelection = { label: string; pos: [number, number] };

interface SearchOverlayProps {
  query: string;
  target: SearchTarget;
  currentLocation: OriginSelection | null;
  onQueryChange: (q: string) => void;
  onClose: () => void;
  onSelectStop: (id: string) => void;
  onSelectDest: (id: string) => void;
  onSelectOrigin: (origin: OriginSelection) => void;
  onSelectCurrentLocation: () => void;
}
function SearchOverlay({ query, target, currentLocation, onQueryChange, onClose, onSelectStop, onSelectDest, onSelectOrigin, onSelectCurrentLocation }: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  type Row = { id: string; type: "stop" | "dest"; title: string; subtitle: string; distance: string; pos?: [number, number] };
  const [results, setResults] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return () => { cancelled = true; };
    }

    setLoading(true);
    const searchPromise = target === "destination"
      ? Promise.all([Promise.resolve([]), searchDestinations(query)])
      : Promise.all([searchStops(query), searchDestinations(query)]);

    searchPromise.then(([stops, dests]) => {
      if (cancelled) return;
      const rows: Row[] = [
        ...stops.map(s => ({ id: s.id, type: "stop" as const, title: s.name, subtitle: s.routes, distance: s.distance, pos: s.pos })),
        ...dests.map(d => ({ id: d.id, type: "dest" as const, title: d.name, subtitle: d.address, distance: d.distance, pos: d.pos })),
      ];
      setResults(rows);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) {
        setResults([]);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [query, target]);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="h-[52px] shrink-0" />
      <div className="px-[19px] shrink-0 flex items-center gap-2">
        <div className="bg-[rgba(120,120,128,0.16)] rounded-full flex-1 h-[44px] flex items-center px-[11px] gap-2">
          <span className="text-[#727272] text-[17px]">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder="AI Search a destination or a stop"
            className="flex-1 bg-transparent text-[17px] text-[#1a1a1a] tracking-[-0.08px] outline-none font-['SF_Compact',system-ui,sans-serif] placeholder:text-[#727272]"
          />
          {query.length > 0 && (
            <button onClick={() => onQueryChange("")} className="size-[18px] flex items-center justify-center opacity-60">
              <CloseIcon />
            </button>
          )}
        </div>
        <button onClick={onClose} className="text-[#007AFF] font-['SF_Compact',system-ui,sans-serif] text-[17px] whitespace-nowrap pl-1">Cancel</button>
      </div>

      <div className="flex-1 overflow-y-auto mt-2">
        {loading ? (
          <div className="flex flex-col gap-1 px-4 pt-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[49px] w-full" />)}
          </div>
        ) : (
          <>
            {target === "origin" && currentLocation && (
              <button
                onClick={onSelectCurrentLocation}
                className="w-full flex items-start gap-3 px-4 py-3 border-b border-[#c7c7c7] bg-white hover:bg-gray-50 text-left"
              >
                <div className="size-[24px] shrink-0 mt-0.5"><PinIcon fill="#007AFF" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-['SF_Compact',system-ui,sans-serif] text-[17px] text-[#007AFF] tracking-[-0.08px] truncate">Your location</p>
                  <p className="font-['SF_Compact',system-ui,sans-serif] text-[12px] text-[#858585] tracking-[-0.08px] truncate">Use current GPS location</p>
                </div>
              </button>
            )}
            {results.map(r => (
              <button
                key={r.id}
                onClick={() => {
                  if (target === "origin" && r.pos) {
                    onSelectOrigin({ label: r.title.replace(/^(bus stop|destination):\s*/i, ""), pos: r.pos });
                    return;
                  }
                  r.type === "stop" ? onSelectStop(r.id) : onSelectDest(r.id);
                }}
                className="w-full flex items-start gap-3 px-4 py-3 border-b border-[#c7c7c7] bg-white hover:bg-gray-50 text-left"
              >
                <div className="size-[24px] shrink-0 mt-0.5">
                  {r.type === "stop" ? <BusIcon /> : <PinIcon />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-['SF_Compact',system-ui,sans-serif] text-[17px] text-black tracking-[-0.08px] truncate">{r.title}</p>
                  <p className="font-['SF_Compact',system-ui,sans-serif] text-[12px] text-[#858585] tracking-[-0.08px] truncate">{r.subtitle}</p>
                </div>
                <div className="flex flex-col items-end shrink-0 gap-1">
                  <div className="size-[18px]"><ArrowUpRightIcon /></div>
                  <span className="font-['SF_Compact',system-ui,sans-serif] text-[12px] text-[#858585]">{r.distance}</span>
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ── Map/Prediction screen ──
interface MapScreenProps {
  stopId: string;
  showControls: boolean;
  mapCenter: [number, number];
  userPos: [number, number] | null;
  locationStatus: LocationStatus;
  onSearch: () => void;
  onOpenReport: (route: number, dir: string) => void;
  onBack: () => void;
  onSwitchToDest: () => void;
  onSelectStop: (id: string) => void;
  onMapMove: (center: [number, number]) => void;
}
function MapScreen({ stopId, showControls, mapCenter, userPos, locationStatus, onSearch, onOpenReport, onBack, onSwitchToDest, onSelectStop, onMapMove }: MapScreenProps) {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loadingPrediction, setLoadingPrediction] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [dir, setDir] = useState<string | null>(null);
  const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([]);
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [trafficImpact, setTrafficImpact] = useState<TrafficImpact | null>(null);
  const [constructionImpact, setConstructionImpact] = useState<ConstructionImpact | null>(null);

  // Bootstrap: load stop metadata, pick defaults, then fetch first prediction
  useEffect(() => {
    let cancelled = false;
    setLoadingPrediction(true);
    setPrediction(null);
    setSelectedRoute(null);
    setDir(null);

    getStopMeta(stopId).then(async meta => {
      if (cancelled) return;
      const defaultRoute = meta.routes[0];
      const defaultDir = meta.dirs[0];
      setSelectedRoute(defaultRoute);
      setDir(defaultDir);
      const pred = await getPrediction(stopId, defaultRoute, defaultDir);
      if (!cancelled) { setPrediction(pred); setLoadingPrediction(false); }
    }).catch(() => { if (!cancelled) setLoadingPrediction(false); });

    return () => { cancelled = true; };
  }, [stopId]);

  // Reload prediction when route or direction changes
  useEffect(() => {
    if (selectedRoute === null || dir === null) return;
    let cancelled = false;
    setLoadingPrediction(true);
    getPrediction(stopId, selectedRoute, dir)
      .then(p => { if (!cancelled) { setPrediction(p); setLoadingPrediction(false); } })
      .catch(() => { if (!cancelled) setLoadingPrediction(false); });
    return () => { cancelled = true; };
  }, [stopId, selectedRoute, dir]);

  // Load nearby stop markers for the map
  useEffect(() => {
    getNearbyStops(mapCenter[0], mapCenter[1]).then(setNearbyStops);
  }, [mapCenter[0], mapCenter[1]]);

  useEffect(() => {
    let cancelled = false;

    getCurrentWeather(mapCenter[0], mapCenter[1])
      .then(currentWeather => {
        if (!cancelled) setWeather(currentWeather);
      })
      .catch(() => {
        if (!cancelled) setWeather(null);
      });

    return () => { cancelled = true; };
  }, [mapCenter[0], mapCenter[1]]);

  useEffect(() => {
    if (selectedRoute === null) return;
    let cancelled = false;

    Promise.all([
      getTrafficImpact(mapCenter[0], mapCenter[1], selectedRoute).catch(() => null),
      getConstructionImpact(mapCenter[0], mapCenter[1]).catch(() => null),
    ]).then(([nextTrafficImpact, nextConstructionImpact]) => {
      if (cancelled) return;
      setTrafficImpact(nextTrafficImpact);
      setConstructionImpact(nextConstructionImpact);
    });

    return () => { cancelled = true; };
  }, [mapCenter[0], mapCenter[1], selectedRoute]);

  const routes = prediction?.routes ?? [];
  const dirs = prediction?.dirs ?? ["Westbound", "Eastbound"];
  const weatherDelay = weather ? estimateWeatherDelay(weather) : prediction?.offsets.weather;
  const trafficDelay = trafficImpact?.trafficDelayMin ?? prediction?.offsets.traffic;
  const accidentDelay = trafficImpact?.accidentDelayMin ?? prediction?.offsets.accidents;
  const constructionDelay = constructionImpact?.constructionDelayMin ?? trafficImpact?.constructionDelayMin ?? prediction?.offsets.construction;
  const displayedPrediction = prediction && weatherDelay !== undefined
    ? {
      ...prediction,
      offsets: {
        ...prediction.offsets,
        weather: weatherDelay,
        traffic: trafficDelay ?? prediction.offsets.traffic,
        accidents: accidentDelay ?? prediction.offsets.accidents,
        construction: constructionDelay ?? prediction.offsets.construction,
      },
    }
    : prediction;

  return (
    <div className="bg-white flex flex-col min-h-full">
      <div className="h-[52px] shrink-0" />
      {/* Search bar */}
      <div className="px-[19px] shrink-0">
        <button
          onClick={onSearch}
          className="bg-[rgba(120,120,128,0.16)] rounded-full h-[44px] w-full flex items-center px-[11px] gap-2 text-left"
        >
          <span className="text-[#727272] text-[17px]">🔍</span>
          <span className="font-['SF_Compact',system-ui,sans-serif] text-[#727272] text-[17px] tracking-[-0.08px]">
            AI Search a destination or a stop
          </span>
        </button>
      </div>

      {/* Map */}
      <div className="px-[19px] mt-[11px] shrink-0">
        <div className="rounded-[12px] overflow-hidden h-[280px] w-full">
          <LeafletMap
            center={mapCenter}
            zoom={15}
            userPos={userPos}
            locationStatus={locationStatus}
            stops={nearbyStops}
            selectedStopId={stopId}
            onSelectStop={onSelectStop}
            onMoveEnd={center => {
              onMapMove(center);
              getNearbyStops(center[0], center[1]).then(setNearbyStops);
            }}
          />
        </div>
      </div>

      {/* Close + Switch mode buttons — only on search result pages */}
      {showControls && (
        <div className="px-[19px] mt-[8px] flex items-center justify-between shrink-0">
          <button onClick={onBack} className="size-[30px] bg-white rounded-full flex items-center justify-center shadow-sm cursor-pointer shrink-0" aria-label="Back">
            <div className="size-[14px]"><CloseIcon /></div>
          </button>
          <button onClick={onSwitchToDest} className="bg-white rounded-[10px] h-[30px] px-3 flex items-center cursor-pointer shadow-sm">
            <span className="font-['SF_Compact',system-ui,sans-serif] text-[13px] text-[#585858] tracking-[-0.08px] whitespace-nowrap">switch to destination search</span>
          </button>
        </div>
      )}

      {/* Bottom panel */}
      <div className={`px-[19px] ${showControls ? "mt-[6px]" : "mt-[10px]"} pb-4 flex-1`}>
        <div className="bg-[#d9d9d9] rounded-[20px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] w-full overflow-hidden">
          {/* Bus carousel */}
          <div className="px-[11px] pt-[11px]">
            <div className="flex gap-[24px] overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {routes.length === 0
                ? [1, 2, 3].map(i => <Skeleton key={i} className="shrink-0 size-[100px] rounded-[20px]" />)
                : routes.map(r => (
                  <button
                    key={r}
                    onClick={() => setSelectedRoute(r)}
                    className={`shrink-0 size-[100px] rounded-[20px] flex items-center justify-center cursor-pointer transition-colors ${r === selectedRoute ? "bg-white" : "bg-[#aaa]"}`}
                  >
                    <span className={`font-['Rowdies',sans-serif] text-[40px] leading-none tracking-[-0.08px] ${r === selectedRoute ? "text-[#4f4f4f]" : "text-white"}`}>{r}</span>
                  </button>
                ))}
            </div>
          </div>

          {/* Direction tabs */}
          <div className="flex px-[11px] mt-1">
            {dirs.map(d => (
              <button
                key={d}
                onClick={() => setDir(d)}
                className={`flex-1 h-[52px] min-w-0 rounded-tl-[20px] rounded-tr-[20px] flex items-center justify-center cursor-pointer transition-colors px-2 ${dir === d ? "bg-white" : "bg-[#aaa]"}`}
              >
                <span className={`font-['SF_Compact',system-ui,sans-serif] tracking-[-0.08px] text-center break-words overflow-hidden max-h-[38px] ${directionTextClass(d)} ${dir === d ? "text-[#4f4f4f]" : "text-white"}`}>
                  {d}
                </span>
              </button>
            ))}
          </div>

          {/* ETA detail panel */}
          <div className="mx-[11px] mb-[11px] bg-white rounded-bl-[20px] rounded-br-[20px] px-4 py-3">
            {loadingPrediction || !displayedPrediction ? (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-baseline">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-9 w-20" />
                </div>
                <div className="flex justify-between">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-[64px]" />)}
                </div>
                <div className="flex justify-between">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-[64px]" />)}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-baseline justify-between mb-3">
                  <span className="font-['SF_Compact',system-ui,sans-serif] text-[14px] text-black tracking-[-0.08px] flex-1 mr-2">{displayedPrediction.stopName}</span>
                  <div className="flex items-baseline gap-1 shrink-0">
                    <span className="font-['SF_Compact',system-ui,sans-serif] text-[13px] text-[#656565]">est.</span>
                    <span className="font-['Rowdies',sans-serif] text-[36px] text-[#4f4f4f] leading-none">{displayedPrediction.etaMin}</span>
                    <span className="font-['SF_Compact',system-ui,sans-serif] text-[14px] text-black">min.</span>
                  </div>
                </div>
                <div className="flex justify-between mb-3">
                  <OffsetItem icon={<BusIcon />}          value={displayedPrediction.offsets.schedule}     label="schedule" />
                  <OffsetItem icon={<CloudIcon />}         value={displayedPrediction.offsets.weather}      label="weather" />
                  <OffsetItem icon={<TrafficIcon />}       value={displayedPrediction.offsets.traffic}      label="traffic" />
                </div>
                <div className="flex justify-between mb-3">
                  <OffsetItem icon={<WalkIcon />}          value={displayedPrediction.offsets.accidents}    label="accidents" />
                  <OffsetItem icon={<ConstructionIcon />}  value={displayedPrediction.offsets.construction} label="construction" />
                  <OffsetItem icon={<StarIcon />}           value={displayedPrediction.offsets.other}        label="other" />
                </div>
                <button
                  onClick={() => selectedRoute !== null && dir !== null && onOpenReport(selectedRoute, dir)}
                  className="w-full text-center font-['SF_Compact',system-ui,sans-serif] text-[13px] text-[#4f4f4f] underline underline-offset-2 cursor-pointer pt-1"
                >
                  see the whole bus report
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Bus Report screen ──
interface BusReportProps {
  route: number;
  dir: string;
  stopId: string;
  mapCenter: [number, number];
  onClose: () => void;
}
function BusReport({ route, dir, stopId, mapCenter, onClose }: BusReportProps) {
  const [data, setData] = useState<BusReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    Promise.all([
      apiBusReport(stopId, route, dir),
      getCurrentWeather(mapCenter[0], mapCenter[1]).catch(() => null),
      getTrafficImpact(mapCenter[0], mapCenter[1], route).catch(() => null),
      getConstructionImpact(mapCenter[0], mapCenter[1]).catch(() => null),
    ])
      .then(([report, currentWeather, trafficImpact, constructionImpact]) => {
        if (cancelled) return;

        const nextReport: BusReportData = {
          ...report,
          factors: {
            ...report.factors,
          },
        };

        if (currentWeather) {
          const weatherDelay = estimateWeatherDelay(currentWeather);
          nextReport.factors.weather = {
            value: weatherDelay,
            description: describeWeatherDelay(currentWeather, weatherDelay),
          };
        }

        if (trafficImpact) {
          nextReport.factors.traffic = {
            value: trafficImpact.trafficDelayMin,
            description: describeTrafficDelay(trafficImpact, "traffic"),
          };
          nextReport.factors.accidents = {
            value: trafficImpact.accidentDelayMin,
            description: describeTrafficDelay(trafficImpact, "accident"),
          };
          nextReport.factors.construction = {
            value: trafficImpact.constructionDelayMin,
            description: describeTrafficDelay(trafficImpact, "construction"),
          };
        }

        if (constructionImpact) {
          nextReport.factors.construction = {
            value: constructionImpact.constructionDelayMin,
            description: describeConstructionDelay(constructionImpact),
          };
        }

        nextReport.confidence = estimateConfidenceFromFactors(nextReport.factors);
        setData(nextReport);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [stopId, route, dir, mapCenter]);

  const iconMap: Record<string, React.ReactNode> = {
    schedule: <BusIcon />, weather: <CloudIcon />, traffic: <TrafficIcon />,
    accidents: <WalkIcon />, construction: <ConstructionIcon />, other: <StarIcon />,
  };

  return (
    <div className="bg-white min-h-full px-5 pt-[69px] pb-8">
      <div className="bg-white border-2 border-[#9d9d9d] rounded-[20px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] w-full relative">
        {/* Header */}
        <div className="flex items-start gap-3 px-4 pt-4 pb-3 pr-10">
          <div className="bg-white border border-[#d9d9d9] rounded-[20px] size-[80px] shrink-0 flex items-center justify-center shadow-sm">
            <span className="font-['Rowdies',sans-serif] text-[32px] text-[#4f4f4f] leading-none">{route}</span>
          </div>
          <div className="flex flex-col justify-end pt-4 flex-1">
            {loading || !data ? (
              <>
                <Skeleton className="h-3 w-36 mb-2" />
                <Skeleton className="h-9 w-24" />
              </>
            ) : (
              <>
                <span className="font-['SF_Compact',system-ui,sans-serif] text-[13px] text-black">{data.stopName}</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-['SF_Compact',system-ui,sans-serif] text-[11px] text-[#656565]">est.</span>
                  <span className="font-['Rowdies',sans-serif] text-[38px] text-[#4f4f4f] leading-none">{data.etaMin}</span>
                  <span className="font-['SF_Compact',system-ui,sans-serif] text-[13px] text-black">min.</span>
                </div>
                <span className="font-['SF_Compact',system-ui,sans-serif] text-[12px] text-[#656565]">
                  Confidence {data.confidence ?? 82}%
                </span>
              </>
            )}
          </div>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 size-6 flex items-center justify-center cursor-pointer" aria-label="Close">
          <CloseIcon />
        </button>
        <div className="h-px bg-[#e0e0e0] mx-4" />
        {/* Factors */}
        <div className="flex flex-col gap-5 px-4 py-5">
          {loading || !data
            ? [1,2,3,4,5,6].map(i => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="w-[64px] h-12 shrink-0" />
                <Skeleton className="h-10 flex-1" />
              </div>
            ))
            : (Object.entries(data.factors) as [string, { value: number; description: string }][]).map(([key, f]) => (
              <div key={key} className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-0.5 w-[64px] shrink-0">
                  <span className="font-['Rowdies',sans-serif] text-[28px] leading-none text-[#7d7b7b]">{fmt(f.value)}</span>
                  <div className="flex items-center gap-1">
                    <div className="size-[16px] shrink-0">{iconMap[key]}</div>
                    <span className="font-['SF_Compact',system-ui,sans-serif] text-[11px] text-[#656565] whitespace-nowrap">{key}</span>
                  </div>
                </div>
                <p className="font-['SF_Compact',system-ui,sans-serif] text-[13px] text-black leading-[22px] flex-1 pt-1">{f.description}</p>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ── Destination Navigation screen ──
interface DestNavProps {
  destId: string;
  mapCenter: [number, number];
  originPos: [number, number] | null;
  originLabel: string;
  userPos: [number, number] | null;
  locationStatus: LocationStatus;
  onStartNavigation: (mode: NavigationMode) => void;
  onBack: () => void;
  onSearchOrigin: () => void;
  onSearchDest: (initialQuery?: string) => void;
  onSwitchToStop: () => void;
}
function DestNavScreen({ destId, mapCenter, originPos, originLabel, userPos, locationStatus, onStartNavigation, onBack, onSearchOrigin, onSearchDest, onSwitchToStop }: DestNavProps) {
  const [routesByMode, setRoutesByMode] = useState<Partial<Record<NavigationMode, NavigationRoute>>>({});
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<NavigationMode>("bus");
  const currentClock = useCurrentClock();
  const route = routesByMode[mode] ?? routesByMode.bus ?? null;
  const routeFailed = !loading && !route;

  useEffect(() => {
    if (!originPos) return;
    let cancelled = false;
    setLoading(true);
    Promise.allSettled(
      (["bus", "car", "walk", "bike"] as NavigationMode[]).map(async currentMode => {
        const result = await getNavigationRoute("current-location", destId, originPos, currentMode);
        return [currentMode, result] as const;
      })
    )
      .then(results => {
        if (cancelled) return;
        const entries = results
          .filter((result): result is PromiseFulfilledResult<readonly [NavigationMode, NavigationRoute]> => result.status === "fulfilled")
          .map(result => result.value);
        setRoutesByMode(Object.fromEntries(entries) as Partial<Record<NavigationMode, NavigationRoute>>);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [destId, originPos]);

  const modeTimes = (currentMode: NavigationMode) => {
    const routeForMode = routesByMode[currentMode];
    if (!routeForMode) return loading ? "..." : "--";
    if (routeForMode.available === false) return "--";
    return `${routeForMode.durationMin ?? routeForMode.etaMin} min`;
  };
  const modeIcons: Record<NavigationMode, React.ReactNode> = {
    bus:  <BusIcon  fill={mode === "bus"  ? "#1D1B20" : "#FEF7FF"} />,
    car:  <CarIcon  fill={mode === "car"  ? "#1D1B20" : "#FEF7FF"} />,
    walk: <WalkIcon fill={mode === "walk" ? "#1D1B20" : "#FEF7FF"} />,
    bike: <img src={imgBike} alt="bike" className="size-full object-contain" />,
  };
  const routeLine = route?.available === false ? undefined : route?.legs?.flatMap(leg => leg.geometry ?? []);
  const destinationPos = route?.destinationCoordinates
    ? [route.destinationCoordinates.lat, route.destinationCoordinates.lng] as [number, number]
    : undefined;
  const transitMarkers = route?.available === false ? [] : (route?.legs ?? [])
    .filter((leg): leg is NonNullable<NavigationRoute["legs"]>[number] & { fromPos: [number, number] } =>
      (leg.mode === "BUS" || leg.mode === "STREETCAR" || leg.mode === "SUBWAY" || leg.mode === "TRANSIT") && !!leg.fromPos
    )
    .map(leg => ({
      pos: leg.fromPos,
      mode: leg.mode === "STREETCAR" ? "BUS" as const : leg.mode,
      label: leg.fromName,
    }));
  const renderLegIcon = (legMode: NavigationRoute["legs"] extends Array<infer T> ? T extends { mode: infer M } ? M : never : never) => {
    if (legMode === "WALK") return <WalkIcon />;
    if (legMode === "CAR") return <CarIcon />;
    if (legMode === "BICYCLE") return <img src={imgBike} alt="bike" className="size-full object-contain" />;
    if (legMode === "SUBWAY") return <SubwayIcon />;
    return <BusIcon />;
  };
  const legLabel = (leg: NonNullable<NavigationRoute["legs"]>[number]) => {
    if (leg.mode === "WALK") return `Walk ${leg.durationMin} min${leg.distanceMeters ? ` (${leg.distanceMeters} m)` : ""}`;
    if (leg.mode === "CAR") return `Drive ${leg.durationMin} min`;
    if (leg.mode === "BICYCLE") return `Bike ${leg.durationMin} min`;
    return `${leg.routeLabel ?? "Transit"}${leg.headsign ? ` to ${leg.headsign}` : ""}`;
  };

  return (
    <div className="bg-white flex flex-col min-h-full">
      <div className="h-[52px] shrink-0" />
      {/* Two search bars */}
      <div className="px-[19px] shrink-0 flex flex-col gap-2">
        <button
          type="button"
          onClick={onSearchOrigin}
          className="bg-[rgba(120,120,128,0.16)] rounded-full h-[44px] flex items-center px-[11px] gap-2 text-left cursor-pointer"
        >
          <div className="size-[20px] shrink-0"><PinIcon fill="#007AFF" /></div>
          <span className="font-['SF_Compact',system-ui,sans-serif] text-[17px] text-[#007AFF] tracking-[-0.08px] truncate">{originLabel}</span>
        </button>
        <button
          type="button"
          onClick={() => onSearchDest(route?.destName ?? "")}
          className="bg-[rgba(120,120,128,0.16)] rounded-full h-[44px] flex items-center px-[11px] gap-2 text-left cursor-pointer"
        >
          <div className="size-[20px] shrink-0"><PinIcon /></div>
          {loading
            ? <Skeleton className="h-4 w-40" />
            : <span className="font-['SF_Compact',system-ui,sans-serif] text-[17px] text-[#727272] tracking-[-0.08px]">{route?.destName ?? "Destination unavailable"}</span>
          }
        </button>
      </div>

      {/* Map */}
      <div className="px-[25px] mt-[10px] shrink-0">
        <div className="rounded-[8px] overflow-hidden h-[200px] w-full">
          <LeafletMap center={mapCenter} zoom={14} userPos={userPos} locationStatus={locationStatus} routeLine={routeLine} destinationPos={destinationPos} transitMarkers={transitMarkers} />
        </div>
      </div>

      {/* Close + Switch mode buttons */}
      <div className="px-[19px] mt-[8px] flex items-center justify-between shrink-0">
        <button onClick={onBack} className="size-[30px] bg-white rounded-full flex items-center justify-center shadow-sm cursor-pointer shrink-0" aria-label="Back">
          <div className="size-[14px]"><CloseIcon /></div>
        </button>
        <button onClick={onSwitchToStop} className="bg-white rounded-[10px] h-[30px] px-3 flex items-center cursor-pointer shadow-sm">
          <span className="font-['SF_Compact',system-ui,sans-serif] text-[13px] text-[#585858] tracking-[-0.08px] whitespace-nowrap">switch to stop search</span>
        </button>
      </div>

      {/* Bottom panel */}
      <div className="px-[19px] mt-[6px] pb-4 flex-1">
        <div className="bg-[#d9d9d9] rounded-[20px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] w-full overflow-hidden">
          {/* Transit mode tabs */}
          <div className="flex gap-[5px] px-[11px] pt-[11px]">
            {(["bus", "car", "walk", "bike"] as NavigationMode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 h-[50px] rounded-tl-[10px] rounded-tr-[10px] flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${m === mode ? "bg-white" : "bg-[#aaa]"}`}>
                <div className="size-[22px]">{modeIcons[m]}</div>
                <span className={`font-['SF_Compact',system-ui,sans-serif] text-[12px] tracking-[-0.08px] ${m === mode ? "text-black" : "text-white"}`}>{modeTimes(m)}</span>
              </button>
            ))}
          </div>

          {/* Route detail */}
          <div className="mx-[11px] bg-white rounded-bl-[20px] rounded-br-[20px] px-4 py-3">
            {loading ? (
              <div className="flex flex-col gap-3">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : routeFailed ? (
              <div className="py-8">
                <p className="font-['SF_Compact',system-ui,sans-serif] text-[15px] text-[#4f4f4f] text-center">
                  Navigation unavailable.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between py-2 border-b border-[#b8b8b8]">
                  <div className="flex items-center gap-2">
                    <div className="size-[20px] shrink-0"><PinIcon fill="#007AFF" /></div>
                    <span className="font-['SF_Compact',system-ui,sans-serif] text-[13px] text-black">{originLabel}</span>
                  </div>
                  <span className="font-['SF_Compact',system-ui,sans-serif] text-[13px] text-black">{currentClock}</span>
                </div>
                {route.available === false ? (
                  <div className="py-8 border-b border-[#b8b8b8]">
                    <p className="font-['SF_Compact',system-ui,sans-serif] text-[15px] text-[#4f4f4f] text-center">
                      {route.message ?? "Cannot find route."}
                    </p>
                  </div>
                ) : (
                  <div className="border-b border-[#b8b8b8]">
                    {(route.legs ?? []).map((leg, index) => (
                      <div key={`${leg.mode}-${index}`} className="flex items-start gap-3 py-2">
                        <div className="size-[20px] shrink-0 mt-0.5">{renderLegIcon(leg.mode)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-['SF_Compact',system-ui,sans-serif] text-[13px] text-black font-medium truncate">
                              {leg.fromName}
                            </span>
                            <span className="font-['SF_Compact',system-ui,sans-serif] text-[12px] text-[#656565] shrink-0">
                              {leg.startTime}
                            </span>
                          </div>
                          <p className="font-['SF_Compact',system-ui,sans-serif] text-[13px] text-[#5b5b5b] leading-[20px]">
                            {legLabel(leg)}
                          </p>
                          <span className="font-['SF_Compact',system-ui,sans-serif] text-[12px] text-[#6b6b6b]">
                            to {leg.toName}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <div className="size-[20px] shrink-0"><PinIcon /></div>
                    <span className="font-['SF_Compact',system-ui,sans-serif] text-[13px] text-black">{route.destName}</span>
                  </div>
                  <span className="font-['SF_Compact',system-ui,sans-serif] text-[13px] text-black">{route.arrivalTime}</span>
                </div>
              </>
            )}
            <button
              onClick={() => onStartNavigation(mode)}
              disabled={route?.available === false}
              className="w-full bg-[#9d9d9d] disabled:bg-[#c9c9c9] rounded-[10px] h-[39px] flex items-center justify-center mt-2 cursor-pointer disabled:cursor-default"
            >
              <span className="font-['SF_Compact',system-ui,sans-serif] text-[16px] text-white tracking-[-0.08px]">Start Navigation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Navigation screen ──
interface NavScreenProps {
  destId: string;
  mode: NavigationMode;
  mapCenter: [number, number];
  originPos: [number, number] | null;
  originLabel: string;
  userPos: [number, number] | null;
  locationStatus: LocationStatus;
  onClose: () => void;
}
function NavScreen({ destId, mode, mapCenter, originPos, originLabel, userPos, locationStatus, onClose }: NavScreenProps) {
  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const currentClock = useCurrentClock();
  const routeLine = route?.legs?.flatMap(leg => leg.geometry ?? []);
  const destinationPos = route?.destinationCoordinates
    ? [route.destinationCoordinates.lat, route.destinationCoordinates.lng] as [number, number]
    : undefined;
  const transitMarkers = route?.available === false ? [] : (route?.legs ?? [])
    .filter((leg): leg is NonNullable<NavigationRoute["legs"]>[number] & { fromPos: [number, number] } =>
      (leg.mode === "BUS" || leg.mode === "STREETCAR" || leg.mode === "SUBWAY" || leg.mode === "TRANSIT") && !!leg.fromPos
    )
    .map(leg => ({
      pos: leg.fromPos,
      mode: leg.mode === "STREETCAR" ? "BUS" as const : leg.mode,
      label: leg.fromName,
    }));
  const renderNavLegIcon = (legMode: NonNullable<NavigationRoute["legs"]>[number]["mode"]) => {
    if (legMode === "WALK") return <WalkIcon />;
    if (legMode === "CAR") return <CarIcon />;
    if (legMode === "BICYCLE") return <img src={imgBike} alt="bike" className="size-full object-contain" />;
    if (legMode === "SUBWAY") return <SubwayIcon />;
    return <BusIcon />;
  };
  const navLegLabel = (leg: NonNullable<NavigationRoute["legs"]>[number]) => {
    if (leg.mode === "WALK") return `Walk ${leg.durationMin} min${leg.distanceMeters ? ` (${leg.distanceMeters} m)` : ""}`;
    if (leg.mode === "CAR") return `Drive ${leg.durationMin} min`;
    if (leg.mode === "BICYCLE") return `Bike ${leg.durationMin} min`;
    return `${leg.routeLabel ?? "Transit"}${leg.headsign ? ` to ${leg.headsign}` : ""}`;
  };

  useEffect(() => {
    if (!originPos) return;
    getNavigationRoute("current-location", destId, originPos, mode).then(setRoute).catch(() => null);
  }, [destId, mode, originPos]);

  return (
    <div className="bg-white relative h-full min-h-[844px]">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <LeafletMap center={mapCenter} zoom={16} userPos={userPos} locationStatus={locationStatus} routeLine={routeLine} destinationPos={destinationPos} transitMarkers={transitMarkers} className="absolute inset-0" />
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-[27px] right-[19px] size-[40px] bg-white rounded-full flex items-center justify-center shadow-md cursor-pointer z-[1001]"
      >
        <div className="size-[14px]"><CloseIcon /></div>
      </button>

      {/* Bottom nav card */}
      <div className="absolute bottom-4 left-[19px] right-[19px] z-[1001]">
        <div className="bg-[#d9d9d9] rounded-[20px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] overflow-hidden">
          <div className="bg-white rounded-[20px] mx-[11px] my-[11px] px-4 py-3">
            <div className="flex items-center justify-between py-1.5 border-b border-[#b8b8b8]">
              <div className="flex items-center gap-2">
                <div className="size-[20px] shrink-0"><PinIcon fill="#007AFF" /></div>
                <span className="font-['SF_Compact',system-ui,sans-serif] text-[13px] text-black">{originLabel}</span>
              </div>
              <span className="font-['SF_Compact',system-ui,sans-serif] text-[13px] text-black">{currentClock}</span>
            </div>
            {!route ? (
              <div className="flex flex-col gap-2 py-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-4/5" />
              </div>
            ) : route.available === false ? (
              <p className="py-6 font-['SF_Compact',system-ui,sans-serif] text-[15px] text-[#4f4f4f] text-center">
                {route.message ?? "Cannot find route."}
              </p>
            ) : (
              <div className="max-h-[220px] overflow-y-auto">
                {(route.legs ?? []).map((leg, index) => (
                  <div key={`${leg.mode}-${index}`} className="flex items-start gap-3 py-2 border-b border-[#e3e3e3] last:border-b-0">
                    <div className="size-[20px] shrink-0 mt-0.5">{renderNavLegIcon(leg.mode)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-['SF_Compact',system-ui,sans-serif] text-[13px] text-black font-medium truncate">{leg.fromName}</span>
                        <span className="font-['SF_Compact',system-ui,sans-serif] text-[12px] text-[#656565] shrink-0">{leg.startTime}</span>
                      </div>
                      <p className="font-['SF_Compact',system-ui,sans-serif] text-[13px] text-[#5b5b5b] leading-[20px]">{navLegLabel(leg)}</p>
                      <span className="font-['SF_Compact',system-ui,sans-serif] text-[12px] text-[#6b6b6b]">to {leg.toName}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AI Chatbot overlay ───────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "ai";
  text: string;
}

function MilkIcon({ size = 30 }: { size?: number }) {
  return (
    <div className="relative overflow-hidden shrink-0" style={{ width: size, height: size }}>
      <img
        src={imgMilk}
        alt="Milk bot"
        className="absolute max-w-none pointer-events-none"
        style={{
          width: "120.83%",
          height: "130.13%",
          left: "-10.74%",
          top: "-11.7%",
        }}
      />
    </div>
  );
}

function AiChatbot({ appContext }: { appContext?: TransitAssistantContext }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [assistantContext, setAssistantContext] = useState<TransitAssistantContext>({});
  const [confirmClose, setConfirmClose] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!appContext) return;
    setAssistantContext(prev => ({
      ...prev,
      ...appContext,
    }));
  }, [
    appContext?.stopId,
    appContext?.routeId,
    appContext?.direction,
    appContext?.destinationId,
  ]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isTyping) return;

    setMessages(prev => [...prev, { role: "user", text }]);
    setInput("");
    if (chatInputRef.current) chatInputRef.current.value = "";
    setIsTyping(true);

    try {
      const answer = await askTransitAssistant(text, assistantContext);
      if (answer.context) setAssistantContext(answer.context);
      setMessages(prev => [...prev, { role: "ai", text: answer.text }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "ai",
        text: "I could not calculate that trip answer right now. Try asking about a route number, stop, delay, or destination.",
      }]);
    } finally {
      setIsTyping(false);
      requestAnimationFrame(() => chatInputRef.current?.focus());
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function requestCloseChat() {
    setConfirmClose(true);
  }

  function endChatSession() {
    setMessages([]);
    setInput("");
    if (chatInputRef.current) chatInputRef.current.value = "";
    setIsTyping(false);
    setAssistantContext({});
    setConfirmClose(false);
    setOpen(false);
  }

  function keepChatSession() {
    setConfirmClose(false);
    setOpen(false);
  }

  return (
    <>
      {open ? (
        <>
          <div
            className="fixed inset-0 z-[2000] pointer-events-auto"
            onClick={requestCloseChat}
          />
          <div
            className="fixed left-1/2 top-1/2 z-[2001] w-[min(100vw,390px)] h-[82vh] -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-[#9d9d9d] rounded-[20px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 shrink-0 border-b border-[#e5e5e5]">
              <span className="font-['Inter',system-ui,sans-serif] font-bold text-[16px] text-black leading-[1.4]">
                Chat with Milk bot
              </span>
              <button
                onClick={requestCloseChat}
                className="size-6 flex items-center justify-center cursor-pointer opacity-70 hover:opacity-100"
                aria-label="Minimize"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
              {messages.map((message, index) => (
                <div key={index} className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start items-start"}`}>
                  {message.role === "ai" && <MilkIcon size={30} />}
                  <div
                    className={`max-w-[75%] rounded-[8px] px-3 py-[6px] font-['Inter',system-ui,sans-serif] text-[15px] leading-[1.4] ${
                      message.role === "user"
                        ? "bg-[#f5f5f5] border border-[#d9d9d9] text-[#1e1e1e]"
                        : "text-[#1e1e1e]"
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-2 items-center">
                  <MilkIcon size={30} />
                  <div className="bg-[#f5f5f5] border border-[#d9d9d9] rounded-[8px] px-3 py-2 font-['Inter',system-ui,sans-serif] text-[14px] text-[#656565]">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="shrink-0 px-4 pb-4">
              <div className="bg-white border border-[#d9d9d9] rounded-[16px] p-4 flex flex-col gap-4">
                <textarea
                  ref={chatInputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything about commuting!"
                  rows={1}
                  className="w-full font-['Inter',system-ui,sans-serif] text-[16px] text-[#1e1e1e] placeholder:text-[#b3b3b3] leading-[1.4] resize-none outline-none bg-transparent"
                  style={{ minHeight: "22px", maxHeight: "88px" }}
                />
                <div className="flex justify-end">
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || isTyping}
                    className="size-9 rounded-full flex items-center justify-center transition-colors cursor-pointer disabled:cursor-default"
                    style={{ background: input.trim() && !isTyping ? "#1e1e1e" : "#d9d9d9" }}
                    aria-label="Send"
                  >
                    <svg className="size-4" fill="none" viewBox="0 0 14 14">
                      <path d="M7 12V2M7 2L2 7M7 2L12 7" stroke={input.trim() && !isTyping ? "white" : "#b3b3b3"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {confirmClose && (
              <div className="absolute inset-0 z-[1] bg-white/85 flex items-center justify-center px-6">
                <div className="w-full bg-white border border-[#d9d9d9] rounded-[16px] shadow-[0px_4px_12px_rgba(0,0,0,0.18)] p-5">
                  <p className="font-['Inter',system-ui,sans-serif] text-[16px] font-semibold text-[#1e1e1e] leading-[1.4]">
                    End the chat session?
                  </p>
                  <p className="font-['Inter',system-ui,sans-serif] text-[14px] text-[#656565] leading-[1.4] mt-2">
                    Choosing yes will clear this chat history.
                  </p>
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={keepChatSession}
                      className="flex-1 h-10 rounded-[10px] border border-[#d9d9d9] font-['Inter',system-ui,sans-serif] text-[14px] text-[#1e1e1e]"
                    >
                      No
                    </button>
                    <button
                      onClick={endChatSession}
                      className="flex-1 h-10 rounded-[10px] bg-[#1e1e1e] font-['Inter',system-ui,sans-serif] text-[14px] text-white"
                    >
                      Yes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-5 bottom-[100px] z-[2000] bg-white rounded-[32px] flex items-center justify-center cursor-pointer"
          style={{
            width: 50,
            height: 50,
            boxShadow: "0px 4px 4px rgba(0,0,0,0.15), 0px 1px 1.5px rgba(0,0,0,0.3)",
          }}
          aria-label="Open Milk bot"
        >
          <MilkIcon size={30} />
        </button>
      )}
    </>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────

type AppScreen =
  | { id: "loading" }
  | { id: "map"; stopId: string; fromSearch: boolean }
  | { id: "busReport"; stopId: string; route: number; dir: string }
  | { id: "destNav"; destId: string }
  | { id: "navigation"; destId: string; mode: NavigationMode };

function useCanvasScale() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const widthScale = window.innerWidth / DESIGN_WIDTH;
      const heightScale = window.innerHeight / DESIGN_HEIGHT;
      const desktopWidthScale = window.innerWidth >= 900
        ? (window.innerWidth * 0.34) / DESIGN_WIDTH
        : widthScale;
      const nextScale = Math.min(desktopWidthScale, heightScale, 1.45);
      setScale(nextScale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return scale;
}

function formatTorontoClock(date: Date) {
  return date.toLocaleTimeString("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Toronto",
  });
}

function useCurrentClock() {
  const [clock, setClock] = useState(() => formatTorontoClock(new Date()));

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClock(formatTorontoClock(new Date()));
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, []);

  return clock;
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>({ id: "loading" });
  const [searching, setSearching] = useState(false);
  const [searchTarget, setSearchTarget] = useState<SearchTarget>("general");
  const [query, setQuery] = useState("");
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [originOverride, setOriginOverride] = useState<OriginSelection | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(TORONTO);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("locating");
  const [homeStopId, setHomeStopId] = useState("college-yonge");
  const initializedLocationRef = useRef(false);
  const canvasScale = useCanvasScale();

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const nextPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(nextPos);
        if (!initializedLocationRef.current) {
          initializedLocationRef.current = true;
          setMapCenter(nextPos);
        }
        setLocationStatus("ready");
      },
      error => {
        setLocationStatus(
          error.code === error.PERMISSION_DENIED ? "denied"
            : error.code === error.TIMEOUT ? "timeout"
            : "unavailable"
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const effectiveOriginPos = originOverride?.pos ?? userPos ?? TORONTO;
  const effectiveOriginLabel = originOverride?.label ?? "Your location";

  useEffect(() => {
    if (screen.id !== "loading") return;
    if (locationStatus === "locating" && !userPos) return;

    let cancelled = false;

    getNearbyStops(mapCenter[0], mapCenter[1])
      .then(stops => {
        if (cancelled) return;
        const nearestStopId = stops[0]?.stopId ?? "college-yonge";
        setHomeStopId(nearestStopId);
        setScreen({ id: "map", stopId: nearestStopId, fromSearch: false });
      })
      .catch(() => {
        if (!cancelled) {
          setScreen({ id: "map", stopId: "college-yonge", fromSearch: false });
        }
      });

    return () => { cancelled = true; };
  }, [locationStatus, mapCenter[0], mapCenter[1], screen.id, userPos]);

  const handleSelectStop = (stopId: string) => {
    setSearching(false);
    setSearchTarget("general");
    setQuery("");
    setScreen({ id: "map", stopId, fromSearch: true });
    getStopMeta(stopId)
      .then(meta => setMapCenter(meta.pos))
      .catch(() => null);
  };

  const handleSelectDest = (destId: string) => {
    setSearching(false);
    setSearchTarget("general");
    setQuery("");
    setScreen({ id: "destNav", destId });
  };

  const handleSelectOrigin = (origin: OriginSelection) => {
    setOriginOverride(origin);
    setMapCenter(origin.pos);
    setSearching(false);
    setSearchTarget("general");
    setQuery("");
  };

  const handleSelectCurrentLocation = () => {
    setOriginOverride(null);
    if (userPos) setMapCenter(userPos);
    setSearching(false);
    setSearchTarget("general");
    setQuery("");
  };

  const handleOpenReport = (route: number, dir: string) => {
    if (screen.id === "map") {
      setScreen({ id: "busReport", stopId: screen.stopId, route, dir });
    }
  };

  const handleCloseReport = () => {
    if (screen.id === "busReport") {
      setScreen({ id: "map", stopId: screen.stopId, fromSearch: true });
    }
  };

  const handleStartNavigation = (mode: NavigationMode) => {
    if (screen.id === "destNav") {
      setScreen({ id: "navigation", destId: screen.destId, mode });
    }
  };

  const handleCloseNavigation = () => {
    if (screen.id === "navigation") {
      setScreen({ id: "destNav", destId: screen.destId });
    }
  };

  const handleBackFromDest = () => {
    setScreen({ id: "map", stopId: homeStopId, fromSearch: false });
  };

  const handleUseCurrentStopAsDestination = () => {
    if (screen.id !== "map") return;
    setOriginOverride(null);
    setSearching(false);
    setSearchTarget("general");
    setQuery("");
    setScreen({ id: "destNav", destId: screen.stopId });
  };

  const handleSwitchToDestSearch = (initialQuery = "") => {
    setSearching(true);
    setSearchTarget("destination");
    setQuery(initialQuery);
  };

  const handleSwitchToStopSearch = () => {
    if (screen.id === "destNav") {
      const isStopDestination =
        !screen.destId.startsWith("dest-") &&
        !screen.destId.startsWith("geo:");

      if (isStopDestination) {
        setSearching(false);
        setSearchTarget("general");
        setQuery("");
        setScreen({ id: "map", stopId: screen.destId, fromSearch: true });
        return;
      }
    }

    setSearching(true);
    setSearchTarget("general");
    setQuery("");
  };

  const handleSwitchToOriginSearch = () => {
    setSearching(true);
    setSearchTarget("origin");
    setQuery("");
  };

  const chatbotContext: TransitAssistantContext =
    screen.id === "map"
      ? { stopId: screen.stopId }
      : screen.id === "busReport"
        ? { stopId: screen.stopId, routeId: screen.route, direction: screen.dir }
        : screen.id === "destNav" || screen.id === "navigation"
          ? { destinationId: screen.destId }
          : {};

  return (
    <>
    <AiChatbot appContext={chatbotContext} />
    <div className="min-h-screen bg-gray-100 flex items-start justify-center overflow-auto py-1">
      <div
        className="relative shrink-0"
        style={{
          width: DESIGN_WIDTH * canvasScale,
          minHeight: DESIGN_HEIGHT * canvasScale,
        }}
      >
      <div
        className="w-[390px] min-h-[844px] bg-white relative overflow-x-hidden origin-top"
        style={{
          transform: `scale(${canvasScale})`,
          transformOrigin: "top left",
        }}
      >
        {searching ? (
          <SearchOverlay
            query={query}
            target={searchTarget}
            currentLocation={userPos ? { label: "Your location", pos: userPos } : null}
            onQueryChange={setQuery}
            onClose={() => { setSearching(false); setSearchTarget("general"); setQuery(""); }}
            onSelectStop={handleSelectStop}
            onSelectDest={handleSelectDest}
            onSelectOrigin={handleSelectOrigin}
            onSelectCurrentLocation={handleSelectCurrentLocation}
          />
        ) : screen.id === "loading" ? (
          <div className="min-h-[844px] bg-white flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="size-[56px] rounded-[18px]" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        ) : screen.id === "map" ? (
          <MapScreen
            stopId={screen.stopId}
            showControls={screen.fromSearch}
            mapCenter={mapCenter}
            userPos={userPos}
            locationStatus={locationStatus}
            onSearch={() => setSearching(true)}
            onOpenReport={handleOpenReport}
            onBack={() => setScreen({ id: "map", stopId: homeStopId, fromSearch: false })}
            onSwitchToDest={handleUseCurrentStopAsDestination}
            onSelectStop={handleSelectStop}
            onMapMove={setMapCenter}
          />
        ) : screen.id === "busReport" ? (
          <BusReport
            route={screen.route}
            dir={screen.dir}
            stopId={screen.stopId}
            mapCenter={mapCenter}
            onClose={handleCloseReport}
          />
        ) : screen.id === "destNav" ? (
          <DestNavScreen
            destId={screen.destId}
            mapCenter={mapCenter}
            originPos={effectiveOriginPos}
            originLabel={effectiveOriginLabel}
            userPos={userPos}
            locationStatus={locationStatus}
            onStartNavigation={handleStartNavigation}
            onBack={handleBackFromDest}
            onSearchOrigin={handleSwitchToOriginSearch}
            onSearchDest={handleSwitchToDestSearch}
            onSwitchToStop={handleSwitchToStopSearch}
          />
        ) : screen.id === "navigation" ? (
          <NavScreen
            destId={screen.destId}
            mode={screen.mode}
            mapCenter={mapCenter}
            originPos={effectiveOriginPos}
            originLabel={effectiveOriginLabel}
            userPos={userPos}
            locationStatus={locationStatus}
            onClose={handleCloseNavigation}
          />
        ) : null}
      </div>
      </div>
    </div>
    </>
  );
}
