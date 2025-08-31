import { getCurrentLocation, LocationData } from "@/core/maps/maps-services";
import { lightIceBlueMapStyle } from "@/core/themes/map-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface MapComponentProps {
  onLocationUpdate?: (location: LocationData) => void;
  onLocationLoading?: (loading: boolean) => void;
}

export default function MapComponent({ onLocationUpdate, onLocationLoading }: MapComponentProps) {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [mapRegion, setMapRegion] = useState<MapRegion | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isMounted, setIsMounted] = useState(true);

  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    loadCurrentLocation();
    return () => {
      setIsMounted(false);
    };
  }, []);

  // Expose method to parent
  useEffect(() => {
    if (window) {
      (window as any).animateToCurrentLocation = animateToCurrentLocation;
    }
  }, [currentLocation]);

  //------------------------------------------
  const handleMapReady = useCallback(() => {
    console.log("Map is ready");
    if (currentLocation && mapRef.current && isMounted) {
      const region = {
        latitude: currentLocation.coordinates.latitude,
        longitude: currentLocation.coordinates.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setTimeout(() => {
        if (mapRef.current && isMounted) {
          mapRef.current.animateToRegion(region, 1000);
        }
      }, 500);
    }
  }, [currentLocation, isMounted]);

  //-------------------------------------------
  const handleRegionChange = useCallback(
    (region: MapRegion) => {
      if (isMounted) {
        setMapRegion(region);
      }
    },
    [isMounted]
  );

  //---------------------------------------------
  const loadCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      onLocationLoading?.(true);

      const location = await getCurrentLocation();

      if (!isMounted) return;

      if (location) {
        setCurrentLocation(location);
        onLocationUpdate?.(location);

        const newRegion = {
          latitude: location.coordinates.latitude,
          longitude: location.coordinates.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setMapRegion(newRegion);

        if (mapRef.current && isMounted) {
          setTimeout(() => {
            if (mapRef.current && isMounted) {
              mapRef.current.animateToRegion(newRegion, 1000);
            }
          }, 100);
        }
      }
    } catch (error) {
      console.error("Error loading current location:", error);
    } finally {
      if (isMounted) {
        setIsLoadingLocation(false);
        onLocationLoading?.(false);
      }
    }
  };

  //----------------------------------------------------
  const animateToCurrentLocation = () => {
    if (currentLocation && mapRef.current && isMounted) {
      const region = {
        latitude: currentLocation.coordinates.latitude,
        longitude: currentLocation.coordinates.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current.animateToRegion(region, 1000);
    }
  };

  if (isLoadingLocation || !mapRegion) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <Text className="text-gray-600 text-lg">Getting your location...</Text>
      </View>
    );
  }

  return (
    <MapView
      ref={mapRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
      provider={PROVIDER_GOOGLE}
      region={mapRegion}
      customMapStyle={lightIceBlueMapStyle}
      showsUserLocation={false} // We'll use our own marker
      showsMyLocationButton={false} // We'll create our own
      showsCompass={false} // Remove default controls
      showsScale={false}
      showsBuildings={true}
      showsTraffic={false}
      showsIndoors={true}
      mapType="standard"
      scrollEnabled={true}
      zoomEnabled={true}
      rotateEnabled={true}
      pitchEnabled={true}
      onRegionChange={handleRegionChange}
      onMapReady={handleMapReady}
    >
      {/* Current Location Marker */}
      {currentLocation && currentLocation.coordinates && <Marker coordinate={currentLocation.coordinates} title="Your Location" description={currentLocation.address} pinColor="#3B82F6" />}
    </MapView>
  );
}
