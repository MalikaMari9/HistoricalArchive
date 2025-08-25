import L from "leaflet";
import { MapPin, Star } from "lucide-react";
import { Marker, Popup } from "react-leaflet";
import { useNavigate } from "react-router-dom";

// Artifact interface
interface Artifact {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  category?: string;
  culture?: string;
  period?: string;
  medium?: string;
  location?: {
    city?: string;
    country?: string;
    continent?: string;
    latitude?: number;
    longitude?: number;
  };
  image_url?: string;
  images?: Array<{ baseimageurl?: string }>;
  averageRating?: number;
  totalRatings?: number;
  artist_name?: string;
}

interface MuseumMarkerProps {
  artifact: Artifact;
}

// Category to icon and color mapping
const CATEGORY_CONFIG = {
  painting: { icon: "🎨", color: "#e74c3c", emoji: "🖼️" },
  sculpture: { icon: "🗿", color: "#3498db", emoji: "🗿" },
  pottery: { icon: "🏺", color: "#f39c12", emoji: "🏺" },
  jewelry: { icon: "💎", color: "#9b59b6", emoji: "💍" },
  textile: { icon: "🧵", color: "#27ae60", emoji: "🧶" },
  manuscript: { icon: "📜", color: "#8e44ad", emoji: "📚" },
  weapon: { icon: "⚔️", color: "#34495e", emoji: "🗡️" },
  coin: { icon: "🪙", color: "#f1c40f", emoji: "💰" },
  tool: { icon: "🔨", color: "#95a5a6", emoji: "🛠️" },
  default: { icon: "🏛️", color: "#2c3e50", emoji: "🏛️" },
};

// Create custom divIcon for artifact categories
const createMuseumIcon = (category?: string) => {
  const config =
    CATEGORY_CONFIG[category?.toLowerCase() as keyof typeof CATEGORY_CONFIG] ||
    CATEGORY_CONFIG.default;

  return L.divIcon({
    html: `
      <div class="museum-marker marker-${
        category?.toLowerCase() || "default"
      }" style="
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${config.color};
        color: white;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        font-size: 20px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
      ">
        ${config.icon}
        <div style="
          position: absolute;
          bottom: -2px;
          right: -2px;
          background: white;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        ">
          ${config.emoji}
        </div>
      </div>
    `,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

// Get artifact image with fallback
const getArtifactImage = (artifact: Artifact) => {
  return (
    artifact.image_url ||
    artifact.images?.[0]?.baseimageurl ||
    "/placeholder-art.jpg"
  );
};

// Format category name
const formatCategory = (category?: string) => {
  if (!category) return "Unknown";
  return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
};

export default function MuseumMarker({ artifact }: MuseumMarkerProps) {
  const navigate = useNavigate();
  if (!artifact.location?.latitude || !artifact.location?.longitude) {
    return null;
  }

  const position: [number, number] = [
    artifact.location.latitude,
    artifact.location.longitude,
  ];

  const icon = createMuseumIcon(artifact.category);

  return (
    <Marker position={position} icon={icon}>
      <Popup
        className="museum-popup"
        closeButton={true}
        maxWidth={320}
        minWidth={280}
      >
        <div className="museum-popup-content">
          {/* Header */}
          <div className="museum-popup-header">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">Cultural Artifact</span>
            </div>
          </div>

          {/* Body */}
          <div className="museum-popup-body">
            {/* Image */}
            <img
              src={getArtifactImage(artifact)}
              alt={artifact.title}
              className="museum-popup-image"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder-art.jpg";
              }}
            />

            {/* Category Badge */}
            <div className="museum-popup-category">
              {formatCategory(artifact.category)}
            </div>

            {/* Title */}
            <h3 className="museum-popup-title">{artifact.title}</h3>

            {/* Artist if available */}
            {artifact.artist_name && (
              <p className="text-sm text-gray-600 mb-2 italic">
                by {artifact.artist_name}
              </p>
            )}

            {/* Location */}
            <div className="museum-popup-location">
              {artifact.location?.city && artifact.location?.country
                ? `${artifact.location.city}, ${artifact.location.country}`
                : artifact.location?.country || "Unknown location"}
            </div>

            {/* Rating */}
            {artifact.averageRating && artifact.averageRating > 0 && (
              <div className="museum-popup-rating">
                <Star className="w-4 h-4 fill-current" />
                <span className="font-medium">
                  {artifact.averageRating.toFixed(1)}
                </span>
                <span className="text-gray-500">
                  ({artifact.totalRatings} reviews)
                </span>
              </div>
            )}

            {/* Additional Info */}
            <div className="space-y-2 mb-4 text-sm">
              {artifact.culture && (
                <div>
                  <span className="font-medium text-gray-700">Culture:</span>{" "}
                  <span className="text-gray-600">{artifact.culture}</span>
                </div>
              )}
              {artifact.period && (
                <div>
                  <span className="font-medium text-gray-700">Period:</span>{" "}
                  <span className="text-gray-600">{artifact.period}</span>
                </div>
              )}
              {artifact.medium && (
                <div>
                  <span className="font-medium text-gray-700">Medium:</span>{" "}
                  <span className="text-gray-600">{artifact.medium}</span>
                </div>
              )}
            </div>

            {/* Action Button */}
            <button
              className="museum-popup-button"
              onClick={() =>
                navigate(`/artwork/${artifact._id || artifact.id}`)
              }
            >
              View Full Details
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
