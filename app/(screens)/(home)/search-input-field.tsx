import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Building, Car, Clock, Hospital, MapPin, Navigation, Plus, Search, ShoppingBag, Star, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Keyboard, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, FadeInUp, FadeOutUp, Layout, SlideInRight, SlideOutLeft } from "react-native-reanimated";

// Import map services
import { addIconsToLocations, autoCompleteLocation, geocodeLatAndLong, getCurrentLocation, LocationCoordinate, LocationData } from "@/core/maps/maps-services";

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface StopPoint {
  id: string;
  address: string;
  placeholder: string;
  coordinates?: LocationCoordinate;
}

interface SuggestedLocation {
  id: string;
  address: string;
  coordinates?: LocationCoordinate;
  type: "recent" | "favorite" | "search" | "nearby";
  icon: any;
  placeId?: string;
  category?: string;
}

const SearchInputField = () => {
  const params = useLocalSearchParams();
  const currentLocationParam = params.currentLocation as string;

  const [pickupAddress, setPickupAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [stopPoints, setStopPoints] = useState<StopPoint[]>([]);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [searchResults, setSearchResults] = useState<SuggestedLocation[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<SuggestedLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const pickupRef = useRef<TextInput>(null);
  const destinationRef = useRef<TextInput>(null);
  const stopRefs = useRef<{ [key: string]: TextInput | null }>({});
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize current location from params or get it fresh
  useEffect(() => {
    if (currentLocationParam) {
      try {
        const location = JSON.parse(currentLocationParam);
        setCurrentLocation(location);
        loadNearbyPlaces(location.coordinates);
      } catch (error) {
        console.error("Error parsing current location:", error);
        loadCurrentLocation();
      }
    } else {
      loadCurrentLocation();
    }
  }, [currentLocationParam]);

  const loadCurrentLocation = async () => {
    try {
      const location = await getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
        loadNearbyPlaces(location.coordinates);
      }
    } catch (error) {
      console.error("Error loading current location:", error);
    }
  };

  const loadNearbyPlaces = async (coordinates: LocationCoordinate) => {
    try {
      const [restaurants, hospitals, gasStations, malls] = await Promise.all([addIconsToLocations(coordinates, "restaurant", 2000), addIconsToLocations(coordinates, "hospital", 5000), addIconsToLocations(coordinates, "gas_station", 3000), addIconsToLocations(coordinates, "shopping_mall", 5000)]);

      const allNearbyPlaces: SuggestedLocation[] = [
        ...restaurants.slice(0, 3).map((place: any) => ({
          id: place.placeId,
          address: place.name + " - " + place.address,
          coordinates: place.coordinates,
          type: "nearby" as const,
          icon: Building,
          placeId: place.placeId,
          category: "Restaurant",
        })),
        ...hospitals.slice(0, 2).map((place: any) => ({
          id: place.placeId,
          address: place.name + " - " + place.address,
          coordinates: place.coordinates,
          type: "nearby" as const,
          icon: Hospital,
          placeId: place.placeId,
          category: "Hospital",
        })),
        ...gasStations.slice(0, 2).map((place: any) => ({
          id: place.placeId,
          address: place.name + " - " + place.address,
          coordinates: place.coordinates,
          type: "nearby" as const,
          icon: Car,
          placeId: place.placeId,
          category: "Gas Station",
        })),
        ...malls.slice(0, 2).map((place: any) => ({
          id: place.placeId,
          address: place.name + " - " + place.address,
          coordinates: place.coordinates,
          type: "nearby" as const,
          icon: ShoppingBag,
          placeId: place.placeId,
          category: "Shopping",
        })),
      ];

      setNearbyPlaces(allNearbyPlaces);
    } catch (error) {
      console.error("Error loading nearby places:", error);
    }
  };

  // Perform search with autocomplete
  const performSearch = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await autoCompleteLocation(query, currentLocation?.coordinates);
      const suggestedLocations: SuggestedLocation[] = results.map((location: any, index: any) => ({
        id: `search_${index}`,
        address: location.address,
        coordinates: location.coordinates,
        type: "search" as const,
        icon: MapPin,
        placeId: location.placeId,
      }));

      setSearchResults(suggestedLocations);
    } catch (error) {
      console.error("Error performing search:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle input change with debounced search
  const handleInputChange = (text: string, inputType: string, stopId?: string) => {
    if (inputType === "pickup") {
      setPickupAddress(text);
    } else if (inputType === "destination") {
      setDestinationAddress(text);
    } else if (stopId) {
      setStopPoints((prev) => prev.map((stop) => (stop.id === stopId ? { ...stop, address: text } : stop)));
    }

    // Debounced search
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (text.trim().length >= 2) {
      searchTimeout.current = setTimeout(() => {
        setSearchQuery(text);
        performSearch(text);
      }, 300);
    } else {
      setSearchResults([]);
    }
  };

  // Recent locations for suggestions (you can load these from storage)
  const recentLocations: SuggestedLocation[] = [
    {
      id: "1",
      address: "123 Main St, Downtown",
      type: "recent",
      icon: Clock,
      coordinates: { latitude: 37.7849, longitude: -122.4194 },
    },
    {
      id: "2",
      address: "Central Mall, Shopping District",
      type: "recent",
      icon: Clock,
      coordinates: { latitude: 37.7849, longitude: -122.4094 },
    },
    {
      id: "3",
      address: "Airport Terminal 1",
      type: "recent",
      icon: Clock,
      coordinates: { latitude: 37.6213, longitude: -122.379 },
    },
  ];

  const favoriteLocations: SuggestedLocation[] = [
    {
      id: "1",
      address: "Home - 456 Oak Avenue",
      type: "favorite",
      icon: Star,
      coordinates: { latitude: 37.7849, longitude: -122.4294 },
    },
    {
      id: "2",
      address: "Work - Tech Hub Building",
      type: "favorite",
      icon: Star,
      coordinates: { latitude: 37.7949, longitude: -122.4294 },
    },
  ];

  const handleGoBack = () => {
    router.back();
  };

  const addStopPoint = () => {
    if (stopPoints.length >= 3) {
      Alert.alert("Maximum Stops", "You can only add up to 3 stop points");
      return;
    }

    const newStop: StopPoint = {
      id: `stop_${Date.now()}`,
      address: "",
      placeholder: `Add stop`,
    };

    setStopPoints((prev) => [...prev, newStop]);
  };

  const removeStopPoint = (stopId: string) => {
    setStopPoints((prev) => prev.filter((stop) => stop.id !== stopId));
  };

  const handleLocationSelect = async (location: SuggestedLocation) => {
    let coordinates = location.coordinates;

    // If coordinates not available, geocode the address
    if (!coordinates && location.placeId) {
      try {
        const geocoded = await geocodeLatAndLong(location.address);
        coordinates = geocoded?.coordinates;
      } catch (error) {
        console.error("Error geocoding selected location:", error);
      }
    }

    if (focusedInput === "pickup") {
      setPickupAddress(location.address);
    } else if (focusedInput === "destination") {
      setDestinationAddress(location.address);
    } else if (focusedInput && focusedInput.startsWith("stop_")) {
      setStopPoints((prev) => prev.map((stop) => (stop.id === focusedInput ? { ...stop, address: location.address, coordinates } : stop)));
    }

    setFocusedInput(null);
    setSearchResults([]);
    Keyboard.dismiss();
  };

  const handleSearch = async () => {
    if (!pickupAddress.trim()) {
      Alert.alert("Pickup Required", "Please enter a pickup location");
      return;
    }
    if (!destinationAddress.trim()) {
      Alert.alert("Destination Required", "Please enter a destination");
      return;
    }

    // You can navigate to a map view or booking screen here
    console.log("Search with:", {
      pickup: pickupAddress,
      destination: destinationAddress,
      stops: stopPoints.filter((stop) => stop.address.trim()),
      currentLocation,
    });

    // Navigate to map results screen
    router.push({
      pathname: "/(screens)/(home)/map-results",
      params: {
        pickup: pickupAddress,
        destination: destinationAddress,
        stops: JSON.stringify(stopPoints.filter((stop) => stop.address.trim())),
        currentLocation: JSON.stringify(currentLocation),
      },
    });
  };

  const getCurrentLocationForInput = async (inputType: string, stopId?: string) => {
    try {
      const location = await getCurrentLocation();
      if (location) {
        const address = location.address;

        if (inputType === "pickup") {
          setPickupAddress(address);
        } else if (inputType === "destination") {
          setDestinationAddress(address);
        } else if (stopId) {
          setStopPoints((prev) => prev.map((stop) => (stop.id === stopId ? { ...stop, address, coordinates: location.coordinates } : stop)));
        }
      }
    } catch (error) {
      console.error("Error getting current location:", error);
      Alert.alert("Location Error", "Failed to get your current location");
    }
  };

  const clearInput = (inputType: string, stopId?: string) => {
    if (inputType === "pickup") {
      setPickupAddress("");
    } else if (inputType === "destination") {
      setDestinationAddress("");
    } else if (stopId) {
      setStopPoints((prev) => prev.map((stop) => (stop.id === stopId ? { ...stop, address: "", coordinates: undefined } : stop)));
    }
    setSearchResults([]);
  };

  // Get current suggestions based on focused input and search state
  const getCurrentSuggestions = (): SuggestedLocation[] => {
    if (searchResults.length > 0) {
      return searchResults;
    }

    if (!focusedInput) return [];

    // Show all suggestions when input is focused but no search results
    return [...favoriteLocations, ...recentLocations, ...nearbyPlaces];
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 font-JakartaMedium">
      {/* Header */}
      <Animated.View entering={FadeInUp.duration(500)} className="bg-white px-4 py-4 border-b border-gray-100">
        <View className="flex-row items-center pt-10">
          <TouchableOpacity onPress={handleGoBack} className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-4" activeOpacity={0.7}>
            <ArrowLeft size={20} color="#6B7280" />
          </TouchableOpacity>
          <Text className="text-xl font-JakartaBold text-gray-900">Where to?</Text>
        </View>
      </Animated.View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Input Section */}
        <AnimatedView entering={FadeInDown.delay(100)} className="bg-white mx-4 mt-4 rounded-2xl shadow-sm border border-gray-200">
          {/* Pickup Input */}
          <View className="px-4 py-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <TouchableOpacity onPress={() => getCurrentLocationForInput("pickup")} className="w-8 h-8 rounded-full bg-red-100 items-center justify-center mr-3" activeOpacity={0.7}>
                <Navigation size={12} color="#EF4444" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-gray-500 text-xs font-JakartaMedium">Pickup point</Text>
                <TextInput ref={pickupRef} placeholder="Enter pickup location" placeholderTextColor="#9CA3AF" value={pickupAddress} onChangeText={(text) => handleInputChange(text, "pickup")} onFocus={() => setFocusedInput("pickup")} className="text-gray-800 text-sm font-JakartaMedium py-1" />
              </View>
              {pickupAddress ? (
                <TouchableOpacity onPress={() => clearInput("pickup")} className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center">
                  <X size={16} color="#6B7280" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Stop Points */}
          {stopPoints.map((stop, index) => (
            <AnimatedView key={stop.id} entering={SlideInRight.delay(index * 100)} exiting={SlideOutLeft} layout={Layout}>
              <View className="px-4 py-2 border-b border-gray-100">
                <View className="flex-row items-center">
                  <TouchableOpacity onPress={() => getCurrentLocationForInput("stop", stop.id)} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-3" activeOpacity={0.7}>
                    <MapPin size={12} color="#6B7280" />
                  </TouchableOpacity>
                  <View className="flex-1">
                    <Text className="text-gray-500 text-xs font-JakartaMedium mb-1">Stop {index + 1}</Text>
                    <TextInput
                      ref={(ref) => {
                        stopRefs.current[stop.id] = ref;
                      }}
                      placeholder="Add stop"
                      placeholderTextColor="#9CA3AF"
                      value={stop.address}
                      onChangeText={(text) => handleInputChange(text, "stop", stop.id)}
                      onFocus={() => setFocusedInput(stop.id)}
                      className="text-gray-800 text-base font-JakartaMedium py-1"
                    />
                  </View>
                  <TouchableOpacity onPress={() => removeStopPoint(stop.id)} className="w-8 h-8 rounded-full bg-red-100 items-center justify-center">
                    <X size={12} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </AnimatedView>
          ))}

          {/* Destination Input */}
          <View className="px-4 py-2">
            <View className="flex-row items-center">
              <TouchableOpacity onPress={() => getCurrentLocationForInput("destination")} className="w-8 h-8 rounded-full bg-green-100 items-center justify-center mr-3" activeOpacity={0.7}>
                <MapPin size={12} color="#10B981" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-gray-500 text-xs font-JakartaMedium">Where to go?</Text>
                <TextInput
                  ref={destinationRef}
                  placeholder="Enter destination"
                  placeholderTextColor="#9CA3AF"
                  value={destinationAddress}
                  onChangeText={(text) => handleInputChange(text, "destination")}
                  onFocus={() => setFocusedInput("destination")}
                  className="text-gray-800 text-sm font-JakartaMedium py-1"
                />
              </View>
              {destinationAddress ? (
                <TouchableOpacity onPress={() => clearInput("destination")} className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center">
                  <X size={16} color="#6B7280" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Add Stop Button */}
          {stopPoints.length < 3 && (
            <View className="px-4 pb-2">
              <View className="flex-row justify-end">
                <AnimatedTouchableOpacity entering={FadeInDown.delay(200)} onPress={addStopPoint} className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center border border-blue-200" activeOpacity={0.7}>
                  <Plus size={16} color="#3B82F6" />
                </AnimatedTouchableOpacity>
              </View>
            </View>
          )}
        </AnimatedView>

        {/* Search Button */}
        <AnimatedView entering={FadeInDown.delay(300)} className="mx-4 mt-4 mb-6">
          <TouchableOpacity onPress={handleSearch} className={`rounded-2xl p-4 flex-row items-center justify-center ${pickupAddress.trim() && destinationAddress.trim() ? "bg-blue-600" : "bg-gray-300"}`} activeOpacity={0.8} disabled={!pickupAddress.trim() || !destinationAddress.trim()}>
            <Search size={20} color="white" />
            <Text className="ml-2 text-white font-bold text-lg">Find Ride</Text>
          </TouchableOpacity>
        </AnimatedView>

        {/* Current Location Info */}
        {currentLocation && (
          <AnimatedView entering={FadeInDown.delay(150)} className="mx-4 mb-4">
            <View className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
                <Navigation size={14} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-blue-700 text-xs font-medium">Current Location</Text>
                <Text className="text-blue-900 text-sm font-medium" numberOfLines={2}>
                  {currentLocation.address}
                </Text>
              </View>
            </View>
          </AnimatedView>
        )}

        {/* Suggestions */}
        {focusedInput && (
          <AnimatedView entering={FadeInDown.delay(100)} exiting={FadeOutUp} className="mx-4 mt-4">
            {/* Search Loading */}
            {isSearching && (
              <View className="mb-4 flex-row items-center justify-center py-4">
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text className="ml-2 text-gray-600">Searching locations...</Text>
              </View>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <View className="mb-6">
                <Text className="text-gray-600 font-medium mb-3 px-2">Search Results</Text>
                <View className="border border-gray-200 rounded-xl bg-white">
                  {searchResults.map((location, index) => (
                    <View key={location.id}>
                      <AnimatedTouchableOpacity entering={FadeInDown.delay(index * 50)} onPress={() => handleLocationSelect(location)} className="p-4 flex-row items-center" activeOpacity={0.7}>
                        <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                          <MapPin size={18} color="#3B82F6" />
                        </View>
                        <Text className="flex-1 text-gray-800 font-medium" numberOfLines={2}>
                          {location.address}
                        </Text>
                      </AnimatedTouchableOpacity>
                      {index < searchResults.length - 1 && <View className="h-px bg-gray-200 mx-4" />}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Favorites */}
            {favoriteLocations.length > 0 && searchResults.length === 0 && (
              <View className="mb-6">
                <Text className="text-gray-600 font-medium mb-3 px-2">Favorites</Text>
                <View className="border border-gray-200 rounded-xl bg-white">
                  {favoriteLocations.map((location, index) => (
                    <View key={location.id}>
                      <AnimatedTouchableOpacity entering={FadeInDown.delay(index * 50)} onPress={() => handleLocationSelect(location)} className="p-4 flex-row items-center" activeOpacity={0.7}>
                        <View className="w-10 h-10 rounded-full bg-yellow-100 items-center justify-center mr-3">
                          <Star size={18} color="#F59E0B" fill="#F59E0B" />
                        </View>
                        <Text className="flex-1 text-gray-800 font-medium">{location.address}</Text>
                      </AnimatedTouchableOpacity>
                      {index < favoriteLocations.length - 1 && <View className="h-px bg-gray-200 mx-4" />}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Recent Locations */}
            {recentLocations.length > 0 && searchResults.length === 0 && (
              <View className="mb-6">
                <Text className="text-gray-600 font-medium mb-3 px-2">Recent</Text>
                <View className="border border-gray-200 rounded-xl bg-white">
                  {recentLocations.map((location, index) => (
                    <View key={location.id}>
                      <AnimatedTouchableOpacity entering={FadeInDown.delay(index * 50)} onPress={() => handleLocationSelect(location)} className="p-4 flex-row items-center" activeOpacity={0.7}>
                        <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3">
                          <Clock size={18} color="#6B7280" />
                        </View>
                        <Text className="flex-1 text-gray-800 font-medium">{location.address}</Text>
                      </AnimatedTouchableOpacity>
                      {index < recentLocations.length - 1 && <View className="h-px bg-gray-200 mx-4" />}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Nearby Places */}
            {nearbyPlaces.length > 0 && searchResults.length === 0 && (
              <View className="mb-6">
                <Text className="text-gray-600 font-medium mb-3 px-2">Nearby Places</Text>
                <View className="border border-gray-200 rounded-xl bg-white">
                  {nearbyPlaces.map((location, index) => (
                    <View key={location.id}>
                      <AnimatedTouchableOpacity entering={FadeInDown.delay(index * 50)} onPress={() => handleLocationSelect(location)} className="p-4 flex-row items-center" activeOpacity={0.7}>
                        <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center mr-3">
                          <location.icon size={18} color="#10B981" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-gray-800 font-medium" numberOfLines={1}>
                            {location.address.split(" - ")[0]}
                          </Text>
                          <View className="flex-row items-center mt-1">
                            {location.category && (
                              <View className="bg-green-100 px-2 py-0.5 rounded-full mr-2">
                                <Text className="text-green-700 text-xs font-medium">{location.category}</Text>
                              </View>
                            )}
                            <Text className="text-gray-500 text-xs flex-1" numberOfLines={1}>
                              {location.address.split(" - ")[1]}
                            </Text>
                          </View>
                        </View>
                      </AnimatedTouchableOpacity>
                      {index < nearbyPlaces.length - 1 && <View className="h-px bg-gray-200 mx-4" />}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* No Results */}
            {searchResults.length === 0 && searchQuery.length > 0 && !isSearching && (
              <View className="py-8 items-center">
                <MapPin size={48} color="#9CA3AF" />
                <Text className="text-gray-500 text-center mt-4 font-medium">No locations found for &quot;{searchQuery}&quot;</Text>
                <Text className="text-gray-400 text-center mt-1 text-sm">Try searching with a different term</Text>
              </View>
            )}
          </AnimatedView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SearchInputField;
