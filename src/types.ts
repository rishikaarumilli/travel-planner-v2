export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface TouristPlace {
  name: string;
  description: string;
  entryPrice: string;
  bestTime: string;
  approxTimeNeeded: string;
  signalStrength?: string; // e.g. "Good Signal", "Average Signal", "No Signal"
}

export interface HotelOption {
  hotelName: string;
  type: string; // budget, mid-range, luxury
  pricePerNight: string;
  location: string;
  bookingPlatform: string;
  bookingLink: string;
}

export interface RestaurantOption {
  name: string;
  recommendedDish: string;
  location: string;
  googleMapsLink: string;
  costForTwo: string;
  cuisineType: string;
}

export interface ActivityOption {
  name: string;
  type: string; // adventure, cultural, leisure
  cost: string;
}

export interface TransportDetails {
  suggestion: string;
  priceRange: string;
  bookingPlatform: string;
  bookingLink: string;
  optionsList?: {
    carrierName: string; // e.g. "IndiGo 6E-212", "KSRTC Multi-Axle Sleeper"
    timing: string;
    price: string;
    bookingLink: string; // Direct reservation/booking search query
  }[];
}

export interface TransportModes {
  flight: TransportDetails;
  train: TransportDetails;
  bus: TransportDetails;
}

export interface LocalTransport {
  options: string;
  olaUberAvailability: string;
  estimatedCommuteCost: string;
  rentalBookingLink: string;
  autoPriceEstimate: string; // Added auto estimate
  taxiPriceEstimate: string; // Added taxi/Uber estimate
}

export interface TouristGuideInfo {
  availability: string;
  estimatedCostPerDay: string;
  bookingPlatformTip: string;
}

export interface BudgetCost {
  totalCount: string;
  perPerson: string;
}

export interface BudgetBreakdown {
  transport: BudgetCost;
  accommodation: BudgetCost;
  food: BudgetCost;
  activities: BudgetCost;
  localTransport: BudgetCost;
  touristGuide: BudgetCost;
  miscellaneous: BudgetCost;
  grandTotal: BudgetCost;
}

export interface TravelPlan {
  destinationName: string;
  isInternational: boolean;
  overview: string;
  weather: string;
  clothing: string;
  topTouristPlaces: TouristPlace[];
  hotels: HotelOption[];
  food: {
    dishes: string[];
    costPerMeal: string;
    restaurants: RestaurantOption[]; // Upgraded to rich restaurant options
  };
  activities: ActivityOption[];
  transport: TransportModes;
  localTransport: LocalTransport;
  touristGuide: TouristGuideInfo;
  budgetBreakdown: BudgetBreakdown;
  signalStrengthOverall?: string; // Overall cellular signals or service levels
}

export interface ChatState {
  currentStep: "region" | "destination" | "days" | "people" | "generating" | "ready";
  regionType: "india" | "international" | "";
  destination: string;
  days: string;
  people: string;
}
