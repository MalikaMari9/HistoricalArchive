import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMap } from "react-leaflet";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, LocateFixed } from "lucide-react";

export interface LocationInfo {
  placename?: string;
  city?: string;
  country?: string;
  
  latitude?: number;
  longitude?: number;
}

interface LocationPickerProps {
  value: LocationInfo;
  onChange: (loc: LocationInfo) => void;
  disabled?: boolean;
}

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    county?:string;
    state?:string;
    country?: string;
    
  };
}

export default function LocationPicker({ value, onChange, disabled }: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState(value.placename || "");
    const [mapLoading, setMapLoading] = useState(false);

  const [isFetching, setIsFetching] = useState(false); // ✅ add this
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [position, setPosition] = useState<[number, number]>([
    value.latitude || 20.0,
    value.longitude || 0.0,
  ]);
const [recenterFlag, setRecenterFlag] = useState(false);

const justSelectedRef = useRef(false);

  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
  if (recenterFlag && mapRef.current && value.latitude && value.longitude) {
    mapRef.current.setView([value.latitude, value.longitude], 12);
    setRecenterFlag(false); // Reset after action
  }
}, [recenterFlag, value.latitude, value.longitude]);


function MapRecenteringHandler({ lat, lng }: { lat?: number; lng?: number }) {
  const map = useMap();

  useEffect(() => {
    if (lat != null && lng != null) {
      console.log("🔁 Re-centering to:", lat, lng);
      map.setView([lat, lng], 12);
    }
  }, [lat, lng, map]);

  return null;
}

const fetchSuggestions = async (query: string) => {
  if (!query.trim()) return;
  setIsFetching(true); // ✅
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1`
    );
    const data = await res.json();
    setSuggestions(data.slice(0, 5));
  } catch (err) {
    console.error("Suggestion fetch error:", err);
  } finally {
    setIsFetching(false); // ✅
  }
};

const reverseLookup = async (lat: number, lon: number) => {
  setMapLoading(true);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`
    );
    const data = await res.json();
    const addr = data.address || {};

    const isTokyo =
      addr["ISO3166-2-lvl4"] === "JP-13" ||
      addr.state === "Tokyo" ||
      data.display_name.includes("Tokyo");

    const city = isTokyo
      ? "Tokyo"
      : addr.city ||
        addr.town ||
        addr.village ||
        addr.state ||
        "";

    const country = addr.country || "";

    onChange({
      ...value,
      placename: data.display_name,
      city,
      country,
      latitude: lat,
      longitude: lon,
    });
  } catch (err) {
    console.error("Reverse geocode failed", err);
  } finally {
    setMapLoading(false);
  }
};

const recenterToMarker = () => {
  if (mapRef.current && value.latitude && value.longitude) {
    console.log("📍 Re-centering to", value.latitude, value.longitude);
    mapRef.current.setView([value.latitude, value.longitude], 12);
  } else {
    console.warn("⚠️ Cannot recenter, mapRef or coordinates missing");
  }
};


  const handleSuggestionClick = (loc: Suggestion) => {
    console.log("📍 Selected suggestion:", loc);
console.log("📍 Address object:", loc.address);

    const lat = parseFloat(loc.lat);
    const lon = parseFloat(loc.lon);
   const isTokyo =
  loc.address["ISO3166-2-lvl4"] === "JP-13" ||
  loc.address.state === "Tokyo" ||
  loc.display_name.includes("Tokyo");

const city = isTokyo
  ? "Tokyo"
  : loc.address.city ||
    loc.address.town ||
    loc.address.village ||
    loc.address.state ||
    "";

const country = loc.address.country || "";


    
    const newLoc: LocationInfo = {
      placename: loc.display_name,
      city,
      country,
     
      latitude: lat,
      longitude: lon,
    };

    setSearchQuery(loc.display_name);
    justSelectedRef.current = true;
    setSuggestions([]);
    setPosition([lat, lon]);
    onChange(newLoc);

    if (mapRef.current) {
      mapRef.current.setView([lat, lon], 17); //FIx zoom here
    }
  };

  const MapEvents = () => {
    useMapEvents({
      dragend: () => {
        const marker = markerRef.current;
        if (marker) {
          const { lat, lng } = marker.getLatLng();
          onChange({ ...value, latitude: lat, longitude: lng });
        }
      },
    });
    return null;
  };

