import { TextInputProps, TouchableOpacityProps, ViewStyle } from "react-native";

declare interface Vehicle {
  id: string;
  driverId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plateNumber: string;
  seats: number;
  imageUrls: string[]; // Array of URLs
  status: string;
  insuranceExpiry?: string;
  registrationExpiry?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

declare interface Driver {
  id: string;
  userId: string;
  licenseNumber: string;
  licenseExpiry: string;
  identityNumber: string;
  identityType: string;
  bankAccountNumber?: string;
  bankName?: string;
  isVerified: boolean;
  isOnline: boolean;
  currentLatitude?: number;
  currentLongitude?: number;
  rating?: number;
  totalRides: number;
  totalEarnings: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    profileImageUrl?: string;
    role: string;
    accountStatus: string;
    rating?: number;
    totalRides: number;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
  };
  vehicles: Vehicle[];
}

declare interface MarkerData {
  latitude: number;
  longitude: number;
  id: number;
  title: string;
  profile_image_url: string;
  car_image_url: string;
  car_seats: number;
  rating: number;
  first_name: string;
  last_name: string;
  time?: number;
  price?: string;
}

declare interface MapProps {
  destinationLatitude?: number;
  destinationLongitude?: number;
  onDriverTimesCalculated?: (driversWithTimes: MarkerData[]) => void;
  selectedDriver?: number | null;
  onMapReady?: () => void;
}

declare interface Ride {
  id: string;
  userId: string;
  driverId?: string;
  vehicleId?: string;
  originAddress: string;
  destinationAddress: string;
  originLatitude: number;
  originLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  stopPoints?: any;
  originalFarePrice: number;
  negotiatedFarePrice?: number;
  finalFarePrice?: number;
  paymentStatus: string;
  paymentMethod?: string;
  status: string;
  rideTime?: number;
  distance?: number;
  seats: number;
  scheduledAt?: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  cancelReason?: string;
  promoCodeId?: string;
  user: any;
  driver?: Driver;
  vehicle?: Vehicle;
  rating?: any;
  negotiations?: any[];
  promoCode?: any;
  payment?: any;
}

declare interface ButtonProps extends TouchableOpacityProps {
  title: string;
  bgVariant?: "primary" | "secondary" | "danger" | "outline" | "success";
  textVariant?: "primary" | "default" | "secondary" | "danger" | "success";
  IconLeft?: React.ComponentType<any>;
  IconRight?: React.ComponentType<any>;
  className?: string;
}

declare interface GoogleInputProps {
  icon?: string;
  initialLocation?: string;
  containerStyle?: string;
  textInputBackgroundColor?: string;
  handlePress: ({ latitude, longitude, address }: { latitude: number; longitude: number; address: string }) => void;
}

declare interface InputFieldProps extends TextInputProps {
  label: string;
  icon?: any;
  secureTextEntry?: boolean;
  labelStyle?: string;
  containerStyle?: string;
  inputStyle?: string;
  iconStyle?: string;
  className?: string;
}

declare interface PaymentProps {
  fullName: string;
  email: string;
  amount: string;
  driverId: number;
  rideTime: number;
}

declare interface LocationCoordinate {
  latitude: number;
  longitude: number;
}

declare interface LocationData {
  address: string;
  coordinates: LocationCoordinate;
  placeId?: string;
}

declare interface LocationStore {
  userLatitude: number | null;
  userLongitude: number | null;
  userAddress: string | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  destinationAddress: string | null;
  userLocationData?: LocationData | null;
  destinationLocationData?: LocationData | null;
  setUserLocation: (params: { latitude: number; longitude: number; address: string; locationData?: LocationData }) => void;
  setDestinationLocation: (params: { latitude: number; longitude: number; address: string; locationData?: LocationData }) => void;
  clearLocations: () => void;
}

