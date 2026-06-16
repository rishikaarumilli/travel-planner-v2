import React, { useState, useEffect } from "react";
import { TravelPlan } from "../types";
import { 
  Compass, Hotel, Utensils, Route, MapPin, 
  Sparkles, Thermometer, Shirt, Plane, Train, 
  Bus, Car, ShieldAlert, DollarSign, Users, ExternalLink, RefreshCw,
  Plus, Trash2, RotateCcw, Briefcase, Share2, Wifi,
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind, CloudFog, Coins
} from "lucide-react";

const getWeatherIcon = (weather: string = "") => {
  const w = weather.toLowerCase();
  if (w.includes("rain") || w.includes("shower") || w.includes("drizzle") || w.includes("wet") || w.includes("monsoon")) {
    return <CloudRain className="w-5 h-5 text-blue-500 stroke-[2.5px]" />;
  }
  if (w.includes("thunder") || w.includes("storm") || w.includes("lightning")) {
    return <CloudLightning className="w-5 h-5 text-yellow-600 stroke-[2.5px]" />;
  }
  if (w.includes("snow") || w.includes("ice") || w.includes("freeze") || w.includes("cold") || w.includes("chill")) {
    return <CloudSnow className="w-5 h-5 text-sky-400 stroke-[2.5px]" />;
  }
  if (w.includes("wind") || w.includes("breeze") || w.includes("stormy")) {
    return <Wind className="w-5 h-5 text-teal-500 stroke-[2.5px]" />;
  }
  if (w.includes("cloud") || w.includes("overcast") || w.includes("gloomy") || w.includes("gray")) {
    return <Cloud className="w-5 h-5 text-gray-500 stroke-[2.5px]" />;
  }
  if (w.includes("fog") || w.includes("mist") || w.includes("haze") || w.includes("smog")) {
    return <CloudFog className="w-5 h-5 text-gray-400 stroke-[2.5px]" />;
  }
  return <Sun className="w-5 h-5 text-amber-500 animate-spin-slow stroke-[2.5px]" />;
};
import { TopSightsMap } from "./TopSightsMap";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

interface TravelDashboardProps {
  plan: TravelPlan;
  onBookItem?: (itemType: string, itemName: string, cost: string, details: string) => void;
}

interface PackingItem {
  id: string;
  name: string;
  category: string;
  checked: boolean;
}

const generatePackingList = (weather: string = "", clothing: string = "", destination: string = "", isInternational: boolean = false): PackingItem[] => {
  const items: PackingItem[] = [];
  const w = (weather || "").toLowerCase();
  const c = (clothing || "").toLowerCase();
  const d = (destination || "").toLowerCase();

  // 1. General Essentials
  items.push(
    { id: "gen-docs", name: isInternational ? "Passport, Visa & Forex Card" : "Government ID & Cash/Cards", category: "Documents", checked: false },
    { id: "gen-tech", name: "Phone, USB Cables & Power Bank", category: "Electronics", checked: false },
    { id: "gen-toilet", name: "Toiletries Kit & Dry Tissues", category: "Hygiene", checked: false },
    { id: "gen-meds", name: "Basic First-Aid & Daily Medicines", category: "Health", checked: false }
  );

  if (isInternational) {
    items.push({ id: "gen-adapter", name: "Universal Travel Adapter", category: "Electronics", checked: false });
  }

  // 2. Weather Specifics
  const isRainy = w.includes("rain") || w.includes("monsoon") || w.includes("shower") || w.includes("wet") || c.includes("umbrella") || c.includes("rain");
  const isCold = w.includes("cold") || w.includes("winter") || w.includes("snow") || w.includes("chill") || w.includes("freeze") || c.includes("jacket") || c.includes("sweater") || c.includes("wool") || w.includes("deg");
  const isHot = w.includes("warm") || w.includes("hot") || w.includes("summer") || w.includes("sunny") || w.includes("humid") || w.includes("beach") || c.includes("sun") || c.includes("shorts") || c.includes("cotton");

  if (isRainy) {
    items.push(
      { id: "wea-umbrella", name: "Compact Umbrella / Poncho", category: "Weather Gear", checked: false },
      { id: "wea-waterproof", name: "Waterproof Phone Case & Bag Cover", category: "Weather Gear", checked: false },
      { id: "wea-footwear", name: "Water-resistant / Anti-skid Footwear", category: "Footwear", checked: false },
      { id: "wea-clothes", name: "Quick-dry Breathable Clothing", category: "Clothing", checked: false }
    );
  } else if (isCold) {
    items.push(
      { id: "wea-jacket", name: "Thick Fleece Jacket or Windbreaker", category: "Weather Gear", checked: false },
      { id: "wea-thermal", name: "Thermal Innerwear Set", category: "Clothing", checked: false },
      { id: "wea-gloves", name: "Warm Gloves, Woolen Socks & Beanie", category: "Clothing", checked: false },
      { id: "wea-moisturizer", name: "Moisturizing Cream & Lip Balm", category: "Health", checked: false }
    );
  } else {
    items.push(
      { id: "wea-sunscreen", name: "SPF 50+ Sunscreen Lotion", category: "Health", checked: false },
      { id: "wea-shades", name: "Polarized Sunglasses (UV)", category: "Clothing", checked: false },
      { id: "wea-hat", name: "Sun Cap or Wide-brimmed Hat", category: "Clothing", checked: false },
      { id: "wea-cotton", name: "Lightweight Breathable Cotton Wear", category: "Clothing", checked: false }
    );
  }

  // 3. Clothing Suggestions derived from clothing text details
  if (c.includes("swim") || c.includes("beach") || d.includes("goa") || d.includes("maldives") || d.includes("beach")) {
    items.push({ id: "wea-swim", name: "Swimsuit & Microfiber Towel", category: "Clothing", checked: false });
  }
  if (c.includes("trek") || c.includes("hike") || c.includes("walk") || d.includes("mount") || d.includes("hill") || d.includes("trek")) {
    items.push(
      { id: "act-hiking", name: "Sturdy Hiking / Trail-Running Shoes", category: "Footwear", checked: false },
      { id: "act-repellent", name: "Skin-safe Insect Repellent Spray", category: "Health", checked: false }
    );
  }

  return items;
};