useEffect(() => {
  if (mapRef.current) {
    console.log("✅ Map is available in useEffect");
  } else {
    console.warn("❌ mapRef.current is still null");
  }
}, [mapRef.current]);

useEffect(() => {
  if (timeoutRef.current) clearTimeout(timeoutRef.current);

  timeoutRef.current = setTimeout(() => {
    if (!justSelectedRef.current) {
      fetchSuggestions(searchQuery);
    } else {
      justSelectedRef.current = false; // ✅ reset after skip
    }
  }, 400);
}, [searchQuery]);

  return (
    <div className="space-y-2 relative">
      <Label>Search Place</Label>
      <div className="flex gap-2 relative">
<Input
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  disabled={disabled} // ✅ don't block typing
  placeholder="e.g., Tokyo National Museum"
/>

{(isFetching || suggestions.length > 0) && (
  <ul className="absolute top-full mt-1 w-full bg-white border border-gray-300 rounded-md shadow z-10 max-h-48 overflow-auto">
    {isFetching && (
      <li className="px-3 py-2 text-sm text-gray-500 italic flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading suggestions...
      </li>
    )}
    {!isFetching &&
      suggestions.map((s, idx) => (
        <li
          key={idx}
          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
          onClick={() => handleSuggestionClick(s)}
        >
          {s.display_name}
        </li>
      ))}
  </ul>
)}



      </div>

      <div className="h-64 w-full mt-4 rounded-md overflow-hidden border relative">
        {mapLoading && (
  <div className="absolute top-2 right-2 bg-white bg-opacity-75 rounded px-2 py-1 flex items-center gap-2 text-sm shadow z-[1000]">

    <Loader2 className="h-4 w-4 animate-spin" />
    Loading map data...
  </div>
)}
<button
  type="button"
  onClick={() => setRecenterFlag(true)} // ✅ trigger
  className="absolute top-2 right-2 z-[1000] p-2 bg-white border border-gray-300 rounded-full shadow hover:bg-gray-100"
  title="Center to Marker"
>
  <LocateFixed className="h-5 w-5 text-gray-700" />
</button>

  
        <MapContainer
          center={position}
          zoom={5}
          scrollWheelZoom
          style={{ height: "100%" }}
          whenReady={() => console.log("Map ready")}
          ref={(node) => {
            if (node && !mapRef.current) {
              mapRef.current = node;
            }
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <Marker
            position={position}
            draggable
            ref={markerRef}
eventHandlers={{
  dragend: () => {
    const marker = markerRef.current;
    if (marker) {
      const { lat, lng } = marker.getLatLng();
      reverseLookup(lat, lng); // ✅ auto-update location info
    }
  },
}}

          />
          <MapEvents />
        </MapContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
  <Label>Place Name</Label>
  <Input
    value={value.placename || ""}
    onChange={(e) => onChange({ ...value, placename: e.target.value })}
    placeholder="e.g., Tokyo National Museum"
  />
</div>

        <div>
          <Label>City</Label>
         <Input
  value={value.city || ""}
  onChange={(e) => onChange({ ...value, city: e.target.value })}
  placeholder="City (auto-filled, editable)"
/>

        </div>
        <div>
          <Label>Country</Label>
          <Input value={value.country || ""} disabled readOnly />
        </div>
       
        <div>
          <Label>Latitude</Label>
          <Input value={value.latitude?.toFixed(6) || ""} disabled readOnly />
        </div>
        <div>
          <Label>Longitude</Label>
          <Input value={value.longitude?.toFixed(6) || ""} disabled readOnly />
        </div>
      </div>
    </div>
  );
}
