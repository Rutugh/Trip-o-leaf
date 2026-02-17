"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  Palmtree, MapPin, Plus, X, Search, Navigation,
  Clock, Route, ChevronRight, Trash2, Star,
  Coffee, Hotel, Camera, UtensilsCrossed, ShoppingBag,
  ArrowLeft, DollarSign, Calendar, Grip
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Stop {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: "attraction" | "hotel" | "restaurant" | "cafe" | "shopping" | "custom";
  note?: string;
  placeId?: string;
  rating?: number;
  photo?: string;
}

interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  stops?: Stop[];
}

interface LegInfo {
  distance: string;
  duration: string;
}

// ─── Category config ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "attraction", label: "Attraction", icon: Camera,       color: "#9333ea", bg: "#f3e8ff" },
  { key: "hotel",      label: "Hotel",      icon: Hotel,        color: "#2563eb", bg: "#dbeafe" },
  { key: "restaurant", label: "Restaurant", icon: UtensilsCrossed, color: "#dc2626", bg: "#fee2e2" },
  { key: "cafe",       label: "Café",       icon: Coffee,       color: "#d97706", bg: "#fef3c7" },
  { key: "shopping",   label: "Shopping",   icon: ShoppingBag,  color: "#059669", bg: "#d1fae5" },
  { key: "custom",     label: "Custom",     icon: MapPin,       color: "#ec4899", bg: "#fce7f3" },
] as const;