declare interface DriverStore {
  drivers: MarkerData[];
  selectedDriver: number | null;
  setSelectedDriver: (driverId: number) => void;
  setDrivers: (drivers: MarkerData[]) => void;
  clearSelectedDriver: () => void;
}

declare interface DriverCardProps {
  item: MarkerData;
  selected: number;
  setSelected: () => void;
}


declare interface CustomBottomSheetProps {
  // Visibility
  isVisible: boolean;
  onClose: () => void;

  // Snap points configuration
  enableSnapping?: boolean;
  snapPoints?: string[] | number[];
  initialSnapIndex?: number;

  // Behavior options
  enablePanDownToClose?: boolean;
  enableOverDrag?: boolean;
  enableHandlePanningGesture?: boolean;
  enableContentPanningGesture?: boolean;

  // Backdrop options
  enableBackdrop?: boolean;
  backdropOpacity?: number;
  backdropAppearanceOnIndex?: number;
  backdropDisappearOnIndex?: number;

  // Styling
  backgroundStyle?: ViewStyle;
  handleStyle?: ViewStyle;
  handleIndicatorStyle?: ViewStyle;

  // Content options
  children: React.ReactNode;
  scrollable?: boolean;
  keyboardBehavior?: "extend" | "fillParent" | "interactive";
  keyboardBlurBehavior?: "none" | "restore";

  // Animation
  animateOnMount?: boolean;
  animationConfigs?: any;

  // Callbacks
  onChange?: (index: number) => void;
  onAnimate?: (fromIndex: number, toIndex: number) => void;
}

declare interface Driver {
  driver_id: string;
  first_name: string;
  last_name: string;
  profile_image_url: string;
  car_image_url: string;
  car_seats: number;
  rating: string;
}

declare interface Ride {
  ride_id: string;
  origin_address: string;
  destination_address: string;
  origin_latitude: string;
  origin_longitude: string;
  destination_latitude: string;
  destination_longitude: string;
  ride_time: number;
  fare_price: string;
  payment_status: string;
  driver_id: number;
  user_id: string;
  created_at: string;
  driver: Driver;
}

declare interface PickedAsset {
  uri: string;
  type?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
}

declare interface AdminLoginData {
  employeeId: string;
  email: string;
  department: string;
  verificationCardUrl?: string;
}

declare interface AdminProfile {
  id: string;
  userId: string;
  employeeId: string;
  email: string;
  department: string;
  verificationCardUrl?: string;
  permissions: string[];
  isVerified: boolean;
  createdAt: string;
}

declare interface AdminStore {
  admin: AdminProfile | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  dashboard?: any;
  users: any[];
  drivers: any[];
  rides: any[];
  tickets: any[];
  promoCodes: any[];
  settings: any[];
  analytics?: any;
  reports?: any;
  setAdmin: (admin: AdminProfile) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  fetchDashboard?: (userId: string) => Promise<void>;
  fetchUsers?: (userId: string, params?: Record<string, string>) => Promise<void>;
  fetchDrivers?: (userId: string, params?: Record<string, string>) => Promise<void>;
  fetchRides?: (userId: string, params?: Record<string, string>) => Promise<void>;
  fetchTickets?: (userId: string, params?: Record<string, string>) => Promise<void>;
  fetchPromoCodes?: (userId: string) => Promise<void>;
  fetchSettings?: (userId: string) => Promise<void>;
  fetchAnalytics?: (userId: string, period?: string) => Promise<void>;
  fetchReports?: (userId: string, reportType: string, startDate?: string, endDate?: string) => Promise<void>;
  exportData?: (userId: string, type: string, format?: string) => Promise<any>;
  adminAction?: (userId: string, action: string, data: any) => Promise<any>;
  adminUpdate?: (userId: string, action: string, id: string, data: any) => Promise<any>;
  adminDelete?: (userId: string, action: string, id: string) => Promise<any>;
  bulkAdminAction?: (userId: string, action: string, ids: string[], data?: any) => Promise<any>;
}