export function TravelDashboard({ plan, onBookItem }: TravelDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "stays" | "places" | "transport" | "budget">("overview");
  const [budgetMultiplier, setBudgetMultiplier] = useState<number>(1);
  const [selectedPlaceName, setSelectedPlaceName] = useState<string | null>(null);
  const [currencyPreference, setCurrencyPreference] = useState<"base" | "preferred">("base");
  const [sharedToast, setSharedToast] = useState(false);

  const handleShare = () => {
    try {
      const serialized = btoa(unescape(encodeURIComponent(JSON.stringify(plan))));
      const shareUrl = `${window.location.origin}${window.location.pathname}?trip=${serialized}`;
      navigator.clipboard.writeText(shareUrl);
      setSharedToast(true);
      setTimeout(() => setSharedToast(false), 3000);
    } catch (e) {
      console.error("Failed to generate share URL:", e);
    }
  };

  // Live Weather Alerts & Seasonal Warnings State
  const [weatherAlerts, setWeatherAlerts] = useState<{
    hasAlerts: boolean;
    alertLevel: string;
    summary: string;
    alerts: string[];
    temperatureRange: string;
    humidity: string;
    safetyTips: string[];
  } | null>(null);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(false);

  // Fetch live weather warnings on destination mount or change
  useEffect(() => {
    if (!plan?.destinationName) return;
    setLoadingAlerts(true);
    fetch(`/api/weather-alerts?destination=${encodeURIComponent(plan.destinationName)}`)
      .then(async res => {
        if (!res.ok) {
          throw new Error(`Server returned status: ${res.status}`);
        }
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Server did not return JSON format.");
        }
        return res.json();
      })
      .then(data => {
        setWeatherAlerts(data);
        setLoadingAlerts(false);
      })
      .catch(err => {
        console.error("Error fetching live weather alerts:", err);
        setLoadingAlerts(false);
      });
  }, [plan.destinationName]);

  // States for Packing Checklist
  const [packingItems, setPackingItems] = useState<PackingItem[]>([]);
  const [newPackingItemName, setNewPackingItemName] = useState("");

  // Initialize and load packing list on plan change
  useEffect(() => {
    const generated = generatePackingList(plan.weather, plan.clothing, plan.destinationName, plan.isInternational);
    const saved = localStorage.getItem(`packing-${plan.destinationName}`);
    if (saved) {
      try {
        const parsedSaved = JSON.parse(saved) as { name: string; checked: boolean }[];
        // Re-construct generated with saved checking states & include any custom items
        const updated = generated.map(item => {
          const found = parsedSaved.find(s => s.name === item.name);
          return found ? { ...item, checked: found.checked } : item;
        });
        
        // Also add any saved custom entries that aren't already represented in the generated categories
        const customSaved = parsedSaved.filter(s => !generated.some(g => g.name === s.name));
        customSaved.forEach((cs, i) => {
          updated.push({
            id: `custom-load-${i}`,
            name: cs.name,
            category: "Custom",
            checked: cs.checked
          });
        });

        setPackingItems(updated);
        return;
      } catch (e) {
        console.error("Error loading saved packing checklist:", e);
      }
    }
    setPackingItems(generated);
  }, [plan]);

  // Handlers for packing checklist
  const togglePackingItem = (id: string) => {
    setPackingItems(prev => {
      const next = prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item);
      localStorage.setItem(`packing-${plan.destinationName}`, JSON.stringify(next.map(item => ({ name: item.name, checked: item.checked }))));
      return next;
    });
  };

  const handleAddPackingItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPackingItemName.trim()) return;
    const newItem: PackingItem = {
      id: `custom-${Date.now()}`,
      name: newPackingItemName.trim(),
      category: "Custom",
      checked: false
    };
    setPackingItems(prev => {
      const next = [...prev, newItem];
      localStorage.setItem(`packing-${plan.destinationName}`, JSON.stringify(next.map(item => ({ name: item.name, checked: item.checked }))));
      return next;
    });
    setNewPackingItemName("");
  };

  const handleResetPackingList = () => {
    const generated = generatePackingList(plan.weather, plan.clothing, plan.destinationName, plan.isInternational);
    setPackingItems(generated);
    localStorage.removeItem(`packing-${plan.destinationName}`);
  };

  // Helper to parse numeric cost values for charts
  const getNumericCost = (costStr: string, multiplier: number) => {
    if (!costStr) return 0;
    const numberPattern = /([\d,]+)/;
    const match = costStr.match(numberPattern);
    if (match) {
      const val = parseInt(match[1].replace(/,/g, ""), 10);
      return isNaN(val) ? 0 : val * multiplier;
    }
    return 0;
  };

  // Helper to process cost string and scale it if multiplier changes (only if it's numeric/INR format, otherwise print the string)
  const scaleCost = (costStr: string, multiplier: number) => {
    if (multiplier === 1) return costStr;
    
    // Extract numbers from something like "₹15,000", "₹ 2,500" or "$150"
    const numberPattern = /([\d,]+)/;
    const match = costStr.match(numberPattern);
    if (match) {
      const originalValue = parseInt(match[1].replace(/,/g, ""), 10);
      if (!isNaN(originalValue)) {
        const scaled = originalValue * multiplier;
        const formatted = scaled.toLocaleString(plan.isInternational ? "en-US" : "en-IN");
        return costStr.replace(match[1], formatted);
      }
    }
    return costStr;
  };

  // Helper to format cost string with multiplier AND currency preference (for the Budget summary)
  const formatBudgetCost = (costStr: string, multiplier: number, currencyPref: "base" | "preferred") => {
    if (!costStr) return costStr;
    const numberPattern = /([\d,]+)/;
    const match = costStr.match(numberPattern);
    if (!match) return costStr;
    
    const originalValue = parseInt(match[1].replace(/,/g, ""), 10);
    if (isNaN(originalValue)) return costStr;

    let scaledValue = originalValue * multiplier;
    
    if (currencyPref === "preferred") {
      if (plan.isInternational) {
        // Base is USD ($), preferred is INR (₹)
        // Rate: 1 USD = 83.5 INR
        const converted = Math.round(scaledValue * 83.5);
        return `₹${converted.toLocaleString("en-IN")}`;
      } else {
        // Base is INR (₹), preferred is USD ($)
        // Rate: 1 INR = 0.012 USD
        const converted = Math.round(scaledValue * 0.012);
        return `$${converted.toLocaleString("en-US")}`;
      }
    } else {
      // Base currency
      const formatted = scaledValue.toLocaleString(plan.isInternational ? "en-US" : "en-IN");
      return costStr.replace(match[1], formatted);
    }
  };

  // Helper to scale numeric value to preferred currency
  const convertNumericValue = (val: number, currencyPref: "base" | "preferred") => {
    if (currencyPref === "preferred") {
      if (plan.isInternational) {
        // USD -> INR
        return Math.round(val * 83.5);
      } else {
        // INR -> USD
        return Math.round(val * 0.012);
      }
    }
    return val;
  };

  const chartData = [
    { name: "Transport (to/from)", value: getNumericCost(plan.budgetBreakdown.transport.totalCount, budgetMultiplier), color: "#4D96FF" },
    { name: "Accommodation", value: getNumericCost(plan.budgetBreakdown.accommodation.totalCount, budgetMultiplier), color: "#6C5CE7" },
    { name: "Food Recommendations", value: getNumericCost(plan.budgetBreakdown.food.totalCount, budgetMultiplier), color: "#6BCB77" },
    { name: "Curated Activities", value: getNumericCost(plan.budgetBreakdown.activities.totalCount, budgetMultiplier), color: "#FF6B6B" },
    { name: "On-demand Cab/Bus", value: getNumericCost(plan.budgetBreakdown.localTransport.totalCount, budgetMultiplier), color: "#FFD93D" },
    { name: "Tourist Local Guide", value: getNumericCost(plan.budgetBreakdown.touristGuide.totalCount, budgetMultiplier), color: "#A29BFE" },
    { name: "Other Miscellany", value: getNumericCost(plan.budgetBreakdown.miscellaneous.totalCount, budgetMultiplier), color: "#E17055" },
  ].filter(item => item.value > 0);

  const totalSum = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="bg-white border-4 border-brand-dark rounded-3xl shadow-[8px_8px_0px_0px_#2D3436] h-full flex flex-col overflow-hidden">
      {/* Dashboard Header */}
      <div className="bg-white px-6 py-5 border-b-4 border-brand-pink">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-blue text-white border-2 border-brand-dark rounded-xl shadow-[3px_3px_0px_0px_#2D3436]">
              <Compass className="w-5 h-5 animate-spin-slow stroke-[3.5px]" />
            </div>
            <div>
              <span className="text-[10px] font-black text-brand-pink uppercase tracking-widest font-display flex items-center gap-1.5">
                <Sparkles size={11} className="text-brand-pink fill-brand-yellow stroke-[2px]" /> Planned Itinerary
              </span>
              <h2 className="text-2xl font-black text-brand-dark tracking-tight italic mt-0.5">
                {plan.destinationName}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-3.5 flex-wrap">
            <div className="flex items-center gap-2 bg-[#FFF4E0] border-2 border-brand-dark p-2 rounded-xl text-xs font-black shadow-[3px_3px_0px_0px_#2D3436]">
              <span className="text-brand-dark flex items-center gap-1">
                <Users size={12} className="text-brand-pink stroke-[3px]" /> Adjust Size:
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 4].map((mult) => (
                  <button
                    key={mult}
                    onClick={() => setBudgetMultiplier(mult)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black border-2 border-transparent transition-all cursor-pointer ${
                      budgetMultiplier === mult
                        ? "bg-brand-blue text-white border-brand-dark shadow-[1px_1px_0px_0px_#2D3436]"
                        : "text-brand-dark hover:bg-white"
                    }`}
                  >
                    x{mult}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleShare}
              title="Generate a custom shareable URL for this travel itinerary"
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black border-2 border-brand-dark transition-all cursor-pointer shadow-[3px_3px_0px_0px_#2D3436] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[2px_2px_0px_0px_#2D3436] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#2D3436] ${
                sharedToast 
                  ? "bg-[#6BCB77] text-white border-brand-dark" 
                  : "bg-brand-pink text-white hover:bg-[#ff5555]"
              }`}
            >
              <Share2 size={12} className="stroke-[3px]" />
              {sharedToast ? "Copied Link! 🚀" : "Share Trip"}
            </button>
          </div>
        </div>

        {/* Dynamic Neo-Brutalist Tabs */}
        <div className="flex gap-1.5 overflow-x-auto mt-6 scrollbar-none border-b-4 border-brand-dark -mx-6 px-6 pb-0.5">
          {[
            { id: "overview", label: "Overview", icon: Compass },
            { id: "stays", label: "Stays & Food", icon: Hotel },
            { id: "places", label: "Top Sights", icon: Route },
            { id: "transport", label: "Transit Info", icon: Plane },
            { id: "budget", label: "Travel Budget", icon: DollarSign },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1 px-4 py-2.5 text-xs font-black border-2 transition-all whitespace-nowrap cursor-pointer rounded-t-xl ${
                  isActive
                    ? "bg-brand-yellow text-brand-dark border-brand-dark border-b-transparent -mb-[6px] shadow-[2px_-2px_0px_0px_#2D3436]"
                    : "text-gray-500 bg-white border-transparent hover:text-brand-dark hover:bg-[#F0F9FF]"
                }`}
              >
                <Icon size={13} className={isActive ? "text-brand-dark stroke-[3px]" : "text-gray-400"} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Structured Panel Content */}
      <div className="p-6 flex-1 overflow-y-auto space-y-6 bg-[#F0F9FF]/20">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-3">
              <h3 className="text-xs font-black text-brand-dark uppercase tracking-widest font-display">
                🌍 Destination Overview
              </h3>
              <p className="text-sm text-brand-dark leading-relaxed bg-white border-4 border-brand-dark p-5 rounded-3xl shadow-[5px_5px_0px_0px_#2D3436] font-medium">
                {plan.overview}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-[#F7F1FF] border-2 border-[#A29BFE] p-5 rounded-3xl shadow-[5px_5px_0px_0px_#2D3436] flex items-start gap-4">
                <div className="p-2.5 bg-white border-2 border-[#A29BFE] text-brand-purple rounded-xl shadow-xs">
                  <Thermometer className="w-5 h-5 stroke-[2.5px]" />
                </div>
                <div>
                  <h4 className="text-[10px] uppercase font-black text-brand-purple tracking-widest">🌤️ Forecast</h4>
                  <div className="text-sm font-black text-brand-dark mt-1 flex items-center gap-2">
                    {getWeatherIcon(plan.weather)}
                    <span>{plan.weather}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#FFF4E0] border-2 border-[#FAB1A0] p-5 rounded-3xl shadow-[5px_5px_0px_0px_#2D3436] flex items-start gap-4">
                <div className="p-2.5 bg-white border-2 border-brand-dark text-[#E17055] rounded-xl shadow-xs">
                  <Shirt className="w-5 h-5 stroke-[2.5px]" />
                </div>
                <div>
                  <h4 className="text-[10px] uppercase font-black text-[#E17055] tracking-widest">👕 Packing Idea</h4>
                  <p className="text-sm font-black text-brand-dark mt-1">{plan.clothing}</p>
                </div>
              </div>
            </div>

            {/* Overall Cellular Signals Panel */}
            <div className="bg-[#EBF7FF] border-4 border-brand-dark p-5 rounded-3xl shadow-[5px_5px_0px_0px_#2D3436] flex items-start gap-4">
              <div className="p-2.5 bg-white border-2 border-brand-dark text-brand-blue rounded-xl shadow-xs shrink-0">
                <Wifi className="w-5 h-5 text-brand-blue stroke-[2.5px]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-[10px] uppercase font-black text-brand-blue tracking-widest leading-none">
                  📶 Overall Cellular Signal & Connectivity Status
                </h4>
                <p className="text-xs font-black text-brand-dark leading-relaxed mt-1">
                  {plan.signalStrengthOverall || `Moderate to Good overall signals: Stable Airtel and Jio 4G/5G works reliably in city cores and tourist districts of ${plan.destinationName}. Mountain points, deep reserves, or forests can be highly unpredictable; offline navigation caches are highly recommended.`}
                </p>
                <div className="flex gap-2 items-center flex-wrap mt-2 select-none">
                  <span className="text-[9px] font-black border border-brand-dark bg-white rounded px-2 py-0.5 uppercase tracking-wide">
                    🌐 Jio: Highly Reliable 5G
                  </span>
                  <span className="text-[9px] font-black border border-brand-dark bg-white rounded px-2 py-0.5 uppercase tracking-wide">
                    🌐 Airtel: Good 4G/5G
                  </span>
                  <span className="text-[9px] font-black border border-brand-dark bg-white rounded px-2 py-0.5 uppercase tracking-wide text-amber-700 bg-amber-50">
                    ⚠️ Remote Areas: Weak Signal Advice
                  </span>
                </div>
              </div>
            </div>

            {/* Real-time Weather Warning & Seasonal Advisory Panel */}
            <div className="bg-white border-4 border-brand-dark p-6 rounded-3xl shadow-[5px_5px_0px_0px_#2D3436] space-y-4">
              <div className="flex justify-between items-center border-b-2 border-dashed border-gray-150 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 border-2 border-brand-dark rounded-xl text-white ${
                    loadingAlerts 
                      ? "bg-brand-blue" 
                      : (weatherAlerts?.alertLevel === "high" || weatherAlerts?.alertLevel === "severe") 
                        ? "bg-[#FF6B6B]" 
                        : weatherAlerts?.alertLevel === "medium" 
                          ? "bg-brand-yellow text-brand-dark" 
                          : "bg-green-500"
                  }`}>
                    {loadingAlerts ? (
                      <RefreshCw className="w-4 h-4 animate-spin stroke-[2.5px]" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 stroke-[2.5px]" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-brand-dark uppercase tracking-widest leading-none">
                      ⚠️ Real-Time Seasonal Warnings & Climate Advisories
                    </h4>
                    <p className="text-[9px] text-gray-500 font-bold mt-1">
                      Fetched live using real-time search signals & weather indexes for {plan.destinationName}.
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    setLoadingAlerts(true);
                    fetch(`/api/weather-alerts?destination=${encodeURIComponent(plan.destinationName)}`)
                      .then(async res => {
                        if (!res.ok) {
                          throw new Error(`Server returned status: ${res.status}`);
                        }
                        const contentType = res.headers.get("content-type");
                        if (!contentType || !contentType.includes("application/json")) {
                          throw new Error("Server did not return JSON format.");
                        }
                        return res.json();
                      })
                      .then(data => {
                        setWeatherAlerts(data);
                        setLoadingAlerts(false);
                      })
                      .catch(() => setLoadingAlerts(false));
                  }}
                  disabled={loadingAlerts}
                  className="inline-flex items-center gap-1 bg-white hover:bg-brand-blue/10 border-2 border-brand-dark text-brand-dark px-2.5 py-1 rounded-lg text-[9px] font-black shadow-[1.5px_1.5px_0px_0px_#2D3436] hover:shadow-none hover:translate-x-[1.5px] hover:translate-y-[1.5px] transition-all cursor-pointer disabled:opacity-50"
                  title="Force refresh weather metrics & hazardous alert warning systems"
                >
                  <RefreshCw size={10} className={`stroke-[3.5px] ${loadingAlerts ? "animate-spin" : ""}`} /> Refresh Live
                </button>
              </div>

              {loadingAlerts ? (
                <div className="py-8 text-center space-y-2">
                  <div className="inline-block p-3 bg-[#FAF9F6] border-2 border-brand-dark rounded-2xl shadow-[2px_2px_0px_0px_#2D3436]">
                    <RefreshCw className="w-6 h-6 animate-spin text-brand-pink stroke-[3px]" />
                  </div>
                  <p className="text-xs font-black text-brand-dark uppercase tracking-wider">Syncing Climate Warning Feeds...</p>
                  <p className="text-[10px] text-gray-400 font-bold">Scanning Google Search & meteorological alerts for local hazards...</p>
                </div>
              ) : weatherAlerts ? (
                <div className="space-y-4 animate-fade-in">
                  {/* Warning Header block changes color based on alert level */}
                  <div className={`border-2 border-brand-dark p-4 rounded-2xl flex items-start gap-3.5 shadow-[3px_3px_0px_0px_#2D3436] ${
                    (weatherAlerts.alertLevel === "high" || weatherAlerts.alertLevel === "severe")
                      ? "bg-red-50 border-red-400"
                      : weatherAlerts.alertLevel === "medium"
                        ? "bg-amber-50 border-amber-400"
                        : "bg-emerald-50/50 border-emerald-400"
                  }`}>
                    <span className="text-xl">
                      {(weatherAlerts.alertLevel === "high" || weatherAlerts.alertLevel === "severe") ? "🚨" : weatherAlerts.alertLevel === "medium" ? "⚠️" : "✅"}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 border-2 border-brand-dark rounded-md text-white ${
                          (weatherAlerts.alertLevel === "high" || weatherAlerts.alertLevel === "severe")
                            ? "bg-[#FF6B6B]"
                            : weatherAlerts.alertLevel === "medium"
                              ? "bg-brand-yellow text-brand-dark"
                              : "bg-emerald-500"
                        }`}>
                          Risk status: {weatherAlerts.alertLevel.toUpperCase()}
                        </span>
                        {weatherAlerts.hasAlerts && (
                          <span className="text-[9px] font-black text-[#FF6B6B] animate-pulse">● LIVE ALERT</span>
                        )}
                      </div>
                      <p className="text-xs font-black text-brand-dark mt-1.5 leading-relaxed">
                        {weatherAlerts.summary}
                      </p>
                    </div>
                  </div>

                  {/* Temperature Range & Humidity pills */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#F0F9FF]/40 border-2 border-[#4D96FF] p-3 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🌡️</span>
                        <div>
                          <span className="text-[8px] text-gray-500 uppercase tracking-widest block font-black leading-none font-mono">Temp Range</span>
                          <span className="text-[11px] font-black text-brand-dark">{weatherAlerts.temperatureRange || "Seasonal"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-teal-50/20 border-2 border-teal-500 p-3 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">💧</span>
                        <div>
                          <span className="text-[8px] text-gray-500 uppercase tracking-widest block font-black leading-none font-mono">Humidity</span>
                          <span className="text-[11px] font-black text-brand-dark">{weatherAlerts.humidity || "Moderate"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bulleted Alerts */}
                  {weatherAlerts.alerts && weatherAlerts.alerts.length > 0 && (
                    <div className="space-y-1.5 pointer-events-none">
                      <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 font-mono block">🎯 Climate Advisories & Conditions</span>
                      <div className="space-y-1.5">
                        {weatherAlerts.alerts.map((alt, aidx) => (
                          <div key={aidx} className="flex gap-2 items-start bg-slate-50 border border-brand-dark/20 p-2.5 rounded-xl text-[11px] font-medium text-brand-dark">
                            <span className="text-xs shrink-0">❄️</span>
                            <span>{alt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Safety Advice */}
                  {weatherAlerts.safetyTips && weatherAlerts.safetyTips.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#E17055] font-display block">🛡️ Recommended Tourist Safety Tips</span>
                      <div className="grid grid-cols-1 gap-1.5">
                        {weatherAlerts.safetyTips.map((tip, tidx) => (
                          <div key={tidx} className="flex gap-2 items-start bg-[#FFF4E0]/40 border border-amber-300 p-2.5 rounded-xl text-[11px] font-black text-[#5C3D2E]">
                            <span className="text-xs shrink-0 text-amber-600">👉</span>
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 bg-gray-50/50 rounded-xl border border-gray-150 text-xs font-bold text-gray-400">
                  Unable to load weather warnings at this time. Click refresh to retry.
                </div>
              )}
            </div>

            {/* Weather-Based Interactive Packing Checklist */}
            {(() => {
              const packedCount = packingItems.filter(item => item.checked).length;
              const totalCount = packingItems.length;
              const percentPacked = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;

              return (
                <div className="bg-white border-4 border-brand-dark p-6 rounded-3xl shadow-[5px_5px_0px_0px_#2D3436] space-y-4">
                  <div className="flex justify-between items-center flex-wrap gap-2 border-b-2 border-dashed border-gray-150 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-brand-pink text-white border-2 border-brand-dark rounded-xl">
                        <Briefcase className="w-4 h-4 stroke-[2.5px]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-brand-dark uppercase tracking-widest leading-none">
                          🎒 Destination Packing Checklist
                        </h4>
                        <p className="text-[9px] text-gray-500 font-bold mt-1">
                          Suggestions optimized for <span className="text-brand-pink font-extrabold">{plan.destinationName}</span>'s climate & conditions.
                        </p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleResetPackingList}
                      className="inline-flex items-center gap-1 bg-white hover:bg-brand-pink/10 border-2 border-brand-dark text-brand-dark px-2.5 py-1 rounded-lg text-[9px] font-black shadow-[1.5px_1.5px_0px_0px_#2D3436] hover:shadow-none hover:translate-x-[1.5px] hover:translate-y-[1.5px] transition-all cursor-pointer"
                      title="Reset checklist to original weather recommendations"
                    >
                      <RotateCcw size={10} className="stroke-[3.5px]" /> Reset Suggestions
                    </button>
                  </div>

                  {/* Overall Progress */}
                  <div className="bg-slate-50 border-2 border-brand-dark p-3.5 rounded-2xl">
                    <div className="flex justify-between items-center text-xs font-black text-brand-dark mb-1.5 flex-wrap gap-1">
                      <span className="flex items-center gap-1">
                        {percentPacked === 100 ? "🎉 All Packed & Ready to Go!" : "💼 Packing Progress Tracker"}
                      </span>
                      <span className="font-mono text-[10px] bg-white border-2 border-brand-dark px-2 py-0.5 rounded-md font-extrabold shadow-[1px_1px_0px_0px_#2D3436]">
                        {packedCount} / {totalCount} Packed ({percentPacked}%)
                      </span>
                    </div>
                    <div className="w-full bg-white border-2 border-brand-dark rounded-full h-4 overflow-hidden p-[2px]">
                      <div 
                        className="h-full rounded-full transition-all duration-500 bg-brand-pink"
                        style={{ width: `${percentPacked}%` }}
                      />
                    </div>
                  </div>

                  {/* Checklist Items list */}
                  {totalCount === 0 ? (
                    <div className="text-center py-4 bg-gray-50/50 rounded-xl border border-gray-150 text-xs font-bold text-gray-400">
                      No packing items listed yet. Try adding custom items below!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[290px] overflow-y-auto pr-1">
                      {packingItems.map((item) => (
                        <div 
                          key={item.id}
                          onClick={() => togglePackingItem(item.id)}
                          className={`flex items-center justify-between gap-3 p-3 border-2 rounded-2xl cursor-pointer transition-all select-none ${
                            item.checked 
                              ? "bg-green-50/70 border-[#2D3436]/40 text-gray-400 line-through opacity-70 translate-x-0 translate-y-0 shadow-none" 
                              : "bg-white border-brand-dark hover:bg-slate-50/50 hover:-translate-y-0.5 hover:translate-x-0.5 shadow-[2px_2px_0px_0px_#2D3436] hover:shadow-[1px_1px_0px_0px_#2D3436]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input 
                              type="checkbox"
                              checked={item.checked}
                              readOnly
                              className="w-4 h-4 rounded border-2 border-brand-dark text-brand-pink focus:ring-brand-pink focus:ring-2 cursor-pointer checked:bg-brand-pink accent-brand-pink shrink-0"
                            />
                            <span className="text-xs font-bold leading-tight truncate">{item.name}</span>
                          </div>
                          <span className={`text-[8px] font-black uppercase shrink-0 px-1.5 py-0.5 border border-brand-dark rounded-md
                            ${item.category === "Documents" ? "bg-[#FFD93D] text-brand-dark" : ""}
                            ${item.category === "Electronics" ? "bg-[#4D96FF] text-white" : ""}
                            ${item.category === "Hygiene" ? "bg-[#6BCB77] text-white" : ""}
                            ${item.category === "Weather Gear" ? "bg-[#A29BFE] text-brand-dark" : ""}
                            ${item.category === "Clothing" ? "bg-[#FF6B6B] text-white" : ""}
                            ${item.category === "Health" ? "bg-[#E17055] text-white" : ""}
                            ${item.category === "Footwear" ? "bg-brand-blue text-white" : ""}
                            ${item.category === "Custom" ? "bg-purple-100 text-[#6C5CE7]" : ""}
                          `}>
                            {item.category}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Custom packing item */}
                  <form onSubmit={handleAddPackingItem} className="flex gap-2 pt-2 border-t-2 border-dashed border-gray-150">
                    <input 
                      type="text" 
                      placeholder="➕ Need anything else? Add custom packing item..." 
                      value={newPackingItemName}
                      onChange={(e) => setNewPackingItemName(e.target.value)}
                      className="flex-1 bg-white border-2 border-brand-dark px-3 py-2 rounded-2xl text-xs font-bold outline-hidden focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/20 placeholder-gray-400"
                    />
                    <button 
                      type="submit" 
                      className="bg-brand-blue hover:bg-brand-blue/90 border-2 border-brand-dark px-4 py-2 rounded-2xl text-white font-extrabold shadow-[2px_2px_0px_0px_#2D3436] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer text-xs shrink-0 flex items-center gap-1"
                    >
                      <Plus size={13} className="stroke-[3.5px]" /> Add Item
                    </button>
                  </form>
                </div>
              );
            })()}

            {/* Quick Summary Cards */}
            <div className="bg-brand-yellow/15 border-2 border-brand-dark p-5 rounded-3xl shadow-[5px_5px_0px_0px_#2D3436]">
              <h4 className="text-xs font-black text-brand-dark uppercase tracking-widest mb-3">💡 Quick Booking Tips</h4>
              <ul className="text-xs text-brand-dark space-y-2 list-disc list-inside font-bold">
                <li>Check local weather directly before flying for packing upgrades.</li>
                <li>Compare flight bookings on flight aggregators like <a href="https://www.makemytrip.com" target="_blank" rel="noreferrer" className="text-brand-pink underline hover:text-black">MakeMyTrip</a>.</li>
                <li>Book local guides in advance on <a href="https://www.getyourguide.com" target="_blank" rel="noreferrer" className="text-brand-blue underline hover:text-black">GetYourGuide</a> to secure availability.</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2: STAYS & FOOD */}
        {activeTab === "stays" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="text-xs font-black text-brand-dark uppercase tracking-widest font-display mb-4">
                🏨 Recommended Accommodations ({plan.hotels.length} Options available)
              </h3>
              <div className="grid gap-4">
                {plan.hotels.map((hotel, idx) => (
                  <div key={idx} className="bg-white border-2 border-brand-dark p-5 rounded-2xl hover:-translate-y-0.5 transition-all flex flex-wrap items-center justify-between gap-4 shadow-[4px_4px_0px_0px_#4D96FF]">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-brand-blue/10 text-brand-blue border-2 border-brand-blue rounded-xl mt-1">
                        <Hotel className="w-5 h-5 stroke-[2.5px]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-brand-dark">{hotel.hotelName}</h4>
                          <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded border-2 ${
                            hotel.type === "luxury" ? "bg-amber-100 border-amber-400 text-amber-800" :
                            hotel.type === "budget" ? "bg-emerald-100 border-emerald-400 text-emerald-800" : "bg-blue-100 border-blue-400 text-blue-800"
                          }`}>
                            {hotel.type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 font-semibold">
                          <MapPin size={11} className="text-brand-pink" /> {hotel.location}
                        </p>
                        <p className="text-xs text-brand-dark mt-1 font-bold">
                          Rate: <span className="font-extrabold text-brand-purple">{scaleCost(hotel.pricePerNight, budgetMultiplier)}</span> / night
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={hotel.bookingLink.startsWith("http") ? hotel.bookingLink : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.hotelName + " " + hotel.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        referrerPolicy="no-referrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-blue hover:bg-blue-400 text-white border-2 border-brand-dark rounded-xl text-xs font-black transition-all shadow-[2px_2px_0px_0px_#2D3436] active:translate-y-[1px] active:shadow-0 cursor-pointer"
                      >
                        Book on {hotel.bookingPlatform}
                        <ExternalLink size={12} className="stroke-[2.5px]" />
                      </a>
                      
                      {onBookItem && (
                        <button
                          onClick={() => onBookItem("hotel", hotel.hotelName, scaleCost(hotel.pricePerNight, budgetMultiplier), hotel.location)}
                          className="inline-flex items-center gap-1 px-4 py-2 bg-brand-green hover:bg-[#5bb766] text-brand-dark border-2 border-brand-dark rounded-xl text-xs font-black transition-all shadow-[2px_2px_0px_0px_#2D3436] active:translate-y-[1px] active:shadow-0 cursor-pointer"
                        >
                          Book & Persistent Log 🏨
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t-4 border-brand-dark pt-6">
              <h3 className="text-xs font-black text-brand-dark uppercase tracking-widest font-display mb-4 flex items-center gap-1.5">
                <Utensils className="w-4 h-4 text-brand-green stroke-[3px]" /> 🍽️ Popular Restaurants & Food Places
              </h3>
              
              {/* Grid of high-fidelity restaurants with simulated atmospheric photography placeholders */}
              <div className="grid sm:grid-cols-2 gap-4 mb-5">
                {(plan.food.restaurants || []).map((restaurant, idx) => {
                  const restaurantImages = [
                    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80",
                    "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=400&q=80",
                    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80",
                    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=400&q=80"
                  ];
                  const imgSrc = restaurantImages[idx % restaurantImages.length];
                  
                  return (
                    <div key={idx} className="bg-white border-2 border-brand-dark rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_#6BCB77] flex flex-col justify-between">
                      <div>
                        {/* Restaurant Photo */}
                        <div className="h-32 w-full relative overflow-hidden bg-gray-100 border-b-2 border-brand-dark">
                          <img 
                            src={imgSrc} 
                            alt={restaurant.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-2 right-2 bg-brand-green border border-brand-dark font-black text-[9px] text-white px-2 py-0.5 rounded uppercase">
                            {restaurant.cuisineType}
                          </span>
                        </div>
                        
                        {/* Details */}
                        <div className="p-4 space-y-2">
                          <h4 className="font-black text-sm text-brand-dark leading-tight">{restaurant.name}</h4>
                          <p className="text-xs text-gray-500 font-bold flex items-center gap-1">
                            <MapPin size={10} className="text-brand-pink" /> {restaurant.location}
                          </p>
                          <div className="bg-[#E8F8F5] p-2 rounded-lg border border-brand-green/30 text-[11px] font-bold text-teal-800">
                            ⭐ Recommended: {restaurant.recommendedDish}
                          </div>
                        </div>
                      </div>

                      {/* Cost and Direct Mapping link footer */}
                      <div className="px-4 pb-4 pt-1 border-t border-dashed border-gray-150 flex items-center justify-between gap-1">
                        <div>
                          <span className="text-[9px] font-bold uppercase text-gray-400 block">Est cost 2 people</span>
                          <span className="text-xs font-black text-gray-700">{restaurant.costForTwo}</span>
                        </div>
                        <a
                          href={restaurant.googleMapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + " " + plan.destinationName)}`}
                          target="_blank"
                          rel="noreferrer"
                          referrerPolicy="no-referrer"
                          className="inline-flex items-center gap-1 bg-white hover:bg-brand-green hover:text-white text-brand-dark border-2 border-brand-dark px-3 py-1.5 rounded-xl text-[10px] font-black shadow-[2px_2px_0px_0px_#2D3436] transition-all cursor-pointer"
                        >
                          Find on Maps 📍
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* General Foods */}
              <div className="bg-[#E8F8F5]/50 border-2 border-brand-dark p-5 rounded-2xl shadow-[5px_5px_0px_0px_#6BCB77] space-y-4">
                <div>
                  <h4 className="text-[10px] font-black text-brand-dark uppercase tracking-wider">Other Recommended Local Delicacies:</h4>
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {plan.food.dishes.map((dish, i) => (
                      <span key={i} className="bg-white border-2 border-brand-dark text-brand-dark text-xs px-3 py-1.5 rounded-xl font-bold shadow-[1px_1px_0px_0px_rgba(45,52,54,1)]">
                        🍛 {dish}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-xs font-bold text-brand-dark border-t-2 border-dashed border-gray-300 pt-3 flex justify-between items-center">
                  <span>Approx cost per meal per person:</span>
                  <span className="font-extrabold text-brand-green bg-white border-2 border-brand-dark px-3 py-1 rounded-lg">{scaleCost(plan.food.costPerMeal, budgetMultiplier)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PLACES & ACTIVITIES */}
        {activeTab === "places" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in items-start">
            {/* Left Column: Sights List */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <h3 className="text-xs font-black text-brand-dark uppercase tracking-widest font-display mb-1 flex items-center gap-1.5">
                  🏛️ Top Sightseeing Attractions
                </h3>
                <p className="text-[10px] text-gray-400 font-extrabold uppercase mb-4">
                  💡 Hint: Click or view any sight card to locate it on the map container
                </p>
                <div className="grid gap-4">
                  {plan.topTouristPlaces.map((place, idx) => {
                    const isSelected = selectedPlaceName === place.name;
                    return (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedPlaceName(place.name)}
                        className={`bg-white border-4 rounded-3xl overflow-hidden cursor-pointer transition-all ${
                          isSelected 
                            ? "border-brand-pink shadow-[4px_4px_0px_0px_#2D3436] ring-2 ring-brand-pink/20 translate-x-1" 
                            : "border-brand-dark hover:-translate-y-0.5 hover:bg-[#FDFDFD] shadow-[4px_4px_0px_0px_#2D3436]"
                        }`}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 min-h-[140px]">
                          {/* Sight Photo Column */}
                          <div className="sm:col-span-4 relative h-40 sm:h-auto overflow-hidden bg-gray-50 border-b-4 sm:border-b-0 sm:border-r-4 border-brand-dark">
                            <img 
                              src={`https://images.unsplash.com/featured/500x350/?${encodeURIComponent(place.name)},${encodeURIComponent(plan.destinationName)},travel,landmark&sig=${idx}`}
                              alt={place.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const fallbacks = [
                                  "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=400&q=80",
                                  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=400&q=80",
                                  "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=400&q=80"
                                ];
                                target.src = fallbacks[idx % fallbacks.length];
                              }}
                            />
                            <div className="absolute top-2 left-2 bg-brand-dark text-white border border-brand-dark px-2 py-0.5 rounded text-[8px] font-black uppercase">
                              Spot #{idx + 1}
                            </div>
                          </div>
                          
                          {/* Sight Details Column */}
                          <div className="sm:col-span-8 p-5 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start gap-4 flex-wrap">
                                <h4 className="text-sm font-black text-brand-dark flex items-center gap-1.5">
                                  <span className={isSelected ? "text-brand-pink" : "text-gray-400"}>📍</span>
                                  {place.name}
                                </h4>
                                <span className="text-[10px] text-white font-extrabold bg-brand-pink border-2 border-brand-dark px-3 py-1 rounded-full shadow-[1px_1px_0px_0px_rgba(45,52,54,1)]">
                                  🎫 {place.entryPrice}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mt-2 font-medium leading-relaxed">
                                {place.description}
                              </p>
                            </div>
                            
                            <div className="mt-4 pt-3 border-t-2 border-dashed border-gray-150 flex flex-wrap items-center justify-between gap-3 text-[10px] font-bold text-gray-500">
                              <div className="flex-1 min-w-[200px] space-y-2">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                  <div>⏰ <span className="font-extrabold text-brand-dark text-[9px] uppercase">Duration:</span> {place.approxTimeNeeded}</div>
                                  <div>☀️ <span className="font-extrabold text-brand-dark text-[9px] uppercase">Best Time:</span> {place.bestTime}</div>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-450 text-[10.5px] flex-wrap">
                                  <span className="text-[11px]">📶</span>
                                  <span className="font-extrabold text-brand-dark text-[9px] uppercase">Signals at Spot:</span>
                                  {(() => {
                                    const sig = place.signalStrength || "Good Signal: Active Jio/Airtel 4G/5G coverage.";
                                    const sigLower = sig.toLowerCase();
                                    let badgeStyle = "text-emerald-700 bg-emerald-50/70 border-emerald-300";
                                    if (sigLower.includes("no") || sigLower.includes("weak") || sigLower.includes("poor") || sigLower.includes("sketchy")) {
                                      badgeStyle = "text-[#FF6B6B] bg-red-50 border-red-200";
                                    } else if (sigLower.includes("moderate") || sigLower.includes("average") || sigLower.includes("stable")) {
                                      badgeStyle = "text-[#D63031] bg-amber-50 border-amber-200";
                                    }
                                    return (
                                      <span className={`px-2 py-0.5 rounded border-2 font-black text-[9px] uppercase tracking-wide inline-block leading-none ${badgeStyle}`}>
                                        {sig}
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>
                              
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + " " + plan.destinationName)}`}
                                target="_blank"
                                rel="noreferrer"
                                referrerPolicy="no-referrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 bg-white hover:bg-brand-pink hover:text-white text-brand-dark border-2 border-brand-dark px-2.5 py-1.5 rounded-lg text-[9px] font-black shadow-[2px_2px_0px_0px_#2D3436] transition-all cursor-pointer"
                              >
                                Google location 🗺️
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t-4 border-brand-dark pt-6">
                <h3 className="text-xs font-black text-brand-dark uppercase tracking-widest font-display mb-4">
                  Curated Experiences & Adventures
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {plan.activities.map((activity, idx) => (
                    <div key={idx} className="bg-white border-2 border-brand-dark p-5 rounded-2xl shadow-[4px_4px_0px_0px_#6C5CE7] flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] uppercase font-black tracking-widest text-[#6C5CE7] bg-[#F7F1FF] border border-[#A29BFE] px-2 py-0.5 rounded-sm">
                          {activity.type}
                        </span>
                        <h4 className="text-xs font-black text-brand-dark mt-2.5">{activity.name}</h4>
                      </div>
                      <div className="mt-4 pt-2 border-t border-dashed border-gray-150 text-xs font-bold text-gray-500 flex justify-between items-center">
                        <span>Estimated cost:</span>
                        <span className="font-extrabold text-[#6C5CE7]">{scaleCost(activity.cost, budgetMultiplier)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Free Leaflet Map */}
            <div className="lg:col-span-5 h-[380px] lg:h-[max(480px,calc(100vh-220px))] lg:sticky lg:top-[20px] w-full min-h-[380px]">
              <TopSightsMap 
                places={plan.topTouristPlaces} 
                destinationName={plan.destinationName}
                selectedPlaceName={selectedPlaceName}
                onSelectPlace={setSelectedPlaceName}
              />
            </div>
          </div>
        )}

        {/* TAB 4: TRANSIT GUIDES */}
        {activeTab === "transport" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="text-xs font-black text-brand-dark uppercase tracking-widest font-display mb-4">
                🚌 Travel To Destination (All Options Listed Below)
              </h3>
              <div className="grid gap-4">
                {/* Flight option */}
                <div className="bg-white border-2 border-brand-dark p-5 rounded-2xl shadow-[4px_4px_0px_0px_#4D96FF] space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 border-2 border-blue-400 rounded-xl mt-1">
                      <Plane className="w-5 h-5 stroke-[2.5px]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-brand-dark">✈️ Available Flight Schedules</h4>
                      <p className="text-xs text-gray-500 font-medium mt-1">{plan.transport.flight.suggestion}</p>
                      <p className="text-xs font-extrabold text-brand-blue mt-1">Est Price Range: {scaleCost(plan.transport.flight.priceRange, budgetMultiplier)}</p>
                    </div>
                  </div>

                  {/* Render flight optionsList if available */}
                  {plan.transport.flight.optionsList && plan.transport.flight.optionsList.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t-2 border-dashed border-gray-150">
                      {plan.transport.flight.optionsList.map((flight, idx) => (
                        <div key={idx} className="bg-[#FAF9F6] border-2 border-brand-dark rounded-xl p-3 flex flex-col justify-between shadow-[2px_2px_0px_0px_rgba(45,52,54,0.15)] hover:bg-white transition-colors">
                          <div>
                            <div className="flex justify-between items-center bg-brand-blue/10 px-2 py-1 rounded border border-brand-blue/30">
                              <span className="font-extrabold text-[10px] text-brand-blue">{flight.carrierName}</span>
                              <span className="text-[9px] font-mono font-bold text-gray-400">CLASS: ECON</span>
                            </div>
                            <div className="mt-2.5 space-y-1 text-xs text-gray-600 font-bold">
                              <div>🕒 {flight.timing}</div>
                              <div>💰 {scaleCost(flight.price, budgetMultiplier)} (Estim.)</div>
                            </div>
                          </div>
                          <div className="flex gap-1.5 mt-3">
                            <a 
                              href={flight.bookingLink || `https://www.google.com/search?q=${encodeURIComponent(flight.carrierName + " flight deals to " + plan.destinationName)}`}
                              target="_blank"
                              rel="noreferrer"
                              referrerPolicy="no-referrer"
                              className="flex-1 text-center bg-white hover:bg-brand-blue hover:text-white text-brand-dark border-2 border-brand-dark py-1.5 rounded-lg text-[10px] font-black shadow-[1.5px_1.5px_0px_0px_#2D3436] transition-all cursor-pointer"
                            >
                              Open Site 🌟
                            </a>
                            {onBookItem && (
                              <button
                                onClick={() => onBookItem("transport", flight.carrierName + " Flight", scaleCost(flight.price, budgetMultiplier), flight.timing)}
                                className="px-2.5 bg-brand-green hover:bg-[#5bb766] text-brand-dark border-2 border-brand-dark rounded-lg text-[10px] font-black shadow-[1.5px_1.5px_0px_0px_#2D3436] cursor-pointer"
                              >
                                Log ✈️
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pt-2">
                      <a
                        href={plan.transport.flight.bookingLink || `https://www.google.com/search?q=${encodeURIComponent("flights to " + plan.destinationName)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        referrerPolicy="no-referrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 border-2 border-brand-dark bg-white hover:bg-[#F0F9FF] text-brand-dark rounded-xl text-xs font-black transition-all shadow-[2px_2px_0px_0px_#2D3436] active:translate-y-[1px] cursor-pointer"
                      >
                        Check general flight options
                        <ExternalLink size={11} className="stroke-[2.5px]" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Train option */}
                <div className="bg-white border-2 border-brand-dark p-5 rounded-2xl hover:-translate-y-0.5 transition-all flex flex-wrap items-center justify-between gap-4 shadow-[4px_4px_0px_0px_#6BCB77]">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 border-2 border-emerald-400 rounded-xl mt-1">
                      <Train className="w-5 h-5 stroke-[2.5px]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-brand-dark">🚆 Railway (IRCTC Options)</h4>
                      <p className="text-xs text-gray-500 font-medium mt-1">{plan.transport.train.suggestion}</p>
                      <p className="text-xs font-extrabold text-brand-green mt-1">Est: {scaleCost(plan.transport.train.priceRange, budgetMultiplier)}</p>
                    </div>
                  </div>
                  <a
                    href="https://www.irctc.co.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-green border-2 border-brand-dark text-white hover:bg-opacity-90 rounded-xl text-xs font-black transition-all shadow-[2px_2px_0px_0px_#2D3436] active:translate-y-[1px] cursor-pointer"
                  >
                    Open IRCTC Train Search
                    <ExternalLink size={11} className="stroke-[2.5px]" />
                  </a>
                </div>

                {/* Bus option */}
                <div className="bg-white border-2 border-brand-dark p-5 rounded-2xl shadow-[4px_4px_0px_0px_#FF6B6B] space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-red-50 text-red-650 border-2 border-red-400 rounded-xl mt-1">
                      <Bus className="w-5 h-5 stroke-[2.5px]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-brand-dark">🚌 Highway Bus Operators</h4>
                      <p className="text-xs text-gray-500 font-medium mt-1">{plan.transport.bus.suggestion}</p>
                      <p className="text-xs font-extrabold text-brand-pink mt-1">Est: {scaleCost(plan.transport.bus.priceRange, budgetMultiplier)}</p>
                    </div>
                  </div>

                  {/* Render bus optionsList if available */}
                  {plan.transport.bus.optionsList && plan.transport.bus.optionsList.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t-2 border-dashed border-gray-150">
                      {plan.transport.bus.optionsList.map((bus, idx) => (
                        <div key={idx} className="bg-[#FAF9F6] border-2 border-brand-dark rounded-xl p-3 flex flex-col justify-between shadow-[2px_2px_0px_0px_rgba(45,52,54,0.15)] hover:bg-white transition-colors">
                          <div>
                            <div className="flex justify-between items-center bg-brand-pink/10 px-2 py-1 rounded border border-brand-pink/30">
                              <span className="font-extrabold text-[10px] text-brand-pink">{bus.carrierName}</span>
                              <span className="text-[9px] font-mono font-bold text-gray-400">TYPE: AC SEATER</span>
                            </div>
                            <div className="mt-2.5 space-y-1 text-xs text-gray-600 font-bold">
                              <div>🕒 {bus.timing}</div>
                              <div>💰 {scaleCost(bus.price, budgetMultiplier)} (Estim.)</div>
                            </div>
                          </div>
                          <div className="flex gap-1.5 mt-3">
                            <a 
                              href={bus.bookingLink || `https://www.redbus.in/booking?q=${encodeURIComponent(bus.carrierName + " bus to " + plan.destinationName)}`}
                              target="_blank"
                              rel="noreferrer"
                              referrerPolicy="no-referrer"
                              className="flex-1 text-center bg-white hover:bg-brand-pink hover:text-white text-brand-dark border-2 border-brand-dark py-1.5 rounded-lg text-[10px] font-black shadow-[1.5px_1.5px_0px_0px_#2D3436] transition-all cursor-pointer"
                            >
                              Open Site 🎫
                            </a>
                            {onBookItem && (
                              <button
                                onClick={() => onBookItem("transport", bus.carrierName + " Bus", scaleCost(bus.price, budgetMultiplier), bus.timing)}
                                className="px-2.5 bg-brand-green hover:bg-[#5bb766] text-brand-dark border-2 border-brand-dark rounded-lg text-[10px] font-black shadow-[1.5px_1.5px_0px_0px_#2D3436] cursor-pointer"
                              >
                                Log 🚌
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pt-2">
                      <a
                        href="https://www.redbus.in"
                        target="_blank"
                        rel="noopener noreferrer"
                        referrerPolicy="no-referrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-pink border-2 border-brand-dark text-white rounded-xl text-xs font-black transition-all shadow-[2px_2px_0px_0px_#2D3436] active:translate-y-[1px] cursor-pointer"
                      >
                        Book Redbus operators
                        <ExternalLink size={11} className="stroke-[2.5px]" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t-4 border-brand-dark pt-6 font-bold">
              <h3 className="text-xs font-black text-brand-dark uppercase tracking-widest font-display mb-4">
                🛺 Local Commute & Auto/Cab Tariffs
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-[#FFF4E0] border-2 border-brand-dark p-5 rounded-2xl shadow-[4px_4px_0px_0px_#2D3436] space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-brand-dark flex items-center gap-2">
                      <Car size={13} className="text-brand-pink stroke-[2.5px]" /> Local Auto/Cab Tariffs
                    </h4>
                    <p className="text-xs text-gray-600 font-medium">{plan.localTransport.options}</p>
                    
                    {/* Tariffs Breakdown */}
                    <div className="pt-2.5 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center bg-white border border-brand-yellow/50 p-2 rounded-lg">
                        <span className="text-gray-500">🛺 Auto Rickshaw Fare:</span>
                        <span className="font-extrabold text-brand-dark font-mono">{plan.localTransport.autoPriceEstimate || "₹150 - ₹250 flat / trip"}</span>
                      </div>
                      <div className="flex justify-between items-center bg-white border border-brand-yellow/50 p-2 rounded-lg">
                        <span className="text-gray-500">🚖 Cab / Uber Fare:</span>
                        <span className="font-extrabold text-[#6C5CE7] font-mono">{plan.localTransport.taxiPriceEstimate || "₹250 - ₹450 flat / trip"}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs font-bold text-brand-dark pt-2 border-t border-dashed border-gray-300">
                    <span className="text-gray-500">Ola/Uber Availability:</span> {plan.localTransport.olaUberAvailability}
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-dashed border-gray-300 text-xs font-bold">
                    <span>Est local budget/day:</span>
                    <span className="font-extrabold text-brand-pink bg-white border border-brand-dark px-2.5 py-1 rounded-md">{scaleCost(plan.localTransport.estimatedCommuteCost, budgetMultiplier)}</span>
                  </div>
                  <div className="pt-2">
                    <a
                      href={plan.localTransport.rentalBookingLink || `https://www.google.com/search?q=${encodeURIComponent("bike rental " + plan.destinationName)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                      className="text-xs font-black text-brand-blue bg-white hover:bg-brand-blue hover:text-white transition-all border-2 border-brand-dark px-3 py-2 rounded-lg flex items-center justify-between cursor-pointer shadow-[2px_2px_0px_0px_#2D3436]"
                    >
                      <span>🏍️ Direct Bike/Cab Rental Mapping</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                <div className="bg-[#EEF2FF] border-2 border-brand-dark p-5 rounded-2xl shadow-[4px_4px_0px_0px_#4D96FF] flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-black text-brand-dark uppercase tracking-wider">🧳 Local Guide Hub</h4>
                    <p className="text-xs text-brand-dark font-medium leading-relaxed">{plan.touristGuide.availability}</p>
                    <div className="text-[11px] text-gray-500 font-bold bg-white/80 p-2 rounded-xl border border-indigo-200">
                      💡 Tip: {plan.touristGuide.bookingPlatformTip}
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-dashed border-gray-300 flex items-center justify-between text-xs font-bold mt-4 flex-wrap gap-2 animate-fade-in">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500">Daily Guide rate:</span>
                      <span className="font-extrabold text-brand-blue bg-white border-2 border-brand-dark px-3 py-1 rounded-xl">
                        {scaleCost(plan.touristGuide.estimatedCostPerDay, budgetMultiplier)}
                      </span>
                    </div>

                    {onBookItem && (
                      <button
                        onClick={() => onBookItem("guide", "Local Guide (" + plan.destinationName + ")", scaleCost(plan.touristGuide.estimatedCostPerDay, budgetMultiplier), "Guiding Services")}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-green hover:bg-[#5bb766] text-brand-dark border-2 border-brand-dark rounded-xl text-xs font-black transition-all shadow-[2px_2px_0px_0px_#2D3436] cursor-pointer"
                      >
                        Reserve Guide & Log 🧳
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: BUDGET SUMMARY */}
        {activeTab === "budget" && (
          <div className="space-y-6 animate-fade-in">
              {/* Currency Switching Toggle */}
              <div className="flex justify-between items-center bg-[#FFF4E0] border-4 border-brand-dark p-4 rounded-3xl shadow-[5px_5px_0px_0px_#2D3436]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-brand-pink text-white border-2 border-brand-dark rounded-xl">
                    <Coins className="w-5 h-5 stroke-[2.5px]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-brand-dark uppercase tracking-widest leading-none">
                      💱 Currency Reference Preferences
                    </h4>
                    <p className="text-[9px] text-gray-500 font-bold mt-1">
                      Convert between base destination currency and your local reference.
                    </p>
                  </div>
                </div>

                <div className="inline-flex bg-white border-2 border-brand-dark rounded-xl p-1 gap-1 shadow-[2px_2px_0px_0px_#2D3436]">
                  <button
                    onClick={() => setCurrencyPreference("base")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
                      currencyPreference === "base"
                        ? "bg-brand-pink text-white border-2 border-brand-dark shadow-[1px_1px_0px_0px_#2D3436]"
                        : "text-brand-dark hover:bg-[#F0F9FF] border-2 border-transparent"
                    }`}
                  >
                    Base ({plan.isInternational ? "USD $" : "INR ₹"})
                  </button>
                  <button
                    onClick={() => setCurrencyPreference("preferred")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
                      currencyPreference === "preferred"
                        ? "bg-brand-blue text-white border-2 border-brand-dark shadow-[1px_1px_0px_0px_#2D3436]"
                        : "text-brand-dark hover:bg-[#F0F9FF] border-2 border-transparent"
                    }`}
                  >
                    Preferred ({plan.isInternational ? "INR ₹" : "USD $"})
                  </button>
                </div>
              </div>

              <div className="bg-[#2D3436] text-white border-4 border-brand-dark p-6 rounded-3xl shadow-[6px_6px_0px_0px_#FFD93D] flex justify-between items-center flex-wrap gap-4">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#FFD93D]">🎉 Grand Total Plan Estimate</span>
                  <h3 className="text-3xl font-black italic text-white mt-1 w-full">
                    {formatBudgetCost(plan.budgetBreakdown.grandTotal.totalCount, budgetMultiplier, currencyPreference)}
                  </h3>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mt-1">Estimated for requested traveler party.</p>
                </div>
                <div className="bg-[#FFF4E0] text-brand-dark border-2 border-brand-dark px-4 py-2 rounded-2xl shadow-[2px_2px_0px_0px_white]">
                  <span className="text-[9px] uppercase font-black tracking-widest text-gray-500 text-center block">Per Person</span>
                  <div className="text-lg font-black text-brand-dark text-center">
                    {formatBudgetCost(plan.budgetBreakdown.grandTotal.perPerson, budgetMultiplier, currencyPreference)}
                  </div>
                </div>
              </div>

              {/* Neo-brutalist interactive Expenses Pie Chart */}
              <div className="bg-white border-4 border-brand-dark p-5 rounded-3xl shadow-[5px_5px_0px_0px_#2D3436] grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-7 h-[260px] w-full flex justify-center items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#2D3436" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        content={({ active, payload }: any) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const isPref = currencyPreference === "preferred";
                            const sym = isPref ? (plan.isInternational ? "₹" : "$") : (plan.isInternational ? "$" : "₹");
                            const displayValue = convertNumericValue(data.value, currencyPreference);
                            return (
                              <div className="bg-white border-2 border-brand-dark p-2.5 rounded-xl text-[10px] font-black shadow-[3px_3px_0px_0px_#2D3436]">
                                <p className="text-gray-500 uppercase tracking-wider">{data.name}</p>
                                <p className="text-brand-pink text-xs mt-0.5 font-bold">
                                  {sym}{displayValue.toLocaleString(isPref ? "en-IN" : "en-US")}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="md:col-span-5 space-y-3">
                  <div>
                    <span className="text-[9px] font-black uppercase text-brand-pink tracking-widest">📊 Distribution Shares</span>
                    <h4 className="text-xs font-black text-brand-dark uppercase tracking-wide mt-0.5 font-display">
                      Expense Share Comparison
                    </h4>
                  </div>
                  <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
                    {chartData.map((item, idx) => {
                      const pct = totalSum > 0 ? ((item.value / totalSum) * 100).toFixed(1) : "0.0";
                      const isPref = currencyPreference === "preferred";
                      const sym = isPref ? (plan.isInternational ? "₹" : "$") : (plan.isInternational ? "$" : "₹");
                      const displayValue = convertNumericValue(item.value, currencyPreference);
                      return (
                        <div key={idx} className="flex items-center justify-between gap-2 text-[11px] font-bold bg-[#FAF9F6] border border-gray-100 p-2 rounded-xl">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded border border-brand-dark inline-block shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-brand-dark font-extrabold">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-brand-dark font-black">{sym}{displayValue.toLocaleString(isPref ? "en-IN" : "en-US")}</span>
                            <span className="text-[9px] font-bold text-gray-400 block uppercase font-mono">{pct}% share</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black text-brand-dark uppercase tracking-widest font-display mb-3">
                  📊 Detailed Budget Category Summary Table
                </h3>
                <div className="overflow-hidden border-4 border-brand-dark rounded-3xl shadow-[5px_5px_0px_0px_#2D3436]">
                <table className="min-w-full divide-y divide-brand-dark text-left text-xs bg-white">
                  <thead className="bg-[#FFF4E0] border-b-2 border-brand-dark text-brand-dark font-black uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-5 py-4">Expense Category</th>
                      <th className="px-5 py-4 text-right">Sum Total ({currencyPreference === "preferred" ? (plan.isInternational ? "₹" : "$") : (plan.isInternational ? "$" : "₹")})</th>
                      <th className="px-5 py-4 text-right">Per Person share ({currencyPreference === "preferred" ? (plan.isInternational ? "₹" : "$") : (plan.isInternational ? "$" : "₹")})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-gray-100 text-[#2D3436] font-bold">
                    {[
                      { name: "Transport (to/from)", icon: Plane, cost: plan.budgetBreakdown.transport, accent: "text-[#4D96FF]", color: "#4D96FF" },
                      { name: "Accommodation", icon: Hotel, cost: plan.budgetBreakdown.accommodation, accent: "text-[#6C5CE7]", color: "#6C5CE7" },
                      { name: "Food Recommendations", icon: Utensils, cost: plan.budgetBreakdown.food, accent: "text-[#6BCB77]", color: "#6BCB77" },
                      { name: "Curated Activities", icon: Route, cost: plan.budgetBreakdown.activities, accent: "text-[#FF6B6B]", color: "#FF6B6B" },
                      { name: "On-demand Cab/Bus", icon: Car, cost: plan.budgetBreakdown.localTransport, accent: "text-[#FFD93D]", color: "#FFD93D" },
                      { name: "Tourist Local Guide", icon: Users, cost: plan.budgetBreakdown.touristGuide, accent: "text-[#A29BFE]", color: "#A29BFE" },
                      { name: "Other Travel Miscellany", icon: ShieldAlert, cost: plan.budgetBreakdown.miscellaneous, accent: "text-[#E17055]", color: "#E17055" },
                    ].map((row, idx) => {
                      const Icon = row.icon;
                      const numCost = getNumericCost(row.cost.totalCount, budgetMultiplier);
                      const pct = totalSum > 0 ? (numCost / totalSum) * 100 : 0;

                      return (
                        <tr key={idx} className="hover:bg-[#F0F9FF]/20 transition-all">
                          <td className="px-5 py-4 font-bold text-brand-dark">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2 text-xs">
                                <Icon size={14} className={`${row.accent} stroke-[2.5px]`} />
                                <span className="font-extrabold">{row.name}</span>
                              </div>
                              {/* Custom dynamic weight progress bar */}
                              <div className="w-full max-w-[200px] sm:max-w-[260px] bg-slate-50 border border-gray-200 rounded-lg p-1.5 flex flex-col gap-1">
                                <div className="flex justify-between items-center text-[8px] text-gray-400 font-extrabold uppercase tracking-wide">
                                  <span>Distribution Weight</span>
                                  <span className="font-mono text-brand-dark">{pct.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-gray-200/60 border border-brand-dark/20 rounded-full h-2 overflow-hidden p-[1px]">
                                  <div 
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%`, backgroundColor: row.color }}
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right font-black text-brand-dark text-sm vertical-align-middle shrink-0">
                            {formatBudgetCost(row.cost.totalCount, budgetMultiplier, currencyPreference)}
                          </td>
                          <td className="px-5 py-4 text-right font-bold text-gray-400 vertical-align-middle shrink-0">
                            {formatBudgetCost(row.cost.perPerson, budgetMultiplier, currencyPreference)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-brand-yellow/15 border-t-4 border-brand-dark font-black text-brand-dark text-sm">
                      <td className="px-5 py-4 flex items-center gap-1.5 uppercase font-black text-[12px]">
                        <Sparkles size={14} className="text-brand-pink stroke-[3px]" />
                        GRAND TOTAL SUM
                      </td>
                      <td className="px-5 py-4 text-right font-extrabold text-brand-pink text-base">
                        {formatBudgetCost(plan.budgetBreakdown.grandTotal.totalCount, budgetMultiplier, currencyPreference)}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-gray-500 text-xs">
                        {formatBudgetCost(plan.budgetBreakdown.grandTotal.perPerson, budgetMultiplier, currencyPreference)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Booking Quick links banner footer */}
      <div className="bg-[#2D3436] border-t-4 border-brand-dark p-5 flex flex-wrap justify-between items-center text-white gap-3 rounded-b-[20px] shadow-inner">
        <span className="font-black italic text-xs text-[#FFF4E0]">🔗 Book on partnered networks directly:</span>
        <div className="flex gap-2 flex-wrap">
          <a href="https://www.makemytrip.com" target="_blank" rel="noreferrer" className="bg-white border-2 border-black px-3 py-1.5 rounded-xl text-[#2D3436] hover:bg-brand-yellow font-black text-xs shadow-[2px_2px_0px_0px_rgba(255,107,107,1)] active:shadow-0 active:translate-y-[1px] transition-all cursor-pointer">MakeMyTrip</a>
          <a href="https://www.irctc.co.in" target="_blank" rel="noreferrer" className="bg-white border-2 border-black px-3 py-1.5 rounded-xl text-[#2D3436] hover:bg-brand-yellow font-black text-xs shadow-[2px_2px_0px_0px_rgba(77,150,255,1)] active:shadow-0 active:translate-y-[1px] transition-all cursor-pointer">IRCTC</a>
          <a href="https://www.redbus.in" target="_blank" rel="noreferrer" className="bg-white border-2 border-black px-3 py-1.5 rounded-xl text-[#2D3436] hover:bg-brand-yellow font-black text-xs shadow-[2px_2px_0px_0px_rgba(107,203,119,1)] active:shadow-0 active:translate-y-[1px] transition-all cursor-pointer">RedBus</a>
          <a href="https://www.booking.com" target="_blank" rel="noreferrer" className="bg-white border-2 border-black px-3 py-1.5 rounded-xl text-[#2D3436] hover:bg-brand-yellow font-black text-xs shadow-[2px_2px_0px_0px_rgba(255,217,61,1)] active:shadow-0 active:translate-y-[1px] transition-all cursor-pointer">Booking.com</a>
        </div>
      </div>
    </div>
  );
}