const NEARBY_TYPES = [
  { type: "tourist_attraction", label: "Attractions", icon: Camera },
  { type: "lodging",            label: "Hotels",      icon: Hotel },
  { type: "restaurant",         label: "Restaurants", icon: UtensilsCrossed },
  { type: "cafe",               label: "Cafés",       icon: Coffee },
  { type: "shopping_mall",      label: "Shopping",    icon: ShoppingBag },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const catFor = (key: string) =>
  CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[5];

const uid = () => Math.random().toString(36).slice(2, 10);

// ─── Component ────────────────────────────────────────────────────────────────
export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const mapRef      = useRef<HTMLDivElement>(null);
  const mapObj      = useRef<google.maps.Map | null>(null);
  const markers     = useRef<Map<string, google.maps.Marker>>(new Map());
  const polyline    = useRef<google.maps.Polyline | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  const [trip,          setTrip]          = useState<Trip | null>(null);
  const [stops,         setStops]         = useState<Stop[]>([]);
  const [legInfos,      setLegInfos]      = useState<LegInfo[]>([]);
  const [nearby,        setNearby]        = useState<Stop[]>([]);
  const [activeTab,     setActiveTab]     = useState<"stops" | "nearby" | "route">("stops");
  const [nearbyType,    setNearbyType]    = useState("tourist_attraction");
  const [searchLoading, setSearchLoading] = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [mapsLoaded,    setMapsLoaded]    = useState(false);
  const [selectedStop,  setSelectedStop]  = useState<Stop | null>(null);
  const [dragIdx,       setDragIdx]       = useState<number | null>(null);
  const [totalRoute,    setTotalRoute]    = useState<{ distance: string; duration: string } | null>(null);

  // ── Load trip from Firestore ──────────────────────────────────────────────
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) { router.push("/login"); return; }
      if (!id) return;
      const snap = await getDoc(doc(db, "trips", id as string));
      if (!snap.exists()) { router.push("/dashboard"); return; }
      const data = { id: snap.id, ...snap.data() } as Trip;
      setTrip(data);
      setStops(data.stops ?? []);
    });
    return () => unsub();
  }, [id]);

  // ── Load Google Maps ──────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).google?.maps) { setMapsLoaded(true); return; }

    const existing = document.querySelector('script[data-maps]');
    if (existing) { existing.addEventListener("load", () => setMapsLoaded(true)); return; }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
    script.async = true;
    script.dataset.maps = "1";
    script.onload = () => setMapsLoaded(true);
    document.head.appendChild(script);
  }, []);

  // ── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapsLoaded || !mapRef.current || mapObj.current) return;
    mapObj.current = new google.maps.Map(mapRef.current, {
      center: { lat: 20, lng: 78 },
      zoom: 5,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "water", stylers: [{ color: "#c8e6f9" }] },
        { featureType: "landscape", stylers: [{ color: "#f5f0eb" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
        { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#fce4ec" }] },
      ],
    });
    if (trip?.destination) geocodeDestination(trip.destination);
  }, [mapsLoaded, trip]);

  // ── Geocode destination ───────────────────────────────────────────────────
  const geocodeDestination = (dest: string) => {
    if (!mapObj.current) return;
    const gc = new google.maps.Geocoder();
    gc.geocode({ address: dest }, (res, status) => {
      if (status === "OK" && res?.[0]) {
        mapObj.current!.setCenter(res[0].geometry.location);
        mapObj.current!.setZoom(12);
      }
    });
  };

  // ── Sync markers whenever stops change ───────────────────────────────────
  useEffect(() => {
    if (!mapObj.current) return;
    const currentIds = new Set(stops.map((s) => s.id));

    // Remove stale markers
    markers.current.forEach((m, key) => {
      if (!currentIds.has(key)) { m.setMap(null); markers.current.delete(key); }
    });

    // Add / update markers
    stops.forEach((stop, idx) => {
      if (markers.current.has(stop.id)) return;
      const cat = catFor(stop.category);
      const marker = new google.maps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map: mapObj.current!,
        title: stop.name,
        label: { text: String(idx + 1), color: "#fff", fontWeight: "bold", fontSize: "12px" },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 18,
          fillColor: cat.color,
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });
      const iw = new google.maps.InfoWindow({
        content: `<div style="font-family:sans-serif;padding:4px 8px"><strong>${stop.name}</strong><br/><span style="color:#6b7280;font-size:12px">${stop.address}</span></div>`,
      });
      marker.addListener("click", () => { iw.open(mapObj.current!, marker); setSelectedStop(stop); });
      markers.current.set(stop.id, marker);
    });

    if (stops.length > 0) drawRoute();
    else { polyline.current?.setMap(null); setLegInfos([]); setTotalRoute(null); }
  }, [stops]);

  // ── Draw route ────────────────────────────────────────────────────────────
  const drawRoute = useCallback(() => {
    if (!mapObj.current || stops.length < 2) {
      polyline.current?.setMap(null);
      setLegInfos([]);
      setTotalRoute(null);
      return;
    }

    const svc = new google.maps.DirectionsService();
    const origin      = { lat: stops[0].lat, lng: stops[0].lng };
    const destination = { lat: stops[stops.length - 1].lat, lng: stops[stops.length - 1].lng };
    const waypoints   = stops.slice(1, -1).map((s) => ({
      location: { lat: s.lat, lng: s.lng },
      stopover: true,
    }));

    svc.route({ origin, destination, waypoints, travelMode: google.maps.TravelMode.DRIVING }, (res, status) => {
      if (status !== "OK" || !res) return;
      const leg0 = res.routes[0].legs;

      const infos: LegInfo[] = leg0.map((l) => ({
        distance: l.distance?.text ?? "—",
        duration: l.duration?.text ?? "—",
      }));
      setLegInfos(infos);

      const totDist = leg0.reduce((a, l) => a + (l.distance?.value ?? 0), 0);
      const totDur  = leg0.reduce((a, l) => a + (l.duration?.value ?? 0), 0);
      setTotalRoute({
        distance: totDist > 1000 ? `${(totDist / 1000).toFixed(1)} km` : `${totDist} m`,
        duration: `${Math.floor(totDur / 3600)}h ${Math.floor((totDur % 3600) / 60)}m`,
      });

      // Draw polyline from overview path
      polyline.current?.setMap(null);
      const path = google.maps.geometry.encoding.decodePath(res.routes[0].overview_polyline);
      polyline.current = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: "#9333ea",
        strokeOpacity: 0.85,
        strokeWeight: 4,
        map: mapObj.current!,
      });

      // Fit bounds
      const bounds = new google.maps.LatLngBounds();
      stops.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }));
      mapObj.current!.fitBounds(bounds, 60);
    });
  }, [stops]);

  // ── Place search ──────────────────────────────────────────────────────────
  const handleSearch = () => {
    if (!mapObj.current || !searchInput.current?.value.trim()) return;
    setSearchLoading(true);
    const svc = new google.maps.places.PlacesService(mapObj.current);
    svc.textSearch(
      { query: searchInput.current.value, location: mapObj.current.getCenter()!, radius: 50000 },
      (results, status) => {
        setSearchLoading(false);
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results) return;
        const top = results.slice(0, 5);
        top.forEach((place) => {
          if (!place.geometry?.location) return;
          addStopFromPlace(place);
        });
        if (top[0]?.geometry?.location) {
          mapObj.current!.setCenter(top[0].geometry.location);
          mapObj.current!.setZoom(14);
        }
      }
    );
  };

  // ── Nearby search ─────────────────────────────────────────────────────────
  const loadNearby = (type: string) => {
    if (!mapObj.current) return;
    setNearbyType(type);
    const svc = new google.maps.places.PlacesService(mapObj.current);
    svc.nearbySearch(
      { location: mapObj.current.getCenter()!, radius: 5000, type },
      (results, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results) return;
        const mapped: Stop[] = results.slice(0, 12).map((p) => ({
          id: uid(),
          name: p.name ?? "Unknown",
          address: p.vicinity ?? "",
          lat: p.geometry!.location!.lat(),
          lng: p.geometry!.location!.lng(),
          category: typeToCategory(type),
          rating: p.rating,
          photo: p.photos?.[0]?.getUrl({ maxWidth: 200 }),
          placeId: p.place_id,
        }));
        setNearby(mapped);
      }
    );
  };

  const typeToCategory = (type: string): Stop["category"] => {
    const map: Record<string, Stop["category"]> = {
      tourist_attraction: "attraction",
      lodging: "hotel",
      restaurant: "restaurant",
      cafe: "cafe",
      shopping_mall: "shopping",
    };
    return map[type] ?? "custom";
  };

  // ── Add stop helpers ──────────────────────────────────────────────────────
  const addStopFromPlace = (place: google.maps.places.PlaceResult, category?: Stop["category"]) => {
    if (!place.geometry?.location) return;
    const stop: Stop = {
      id:       uid(),
      name:     place.name     ?? "Unknown",
      address:  place.formatted_address ?? place.vicinity ?? "",
      lat:      place.geometry.location.lat(),
      lng:      place.geometry.location.lng(),
      category: category ?? typeToCategory(nearbyType),
      // Only set optional fields when they actually have a value
      ...(place.rating                              && { rating:  place.rating }),
      ...(place.photos?.[0]?.getUrl({ maxWidth: 200 }) && { photo: place.photos[0].getUrl({ maxWidth: 200 }) }),
      ...(place.place_id                            && { placeId: place.place_id }),
    };
    setStops((prev) => [...prev, stop]);
  };

  const addNearbyStop = (nearby: Stop) => {
    if (stops.find((s) => s.placeId && s.placeId === nearby.placeId)) return;
    setStops((prev) => [...prev, { ...nearby, id: uid() }]);
  };

  const removeStop = (id: string) => setStops((prev) => prev.filter((s) => s.id !== id));

  // ── Drag reorder (simple swap) ─────────────────────────────────────────────
  const onDragStart = (idx: number) => setDragIdx(idx);
  const onDragOver  = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setStops((prev) => {
      const next = [...prev];
      [next[dragIdx], next[idx]] = [next[idx], next[dragIdx]];
      return next;
    });
    setDragIdx(idx);
  };

  // ── Strip undefined fields (Firestore rejects them) ──────────────────────
  const cleanStop = (stop: Stop): Record<string, any> => {
    const cleaned: Record<string, any> = {
      id:       stop.id,
      name:     stop.name,
      address:  stop.address,
      lat:      stop.lat,
      lng:      stop.lng,
      category: stop.category,
    };
    if (stop.note    !== undefined) cleaned.note    = stop.note;
    if (stop.placeId !== undefined) cleaned.placeId = stop.placeId;
    if (stop.rating  !== undefined) cleaned.rating  = stop.rating;
    if (stop.photo   !== undefined) cleaned.photo   = stop.photo;
    return cleaned;
  };

  // ── Save to Firestore ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    await updateDoc(doc(db, "trips", id as string), {
      stops: stops.map(cleanStop),   // ← strip all undefined fields
    });
    setSaving(false);
  };

  // ── Init Places Autocomplete on search box ────────────────────────────────
  useEffect(() => {
    if (!mapsLoaded || !searchInput.current) return;
    const ac = new google.maps.places.Autocomplete(searchInput.current, { fields: ["geometry", "name", "formatted_address", "rating", "photos", "place_id"] });
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (place.geometry?.location) {
        mapObj.current?.setCenter(place.geometry.location);
        mapObj.current?.setZoom(15);
        addStopFromPlace(place, "attraction");
      }
    });
  }, [mapsLoaded]);

  if (!trip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white text-xl">Loading trip...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <header className="flex-none flex items-center justify-between px-5 py-3 bg-gray-950/95 backdrop-blur border-b border-white/10 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Palmtree className="w-7 h-7 text-emerald-400 -rotate-12" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            </div>
            <span className="text-white font-bold text-lg">Trip-o-leaf</span>
          </div>
          <span className="text-white/30">|</span>
          <h1 className="text-white font-semibold truncate max-w-[180px]">{trip.title}</h1>
          <span className="hidden md:flex items-center gap-1 text-xs text-white/50 bg-white/10 px-2 py-1 rounded-full">
            <MapPin className="w-3 h-3" />{trip.destination}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-4 text-sm text-white/60">
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{trip.startDate} → {trip.endDate}</span>
            <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" />₹{trip.budget}</span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:scale-105 transition-all disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Trip"}
          </button>
        </div>
      </header>

      {/* ── Main area ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT PANEL ───────────────────────────────────────────────────── */}
        <aside className="w-96 flex-none flex flex-col bg-gray-950 border-r border-white/10 overflow-hidden z-10">

          {/* Search bar */}
          <div className="flex-none p-4 border-b border-white/10">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  ref={searchInput}
                  placeholder="Search a place to add…"
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/40 text-sm outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searchLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 rounded-xl transition-colors"
              >
                {searchLoading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Plus className="w-4 h-4" />
                }
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex-none flex border-b border-white/10">
            {(["stops", "nearby", "route"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); if (tab === "nearby") loadNearby(nearbyType); }}
                className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors ${
                  activeTab === tab
                    ? "text-white border-b-2 border-purple-500"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {tab === "stops" ? `Stops (${stops.length})` : tab === "nearby" ? "Explore" : "Route"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto custom-scroll">

            {/* ── STOPS TAB ──────────────────────────────────────────────── */}
            {activeTab === "stops" && (
              <div className="p-3 space-y-2">
                {stops.length === 0 && (
                  <div className="text-center py-12 text-white/40">
                    <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Search for places or explore nearby spots to add stops</p>
                  </div>
                )}
                {stops.map((stop, idx) => {
                  const cat = catFor(stop.category);
                  const Icon = cat.icon;
                  const leg = legInfos[idx]; // leg FROM previous stop TO this stop
                  return (
                    <div key={stop.id}>
                      {/* Leg info connector */}
                      {idx > 0 && leg && (
                        <div className="flex items-center gap-2 pl-5 py-1">
                          <div className="w-0.5 h-4 bg-purple-500/40 ml-3" />
                          <span className="text-xs text-purple-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{leg.duration}
                            <Route className="w-3 h-3 ml-1" />{leg.distance}
                          </span>
                        </div>
                      )}
                      <div
                        draggable
                        onDragStart={() => onDragStart(idx)}
                        onDragOver={(e) => onDragOver(e, idx)}
                        onClick={() => {
                          setSelectedStop(stop);
                          mapObj.current?.setCenter({ lat: stop.lat, lng: stop.lng });
                          mapObj.current?.setZoom(16);
                        }}
                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all group border ${
                          selectedStop?.id === stop.id
                            ? "bg-white/10 border-purple-500/50"
                            : "bg-white/5 border-transparent hover:bg-white/8 hover:border-white/10"
                        }`}
                      >
                        <Grip className="w-4 h-4 text-white/20 mt-1 flex-none cursor-grab" />
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center flex-none text-xs font-bold text-white"
                          style={{ background: cat.color }}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{stop.name}</p>
                          <p className="text-white/40 text-xs truncate">{stop.address}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: cat.bg, color: cat.color }}>
                              <Icon className="w-3 h-3 inline mr-1" />{cat.label}
                            </span>
                            {stop.rating && (
                              <span className="text-xs text-yellow-400 flex items-center gap-0.5">
                                <Star className="w-3 h-3 fill-yellow-400" />{stop.rating}
                              </span>
                            )}
                          </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); removeStop(stop.id); }} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 rounded-lg transition-all text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {stops.length >= 2 && (
                  <button
                    onClick={drawRoute}
                    className="w-full mt-2 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-semibold hover:scale-105 transition-all flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-4 h-4" /> Calculate Route
                  </button>
                )}
              </div>
            )}

            {/* ── NEARBY TAB ─────────────────────────────────────────────── */}
            {activeTab === "nearby" && (
              <div className="flex flex-col">
                {/* Type filter chips */}
                <div className="flex gap-2 p-3 overflow-x-auto flex-none">
                  {NEARBY_TYPES.map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => loadNearby(type)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                        nearbyType === type
                          ? "bg-purple-600 text-white"
                          : "bg-white/10 text-white/60 hover:bg-white/15"
                      }`}
                    >
                      <Icon className="w-3 h-3" />{label}
                    </button>
                  ))}
                </div>

                <div className="p-3 space-y-2">
                  {nearby.length === 0 && (
                    <div className="text-center py-12 text-white/40">
                      <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Select a category to explore nearby places</p>
                    </div>
                  )}
                  {nearby.map((place) => {
                    const cat = catFor(place.category);
                    const Icon = cat.icon;
                    const added = stops.some((s) => s.placeId && s.placeId === place.placeId);
                    return (
                      <div key={place.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-all">
                        {place.photo
                          ? <img src={place.photo} alt={place.name} className="w-14 h-14 rounded-xl object-cover flex-none" />
                          : <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-none" style={{ background: cat.bg }}>
                              <Icon className="w-6 h-6" style={{ color: cat.color }} />
                            </div>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{place.name}</p>
                          <p className="text-white/40 text-xs truncate">{place.address}</p>
                          {place.rating && (
                            <span className="text-xs text-yellow-400 flex items-center gap-0.5 mt-0.5">
                              <Star className="w-3 h-3 fill-yellow-400" />{place.rating}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => addNearbyStop(place)}
                          disabled={added}
                          className={`flex-none px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            added
                              ? "bg-green-600/20 text-green-400 cursor-default"
                              : "bg-purple-600 hover:bg-purple-700 text-white hover:scale-105"
                          }`}
                        >
                          {added ? "Added ✓" : <Plus className="w-4 h-4" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── ROUTE TAB ──────────────────────────────────────────────── */}
            {activeTab === "route" && (
              <div className="p-4 space-y-4">
                {stops.length < 2 ? (
                  <div className="text-center py-12 text-white/40">
                    <Route className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Add at least 2 stops to see route details</p>
                  </div>
                ) : (
                  <>
                    {/* Summary card */}
                    {totalRoute && (
                      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-4">
                        <p className="text-white/60 text-xs uppercase tracking-widest mb-2">Total Journey</p>
                        <div className="flex items-center justify-between">
                          <div className="text-center">
                            <p className="text-white text-2xl font-bold">{totalRoute.distance}</p>
                            <p className="text-white/50 text-xs">Distance</p>
                          </div>
                          <ChevronRight className="text-white/20 w-5 h-5" />
                          <div className="text-center">
                            <p className="text-white text-2xl font-bold">{totalRoute.duration}</p>
                            <p className="text-white/50 text-xs">Drive Time</p>
                          </div>
                          <ChevronRight className="text-white/20 w-5 h-5" />
                          <div className="text-center">
                            <p className="text-white text-2xl font-bold">{stops.length}</p>
                            <p className="text-white/50 text-xs">Stops</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Per-leg breakdown */}
                    <div className="space-y-2">
                      {stops.map((stop, idx) => {
                        const cat = catFor(stop.category);
                        const leg = legInfos[idx - 1];
                        return (
                          <div key={stop.id}>
                            {leg && (
                              <div className="flex items-center gap-3 pl-8 py-1">
                                <div className="flex flex-col items-center gap-0.5">
                                  <div className="w-0.5 h-3 bg-purple-500/40" />
                                  <div className="w-0.5 h-3 bg-purple-500/40" />
                                </div>
                                <div className="text-xs text-purple-400 flex gap-3">
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{leg.duration}</span>
                                  <span className="flex items-center gap-1"><Route className="w-3 h-3" />{leg.distance}</span>
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-none" style={{ background: cat.color }}>
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-semibold truncate">{stop.name}</p>
                                <p className="text-white/40 text-xs truncate">{stop.address}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => {
                        const waypts = stops.map(s => `${s.lat},${s.lng}`).join("/");
                        window.open(`https://www.google.com/maps/dir/${waypts}`, "_blank");
                      }}
                      className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <Navigation className="w-4 h-4" /> Open in Google Maps
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* ── MAP ──────────────────────────────────────────────────────────── */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" />

          {/* Map overlay - selected stop detail */}
          {selectedStop && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-950/95 backdrop-blur-xl border border-white/20 rounded-2xl p-4 w-80 shadow-2xl animate-[fadeInUp_0.3s_ease-out]">
              <div className="flex items-start gap-3">
                {selectedStop.photo
                  ? <img src={selectedStop.photo} alt="" className="w-16 h-16 rounded-xl object-cover flex-none" />
                  : <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-none" style={{ background: catFor(selectedStop.category).bg }}>
                      {(() => { const I = catFor(selectedStop.category).icon; return <I className="w-7 h-7" style={{ color: catFor(selectedStop.category).color }} />; })()}
                    </div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold truncate">{selectedStop.name}</p>
                  <p className="text-white/50 text-xs truncate">{selectedStop.address}</p>
                  {selectedStop.rating && (
                    <span className="text-yellow-400 text-xs flex items-center gap-0.5 mt-1">
                      <Star className="w-3 h-3 fill-yellow-400" />{selectedStop.rating} rating
                    </span>
                  )}
                </div>
                <button onClick={() => setSelectedStop(null)} className="text-white/40 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Map loading overlay */}
          {!mapsLoaded && (
            <div className="absolute inset-0 bg-gray-950 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
                <p className="text-white/60 text-sm">Loading map…</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}