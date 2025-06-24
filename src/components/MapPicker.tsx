import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';

// Dynamic import for leaflet to avoid SSR issues
let L: any = null;

const loadLeaflet = async () => {
  if (typeof window !== 'undefined' && !L) {
    try {
      const leafletModule = await import('leaflet');
      L = leafletModule.default;
      
      // Import CSS dynamically
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(cssLink);
      
      // Fix for default markers in Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    } catch (error) {
      console.error('Failed to load Leaflet:', error);
      return null;
    }
  }
  return L;
};

interface MapPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationChange: (lat: number, lng: number, address?: string) => void;
  height?: string;
}

export const MapPicker: React.FC<MapPickerProps> = ({
  latitude = 13.7563,
  longitude = 100.5018,
  onLocationChange,
  height = '400px'
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Clean up function to remove map instance
  const cleanupMap = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    }
  };

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;
      
      const leaflet = await loadLeaflet();
      if (!leaflet) {
        console.error('Leaflet failed to load');
        return;
      }

      // If map already exists, just update its position
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([latitude, longitude], 13);
        if (markerRef.current) {
          markerRef.current.setLatLng([latitude, longitude]);
        }
        return;
      }
      
      // Clear the container completely to prevent re-initialization errors
      mapRef.current.innerHTML = '';
      
      // Initialize map only if it doesn't exist
      mapInstanceRef.current = leaflet.map(mapRef.current).setView([latitude, longitude], 13);

      // Add tile layer
      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      // Add initial marker
      markerRef.current = leaflet.marker([latitude, longitude], {
        draggable: true
      }).addTo(mapInstanceRef.current);

      // Handle marker drag
      markerRef.current.on('dragend', async (e: any) => {
        const marker = e.target;
        const position = marker.getLatLng();
        await reverseGeocode(position.lat, position.lng);
      });

      // Handle map click
      mapInstanceRef.current.on('click', async (e: any) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          await reverseGeocode(lat, lng);
        }
      });
    };

    initMap();

    return () => {
      cleanupMap();
    };
  }, [latitude, longitude]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      onLocationChange(lat, lng, address);
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      onLocationChange(lat, lng);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        
        // Update map view and marker
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 15);
          markerRef.current.setLatLng([lat, lng]);
        }
        
        // Get address and notify parent
        await reverseGeocode(lat, lng);
        setGettingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Unable to get your location. ';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please enable location permissions and try again.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
            break;
        }
        
        alert(errorMessage);
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Click on the map or drag the marker to set location
        </div>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={gettingLocation}
          className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {gettingLocation ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Getting location...</span>
            </>
          ) : (
            <>
              <Navigation className="h-4 w-4" />
              <span>Use Current Location</span>
            </>
          )}
        </button>
      </div>
      
      <div 
        ref={mapRef} 
        style={{height}} 
        className="w-full rounded-lg border border-gray-200"
      />
      
      <div className="text-sm text-gray-600 flex items-center space-x-2">
        <MapPin className="h-4 w-4 text-gray-500" />
        <span>Current coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
      </div>
    </div>
  );
};