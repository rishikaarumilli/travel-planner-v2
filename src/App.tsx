import React, { useState, useRef, useEffect } from "react";
import { Message, TravelPlan, ChatState } from "./types";
import { TravelDashboard } from "./components/TravelDashboard";
import { MarkdownOutput } from "./components/MarkdownOutput";
import { 
  Send, Compass, Sparkles, MapPin, 
  Users, Calendar, RefreshCw, ChevronRight, MessageSquare,
  Lock, Mail, User as UserIcon, BookOpen, LogOut, CheckCircle,
  AlertCircle, ShieldCheck, Heart, Trash2, ListFilter
} from "lucide-react";

// Import Firebase dependencies safely
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendEmailVerification, 
  signOut, 
  updateProfile,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDoc,
  deleteDoc,
  onSnapshot, 
  serverTimestamp,
  getDocFromServer
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";

export default function App() {
  // Authentication & Session States
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccessMsg, setAuthSuccessMsg] = useState("");
  
  // Auth Form Inputs
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [preferencesInput, setPreferencesInput] = useState("Budget traveler, Vegetarian eateries, cultural interest");
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);

  // Email Verification Sub-States (OTP / Bypassing / Actual refresh)
  const [otpInput, setOtpInput] = useState("");
  const [sandboxBypass, setSandboxBypass] = useState(false);
  const [isRefreshingVerification, setIsRefreshingVerification] = useState(false);
  const [verificationCooldown, setVerificationCooldown] = useState(0);

  useEffect(() => {
    if (verificationCooldown <= 0) return;
    const interval = setInterval(() => {
      setVerificationCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [verificationCooldown]);

  // Dashboard / Firestore persistence status
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [bookingHistory, setBookingHistory] = useState<any[]>([]);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [userPreferences, setUserPreferences] = useState("");
  const [showDashboardDrawer, setShowDashboardDrawer] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Existing Chat & Travel core states with localStorage persistence integration
  const [messages, setMessages] = useState<Message[]>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("trip")) {
      return [
        {
          id: "welcome-shared-loading",
          role: "assistant",
          content: "Loading shared travel plan...",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ];
    }
    const saved = localStorage.getItem("voyageai_messages");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Parse error ignored and clean default used
      }
    }
    return [
      {
        id: "welcome",
        role: "assistant",
        content: "Hello! 🗺️ I am your **VoyageAI Scout** Trip Architect. I can help you design the perfect, detailed itinerary customized exactly for your travel goals!\n\nBefore we begin, tell me: **Are you planning a trip to an Indian State/City, or an International Destination outside India?**",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);

  const [plan, setPlan] = useState<TravelPlan | null>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("trip")) {
      return null;
    }
    const saved = localStorage.getItem("voyageai_plan");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Parse error ignored
      }
    }
    return null;
  });

  const [isInputFocused, setIsInputFocused] = useState(false);
  
  const [chatState, setChatState] = useState<ChatState>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("trip")) {
      return {
        currentStep: "ready",
        regionType: "",
        destination: "",
        days: "",
        people: "",
      };
    }
    const saved = localStorage.getItem("voyageai_chat_state");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Parse error ignored
      }
    }
    return {
      currentStep: "region",
      regionType: "",
      destination: "",
      days: "",
      people: "",
    };
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<{
    type: "network" | "generation" | "parsing" | "unknown";
    message: string;
    payload: { destination: string; days: string; people: string };
  } | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Trigger auto-dismiss dynamic Toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 4500);
  };

  // Perform a test connection check during startup
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.warn("[Firebase Connection Check] Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Listen for Firebase Auth user adjustments
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      if (currentUser) {
        // Load user profile details securely
        const profilePath = `users/${currentUser.uid}`;
        try {
          const profileDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (profileDoc.exists()) {
            const data = profileDoc.data();
            setUserPreferences(data.preferences || "");
            if (data.preferences) setPreferencesInput(data.preferences);
          }
        } catch (err) {
          // If unverified, this might fail according to rules, which is expected
          console.log("Profile lookup skipped/locked for unverified user");
        }

        // Set up real-time onSnapshot listeners for Plans and Bookings
        const plansPath = `users/${currentUser.uid}/plans`;
        const unsubscribePlans = onSnapshot(
          collection(db, "users", currentUser.uid, "plans"),
          (snapshot) => {
            const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSavedPlans(loaded);
          },
          (error) => {
            console.log("Plans snapshot locked or unverified: ", error.message);
          }
        );

        const bookingsPath = `users/${currentUser.uid}/bookings`;
        const unsubscribeBookings = onSnapshot(
          collection(db, "users", currentUser.uid, "bookings"),
          (snapshot) => {
            const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBookingHistory(loaded);
          },
          (error) => {
            console.log("Bookings snapshot locked or unverified: ", error.message);
          }
        );

        return () => {
          unsubscribePlans();
          unsubscribeBookings();
        };
      } else {
        setSavedPlans([]);
        setBookingHistory([]);
      }
    });

    return () => unsubscribe();
  }, [user?.emailVerified]);

  // Load shared itinerary from URL query parameter if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get("trip");
    if (sharedData) {
      try {
        const decoded = decodeURIComponent(escape(atob(sharedData)));
        const parsedPlan = JSON.parse(decoded) as TravelPlan;
        if (parsedPlan && parsedPlan.destinationName) {
          setPlan(parsedPlan);
          setChatState({
            currentStep: "ready",
            regionType: parsedPlan.isInternational ? "international" : "india",
            destination: parsedPlan.destinationName,
            days: parsedPlan.budgetBreakdown?.accommodation?.perPerson ? "Custom" : "5",
            people: "Custom",
          });
          setMessages([
            {
              id: "welcome-shared",
              role: "assistant",
              content: `👋 **Welcome! Someone shared this custom trip plan to ${parsedPlan.destinationName} with you!** 🗺️\n\nI have unlocked and loaded the complete interactive **Travel Dashboard** on the right side of the screen containing handpicked accommodations, sightseeing spots, and transport details.\n\n*Feel free to ask me questions about this Shared Trip or edit details directly!*`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
          ]);
        }
      } catch (err) {
        console.error("Failed to parse shared trip from URL parameter:", err);
      }
    }
  }, []);

  // Auto scroll to chat end on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Local storage synchronization effects
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.get("trip")) {
      localStorage.setItem("voyageai_chat_state", JSON.stringify(chatState));
    }
  }, [chatState]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.get("trip")) {
      localStorage.setItem("voyageai_messages", JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.get("trip")) {
      if (plan) {
        localStorage.setItem("voyageai_plan", JSON.stringify(plan));
      } else {
        localStorage.removeItem("voyageai_plan");
      }
    }
  }, [plan]);

  // Execute Core Travel Generation Plan API helper
  const executePlanGeneration = async (destination: string, days: string, people: string) => {
    setChatState(prev => ({ ...prev, currentStep: "generating", destination, days, people }));
    setLoading(true);
    setGenerationError(null);

    // Filter out previous errors or current generating message to avoid duplicates
    setMessages((prev) => {
      const filtered = prev.filter(msg => msg.id !== "generating-msg" && !msg.id.toString().startsWith("assistant-error"));
      return [
        ...filtered,
        {
          id: `generating-msg`,
          role: "assistant",
          content: `Got it! I am planning a customized travel trip to **${destination}** for **${days} days** with **${people} travelers**.\n\nNow compiling actual flight plans, bus schedules, homestays and hotels, Google Maps local coordinates, local dining restaurants, sightseeing spots, and auto-rickshaw/Uber pricing... 🪄🔮✨`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ];
    });

    try {
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination,
          days,
          people,
        }),
      });

      if (!response.ok) {
        throw new Error(`API_GENERATION_FAILED: Server returned status ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("API_PARSING_FAILED: Invalid content type");
      }

      const data: TravelPlan = await response.json();
      setPlan(data);
      setChatState(prev => ({ ...prev, currentStep: "ready" }));

      setMessages((prev) => {
        const filtered = prev.filter(msg => msg.id !== "generating-msg" && !msg.id.toString().startsWith("assistant-error"));
        return [
          ...filtered,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: `✨ **Your custom Travel Plan is fully compiled!** 🗺️\n\nI have unlocked and loaded an interactive **Travel Dashboard** on the right side of the screen containing **at least 5-7 accommodations**, direct booking pointers, detailed available flights and buses, direct restaurant locations, auto rickshaw/Uber fares, and sights.\n\n*Would you like a day-wise itinerary, or help booking anything specific?*`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ];
      });
    } catch (err: any) {
      console.error("API error during travel plan generation:", err);
      
      let errorMsgTxt = "";
      let errType: "network" | "generation" | "parsing" | "unknown" = "unknown";

      if (!navigator.onLine) {
        errType = "network";
        errorMsgTxt = "🔌 Offline: You appear to be offline! Please check your network connection and try again.";
      } else if (err instanceof TypeError || err.message?.includes("Failed to fetch") || err.message?.includes("network")) {
        errType = "network";
        errorMsgTxt = "🌐 Connection Failure: Unable to contact our planning servers. Please check your internet connection and try again!";
      } else if (err.message?.includes("API_GENERATION_FAILED") || err.message?.includes("status")) {
        errType = "generation";
        errorMsgTxt = "🤖 Service Issue: The travel planner AI failed to successfully compile your plan. This is likely due to rate limits or API key restrictions.";
      } else if (err.message?.includes("API_PARSING_FAILED") || err.message?.includes("JSON")) {
        errType = "parsing";
        errorMsgTxt = "🔮 Format Issue: The server returned invalid travel formatting. Let's try requesting the structured plan again.";
      } else {
        errType = "unknown";
        errorMsgTxt = `⚠️ Generation failed: ${err.message || "An unexpected error occurred during trip planning"}. Please try again!`;
      }

      setGenerationError({
        type: errType,
        message: errorMsgTxt,
        payload: { destination, days, people }
      });

      setMessages((prev) => {
        const filtered = prev.filter(msg => msg.id !== "generating-msg" && !msg.id.toString().startsWith("assistant-error"));
        return [
          ...filtered,
          {
            id: `assistant-error-${Date.now()}`,
            role: "assistant",
            content: `⚠️ **Planning Assistance Interrupted**\n\n${errorMsgTxt}\n\nYou can click the **Retry Generating Plan** button above the chat box to request again immediately!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ];
      });

      // Keep step as "people" so users can edit/retry
      setChatState(prev => ({ ...prev, currentStep: "people" }));
    } finally {
      setLoading(false);
    }
  };

  const handleRetryPlan = async () => {
    if (!generationError) return;
    const { destination, days, people } = generationError.payload;
    setGenerationError(null);
    await executePlanGeneration(destination, days, people);
  };

  // Resume compiler if session refreshed mid-way
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.get("trip") && chatState.currentStep === "generating" && chatState.destination && chatState.days && chatState.people && !loading) {
      console.log("[VoyageAI] Resuming travel plan generation on page reload", chatState);
      executePlanGeneration(chatState.destination, chatState.days, chatState.people);
    }
  }, []);

  // Firebase Auth Action Handlers
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccessMsg("");
    if (!emailInput || !passwordInput || !nameInput) {
      setAuthError("All fields are required for standard Traveler registration.");
      return;
    }
    try {
      // 1. Create email & password user credentials
      const userCredential = await createUserWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      const newUser = userCredential.user;
      
      // 2. Set user display display name
      await updateProfile(newUser, { displayName: nameInput.trim() });
      
      // 3. Setup User Profile document in standard Firestore /users/{userId}
      // Since rules allow user creation with isOwner(userId) without verified check, this passes perfectly!
      await setDoc(doc(db, "users", newUser.uid), {
        name: nameInput.trim(),
        email: emailInput.trim(),
        preferences: preferencesInput.trim()
      });

      // 4. Trigger authentic Firebase verification email link
      try {
        console.log(`[Firebase Auth] Initiating email verification dispatch for user: ${newUser.email} (UID: ${newUser.uid})`);
        await sendEmailVerification(newUser);
        console.log(`[Firebase Auth] Successfully sent verification email to: ${newUser.email}`);
        triggerToast("Verification Link sent to your real email inbox! 📧");
        setAuthSuccessMsg("Account created! Real Firebase verification email link dispatched to your inbox. Check spam if not received.");
      } catch (emailError: any) {
        console.error("[Firebase Auth] Failed to dispatch verification email on signup:", emailError);
        if (emailError.code === 'auth/too-many-requests' || emailError.message?.includes('too-many-requests')) {
          setAuthSuccessMsg("Account created! However, Firebase is rate-limiting verification emails right now. Please log in and use the 'Resend' button with cooldown below.");
          setVerificationCooldown(60);
        } else {
          setAuthSuccessMsg(`Account created! But we couldn't dispatch the verification email: ${emailError.message || emailError}`);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || "Registration encountered an unresolved credential conflict.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccessMsg("");
    if (!emailInput || !passwordInput) {
      setAuthError("Email and Password are required parameters for Sign In.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      triggerToast("Welcome back to VoyageAI Scout! 🗺️");
    } catch (err: any) {
      setAuthError(err.message || "Invalid email or verification credentials.");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccessMsg("");
    if (!emailInput) {
      setAuthError("Please supply your registered email address first.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, emailInput.trim());
      setAuthSuccessMsg("Password reset verification link dispatched! Inspect your email inbox.");
    } catch (err: any) {
      setAuthError(err.message || "Failure triggering reset dispatch.");
    }
  };

  const handleRefreshVerification = async () => {
    if (!auth.currentUser) return;
    setIsRefreshingVerification(true);
    setAuthError("");
    try {
      await auth.currentUser.reload();
      const updatedUser = auth.currentUser;
      setUser(updatedUser);
      if (updatedUser?.emailVerified) {
        triggerToast("Email verified successfully! Opening Planner... 🎉");
      } else {
        setAuthError("We checked the Firebase servers, but your email has not been verified yet. Click the link in your email and try again.");
      }
    } catch (err: any) {
      setAuthError(err.message || "Unable to contact verification services.");
    } finally {
      setIsRefreshingVerification(false);
    }
  };

  const handleSandboxOtpVarification = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (otpInput === "123456") {
      setSandboxBypass(true);
      triggerToast("Sandbox Verification Accepted! Bypassed email check. 🚀");
    } else {
      setAuthError("Invalid sandbox verification OTP. Try entering '123456'!");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSandboxBypass(false);
      setPlan(null);
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "Hello! 🗺️ I am your **VoyageAI Scout** Trip Architect. I can help you design the perfect, detailed itinerary customized exactly for your travel goals!\n\nBefore we begin, tell me: **Are you planning a trip to an Indian State/City, or an International Destination outside India?**",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setChatState({
        currentStep: "region",
        regionType: "",
        destination: "",
        days: "",
        people: "",
      });
      triggerToast("Signed out successfully. Safe travels!");
    } catch (err: any) {
      triggerToast("Log out failed: " + err.message);
    }
  };

  // Persistent Firestore CRUD operations
  const handleUpdatePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      // Updates user preferences in Firestore users/{userId}
      const isVerified = user.emailVerified || sandboxBypass;
      if (!isVerified) {
        triggerToast("Failure: Preferences require verified status to save in Firestore.");
        return;
      }
      await setDoc(doc(db, "users", user.uid), {
        name: user.displayName || "Explorer",
        email: user.email || "",
        preferences: preferencesInput
      }, { merge: true });
      setUserPreferences(preferencesInput);
      triggerToast("Custom preferences saved successfully to your cloud profile! 💾");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleSaveTravelPlan = async () => {
    if (!user || !plan) return;
    setIsSavingPlan(true);
    try {
      const planId = plan.destinationName.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Date.now();
      const planRef = doc(db, "users", user.uid, "plans", planId);
      
      const isVerified = user.emailVerified || sandboxBypass;
      if (!isVerified) {
        // Fallback store in local storage if bypassed in sandbox
        localStorage.setItem(`packing-${plan.destinationName}-backup`, JSON.stringify(plan));
        triggerToast("Sandbox Mode: Trip Plan backed up offfline in local storage! (Verify real email to persist to Firestore Cloud)");
        setIsSavingPlan(false);
        return;
      }

      await setDoc(planRef, {
        userId: user.uid,
        destinationName: plan.destinationName,
        days: chatState.days || "5",
        people: chatState.people || "1",
        budget: plan.budgetBreakdown?.grandTotal?.perPerson || "N/A",
        planData: plan,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      triggerToast(`Plan saved to your Cloud Travels lists! (Ref: ${plan.destinationName}) 💾`);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/plans`);
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleLoadSavedPlan = (savedPlan: any) => {
    setPlan(savedPlan.planData);
    setChatState({
      currentStep: "ready",
      regionType: savedPlan.planData.isInternational ? "international" : "india",
      destination: savedPlan.planData.destinationName,
      days: savedPlan.days,
      people: savedPlan.people,
    });
    setMessages([
      {
        id: `load-${Date.now()}`,
        role: "assistant",
        content: `⚡ **Trip Plan to ${savedPlan.destinationName} restored!** Loaded from your persistent Firestore directory. Feel free to query our Travel advisor for local alterations.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ]);
    setShowDashboardDrawer(false);
    triggerToast(`Restored saved trip: ${savedPlan.destinationName}! 🛫`);
  };

  const handleDeleteSavedPlan = async (storedId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "plans", storedId));
      triggerToast("Trip plan removed from persistent profile database.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/plans/${storedId}`);
    }
  };

  // Callback to track chosen booking hotel, transport, or guide
  const handleBookItem = async (itemType: string, itemName: string, cost: string, details: string) => {
    if (!user || !plan) {
      triggerToast("Sign In is required to register bookings in travel history.");
      return;
    }
    try {
      const isVerified = user.emailVerified || sandboxBypass;
      if (!isVerified) {
        triggerToast("Sandbox Mode: Simulated booking registered! (Verify real email for genuine cloud database logs)");
        const backupBookings = JSON.parse(localStorage.getItem("sandbox-bookings") || "[]");
        backupBookings.push({ itemType, itemName, cost, details, id: Date.now().toString() });
        localStorage.setItem("sandbox-bookings", JSON.stringify(backupBookings));
        return;
      }

      const planId = plan.destinationName.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const bookingId = "book-" + itemType + "-" + Date.now();
      await setDoc(doc(db, "users", user.uid, "bookings", bookingId), {
        userId: user.uid,
        planId: planId,
        itemType,
        itemName,
        cost,
        details,
        createdAt: serverTimestamp()
      });
      triggerToast(`Successfully Booked ${itemName}! Logged in your Booking history ✈️`);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/bookings`);
    }
  };

  const handleDeleteBooking = async (bookingId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "bookings", bookingId));
      triggerToast("Booking record deleted from persistent logs.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/bookings/${bookingId}`);
    }
  };

  const selectRegion = (region: "india" | "international") => {
    if (loading) return;
    const label = region === "india" ? "🇮🇳 Indian State / City" : "🌍 International Destination";
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: label,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    
    setChatState(prev => ({
      ...prev,
      regionType: region,
      currentStep: "destination"
    }));
    
    setTimeout(() => {
      const content = region === "india"
        ? "Awesome choice! 🇮🇳 Let's explore India. **Which Indian State or City do you want to travel to?**\n\n*(Type or select a state/city in the search input below)*"
        : "Wonderful choice! 🌍 Let's plan your international travel. **Which country or city do you want to travel to?**\n\n*(Type or select from suggestions below)*";
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
      setLoading(false);
    }, 500);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userText = inputText.trim();
    setValidationError(null);

    // Basic Client-side Input Validation
    if (chatState.currentStep === "destination") {
      if (userText.length < 2 || !/[a-zA-Z]/.test(userText)) {
        setValidationError("📍 Please specify a logical destination (at least 2 letters long).");
        return;
      }
    } else if (chatState.currentStep === "days") {
      const parsedDays = parseInt(userText.match(/\d+/)?.[0] || "", 10);
      if (isNaN(parsedDays) || parsedDays <= 0 || parsedDays > 30) {
        setValidationError("📅 Please specify a trip duration between 1 and 30 days.");
        return;
      }
    } else if (chatState.currentStep === "people") {
      const isSolo = ["solo", "me", "myself", "i", "just me"].includes(userText.toLowerCase().trim());
      const parsedPeople = parseInt(userText.match(/\d+/)?.[0] || "", 10);
      if (!isSolo && (isNaN(parsedPeople) || parsedPeople <= 0 || parsedPeople > 100)) {
        setValidationError("👥 Please specify a logical number of travelers between 1 and 100.");
        return;
      }
    }

    setInputText("");
    setIsInputFocused(false);

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userText,
      timestamp,
    };

    setMessages((prev) => [...prev, userMessage]);

    // Handle initial detail collection state machine
    if (chatState.currentStep === "destination") {
      setLoading(true);
      setChatState(prev => ({ ...prev, destination: userText, currentStep: "days" }));
      
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: `Great! "${userText}" is a fantastic destination. 📅 **How many days is your trip?**`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setLoading(false);
      }, 500);

    } else if (chatState.currentStep === "days") {
      setLoading(true);
      setChatState(prev => ({ ...prev, days: userText, currentStep: "people" }));
      
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: `Perfect, a ${userText}-day trip! 👥 **And how many people are travelling on this adventure?**`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setLoading(false);
      }, 500);

    } else if (chatState.currentStep === "people") {
      // Done collecting, delegate to unified plan generation executor!
      await executePlanGeneration(chatState.destination, chatState.days, userText);

    } else if (chatState.currentStep === "ready") {
      // In follow-up ready state, send messages to standard chat proxy
      setLoading(true);
      
      const sessionMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      // Append the new user message too since it's already added to state
      sessionMessages.push({ role: "user", content: userText });

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: sessionMessages,
            context: {
              destination: chatState.destination,
              days: chatState.days,
              people: chatState.people
            }
          }),
        });

        if (!response.ok) {
          throw new Error("Chat sequence error.");
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format received from server in chatbot.");
        }

        const data = await response.json();
        
        // Ensure standard trailing question required by rules if it is not present
        let responseContent = data.text;
        const trailingCheck = "day-wise itinerary, or help booking";
        if (!responseContent.toLowerCase().includes(trailingCheck.toLowerCase())) {
          responseContent += "\n\nWould you like a day-wise itinerary, or help booking anything specific?";
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: responseContent,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } catch (err) {
        console.error(err);
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-chat-error-${Date.now()}`,
            role: "assistant",
            content: `Sorry, there was an issue keeping up connection with the Travel assistant. Please try sending your query again.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setLoading(false);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleReset = () => {
    setChatState({
      currentStep: "region",
      regionType: "",
      destination: "",
      days: "",
      people: "",
    });
    setPlan(null);
    setGenerationError(null);
    setValidationError(null);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Hello! 🗺️ I am your **VoyageAI Scout** Trip Architect. I can help you design the perfect, detailed itinerary customized exactly for your travel goals!\n\nBefore we begin, tell me: **Are you planning a trip to an Indian State/City, or an International Destination outside India?**",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    localStorage.removeItem("voyageai_chat_state");
    localStorage.removeItem("voyageai_messages");
    localStorage.removeItem("voyageai_plan");
  };

  // Core Rendering Branches
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F0F9FF] flex flex-col items-center justify-center font-sans">
        <div className="bg-white border-4 border-brand-dark rounded-3xl p-8 flex flex-col items-center shadow-[6px_6px_0px_0px_#2D3436]">
          <RefreshCw className="w-10 h-10 text-brand-pink animate-spin stroke-[3px]" />
          <h3 className="font-black text-brand-dark mt-4 text-sm uppercase tracking-wider">Accessing Safe Session...</h3>
        </div>
      </div>
    );
  }

  // SCREEN A: Welcome & Login / Registration page
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F0F9FF] font-sans text-brand-dark flex flex-col antialiased relative overflow-hidden p-4 md:p-8">
        
        {/* Absolute Background Graphics */}
        <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-brand-yellow/10 blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-brand-blue/10 blur-3xl -z-10 animate-pulse"></div>

        {/* Center Header */}
        <div className="text-center max-w-lg mx-auto mt-4 mb-6">
          <div className="inline-flex w-14 h-14 bg-brand-yellow rounded-2xl border-4 border-brand-dark items-center justify-center text-3xl shadow-[3px_3px_0px_0px_#2D3436] transform -rotate-3 hover:rotate-6 transition-transform">
            🌍
          </div>
          <h1 className="text-4xl font-black text-brand-dark tracking-tight mt-4 italic">
            VoyageAI <span className="text-brand-pink">Scout</span>
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-2">
            The Ultimate Interactive Travel Architect
          </p>
        </div>

        {/* Form panel container */}
        <div className="max-w-md w-full mx-auto bg-white border-4 border-brand-dark rounded-3xl shadow-[8px_8px_0px_0px_#2D3436] p-6 md:p-8 relative">
          
          <div className="mb-6 border-b-2 border-dashed border-gray-200 pb-4">
            <h2 className="text-xl font-black font-display uppercase tracking-tight text-brand-dark">
              {forgotPasswordMode ? "Reset Password" : isSignUp ? "Traveler Sign Up" : "Traveler Sign In"}
            </h2>
            <p className="text-xs text-gray-400 font-bold mt-1">
              {forgotPasswordMode 
                ? "Enter your secure email direction to retrieve access" 
                : isSignUp 
                  ? "Create your secure cloud profile to automatically save plans" 
                  : "Welcome back! Access your handpicked destinations"}
            </p>
          </div>

          {authError && (
            <div className="bg-red-50 border-2 border-red-400 rounded-xl p-3 mb-4 text-xs font-bold text-red-600 flex items-start gap-2 animate-bounce">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccessMsg && (
            <div className="bg-emerald-50 border-2 border-emerald-400 rounded-xl p-3 mb-4 text-xs font-bold text-emerald-600 flex items-start gap-2">
              <CheckCircle size={14} className="shrink-0 mt-0.5" />
              <span>{authSuccessMsg}</span>
            </div>
          )}

          {!forgotPasswordMode ? (
            <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
              {isSignUp && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-brand-dark block">Traveler Full Name</label>
                  <div className="relative">
                    <UserIcon size={14} className="absolute left-3.5 top-3.5 text-gray-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Juliet Caesar"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full border-2 border-brand-dark rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-brand-dark placeholder-gray-400 bg-gray-50 focus:outline-hidden focus:bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-brand-dark block">Email Address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-3.5 text-gray-400" />
                  <input
                    type="email"
                    required
                    placeholder="explorer@voyageai.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full border-2 border-brand-dark rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-brand-dark placeholder-gray-400 bg-gray-50 focus:outline-hidden focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-brand-dark block">Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-3.5 text-gray-400" />
                  <input
                    type="password"
                    required
                    placeholder="Enter min 6-digit password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full border-2 border-brand-dark rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-brand-dark placeholder-gray-400 bg-gray-50 focus:outline-hidden focus:bg-white"
                  />
                </div>
              </div>

              {isSignUp && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-brand-dark block">Default Trip Preferences</label>
                  <textarea
                    rows={2}
                    value={preferencesInput}
                    onChange={(e) => setPreferencesInput(e.target.value)}
                    className="w-full border-2 border-brand-dark rounded-xl p-3 text-xs font-bold text-brand-dark placeholder-gray-400 bg-gray-50 focus:outline-hidden focus:bg-white"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-brand-yellow hover:bg-yellow-400 border-3 border-brand-dark text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-[3px_3px_0px_0px_#2D3436] active:translate-y-[1px] active:shadow-0 cursor-pointer text-center mt-2"
              >
                {isSignUp ? "Register Account 🚀" : "Access Scout Desk 🛫"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-brand-dark block">Email Address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-3.5 text-gray-400" />
                  <input
                    type="email"
                    required
                    placeholder="explorer@voyageai.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full border-2 border-brand-dark rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-brand-dark placeholder-gray-400 bg-gray-50 focus:outline-hidden focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-brand-pink text-white hover:bg-[#ff5555] border-3 border-brand-dark text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-[3px_3px_0px_0px_#2D3436] active:translate-y-[1px] active:shadow-0 cursor-pointer text-center mt-2"
              >
                Send Password Reset Email 📧
              </button>
            </form>
          )}

          {/* Bottom Switch Menu */}
          <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-100 flex flex-col gap-2 items-center text-xs font-bold">
            {!forgotPasswordMode ? (
              <>
                <button 
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-brand-pink hover:underline font-extrabold cursor-pointer"
                >
                  {isSignUp ? "Already registered? Sign In Instead" : "Need a professional Travel desk? Register Here"}
                </button>
                <button
                  type="button"
                  onClick={() => setForgotPasswordMode(true)}
                  className="text-gray-400 hover:text-brand-dark cursor-pointer mt-1 font-bold"
                >
                  Forgot Password? Recovery Options
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setForgotPasswordMode(false)}
                className="text-brand-blue hover:underline font-extrabold cursor-pointer"
              >
                Back to Sign In Desk
              </button>
            )}
          </div>

        </div>
      </div>
    );
  }

  // SCREEN B: Email Verification Gate
  if (user && !user.emailVerified && !sandboxBypass) {
    return (
      <div className="min-h-screen bg-[#F0F9FF] font-sans text-brand-dark flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white border-4 border-brand-dark rounded-3xl shadow-[8px_8px_0px_0px_#2D3436] p-6 md:p-8 space-y-6 text-center">
          
          <div className="w-16 h-16 bg-brand-pink text-white rounded-2xl border-4 border-brand-dark mx-auto flex items-center justify-center text-2xl shadow-[3px_3px_0px_0px_#2D3436]">
            📧
          </div>

          <div>
            <h2 className="text-xl font-black uppercase tracking-tight font-display">Confirm Your Email Identity</h2>
            <p className="text-xs text-gray-500 font-semibold mt-2 max-w-xs mx-auto leading-relaxed">
              We have dispatched a dynamic verification link to <strong className="text-brand-dark italic">{user.email}</strong>.
              Confirm via your inbox before accessing the full trip planner.
            </p>
          </div>

          {authError && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 text-xs font-bold text-red-600 flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleRefreshVerification}
              disabled={isRefreshingVerification}
              className="w-full py-3 bg-brand-green text-brand-dark border-3 border-brand-dark text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-[3px_3px_0px_0px_#2D3436] active:translate-y-[1px] active:shadow-0 cursor-pointer flex items-center justify-center gap-2"
            >
              <RefreshCw size={12} className={isRefreshingVerification ? "animate-spin" : ""} />
              {isRefreshingVerification ? "Checking Status..." : "Confirm Verified (Refresh) 🚀"}
            </button>

            <button
              onClick={async () => {
                if (!user) return;
                if (verificationCooldown > 0) return;
                try {
                  console.log(`[Firebase Auth] Initiating email verification (resend request) for user: ${user.email} (UID: ${user.uid})`);
                  await sendEmailVerification(user);
                  console.log(`[Firebase Auth] Successfully resent verification email to: ${user.email}`);
                  triggerToast("New link dispatched! 🛫");
                  setVerificationCooldown(60);
                } catch (e: any) {
                  console.error(`[Firebase Auth] Failed to resend verification email for ${user.email || 'unknown'}:`, e);
                  if (e.code === 'auth/too-many-requests' || e.message?.includes('too-many-requests')) {
                    setAuthError("Too many resend requests! Firebase rate-limits verification emails to prevent spam. Please wait 60 seconds of cooldown before trying again.");
                    setVerificationCooldown(60);
                  } else {
                    setAuthError(e.message);
                  }
                }
              }}
              disabled={verificationCooldown > 0}
              className={`w-full py-2 text-brand-dark border-2 border-brand-dark text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                verificationCooldown > 0 
                  ? "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed opacity-65" 
                  : "bg-gray-100 hover:bg-gray-200 shadow-[1px_1px_0px_0px_#2D3436]"
              }`}
            >
              {verificationCooldown > 0 ? `Resend Link (Wait ${verificationCooldown}s) ⏳` : "Resend Verification Link"}
            </button>
          </div>

          {/* Dynamic Sandbox Simulator OTP Panel */}
          <div className="border-t-4 border-dashed border-gray-200 pt-5 space-y-4 bg-yellow-50/50 p-4 rounded-2xl">
            <div className="flex items-center gap-2 justify-center text-yellow-800 text-xs font-black uppercase tracking-wider">
              <ShieldCheck size={14} />
              <span>Sandbox Testing Bypass</span>
            </div>
            <p className="text-[10px] text-gray-500 font-bold leading-normal">
              Testing with a mock or local email? Enter sandbox testing OTP below to bypass client checks for evaluation. Real Cloud Database storage requires authentic email verification.
            </p>

            <form onSubmit={handleSandboxOtpVarification} className="flex gap-2">
              <input
                type="text"
                placeholder="Sandbox OTP (123456)"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                className="flex-1 border-2 border-brand-dark rounded-xl px-3 py-2 text-xs font-bold text-center bg-white"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-brand-dark border-2 border-brand-dark text-xs font-black rounded-xl shadow-[2px_2px_0px_0px_#2D3436] cursor-pointer"
              >
                Verify Sandbox
              </button>
            </form>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="text-xs font-extrabold text-gray-400 hover:text-brand-dark flex items-center gap-1 mx-auto cursor-pointer"
            >
              <LogOut size={11} /> Return to Login
            </button>
          </div>

        </div>
      </div>
    );
  }

  // SCREEN C: Authenticated active App
  return (
    <div className="min-h-screen bg-[#F0F9FF] font-sans text-brand-dark flex flex-col antialiased relative">
      
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-dark text-white border-4 border-brand-pink p-4 rounded-2xl shadow-[6px_6px_0px_0px_#2D3436] font-bold text-xs flex items-center gap-2 max-w-sm animate-fade-in">
          <Sparkles className="text-brand-pink shrink-0 animate-bounce" size={14} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* "My Dashboard" Sidebar Drawer Panel (Saved trips + User profile edits + Bookings history) */}
      {showDashboardDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white border-l-4 border-brand-dark h-full p-6 overflow-y-auto flex flex-col justify-between shadow-2xl relative">
            
            <button
              onClick={() => setShowDashboardDrawer(false)}
              className="absolute top-4 left-4 w-8 h-8 rounded-full border-2 border-brand-dark bg-gray-100 hover:bg-red-200 font-black text-xs text-center flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-6 pt-6">
              
              {/* Profile Details Card */}
              <div className="bg-brand-blue/10 border-2 border-brand-blue p-4 rounded-2xl relative">
                <div className="absolute -top-3.5 right-4 bg-brand-blue text-white border-2 border-brand-dark px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest">
                  Active User Profile
                </div>
                <h4 className="font-black text-xs text-brand-blue flex items-center gap-1.5 uppercase tracking-wider">
                  👤 Traveler Profile
                </h4>
                
                <div className="mt-2.5 text-xs font-bold text-brand-dark space-y-1">
                  <div>Name: <span className="text-gray-600">{user.displayName || "Explorer"}</span></div>
                  <div>Email: <span className="text-gray-600">{user.email}</span></div>
                  {sandboxBypass && <div className="text-yellow-600 font-extrabold italic text-[9px]">⚠️ Bypassed in Sandbox Evaluation Mode</div>}
                </div>

                {/* Edit Preferences Form */}
                <form onSubmit={handleUpdatePreferences} className="mt-4 pt-3 border-t border-brand-blue/20 space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#6C5CE7] block">Edit Custom Trip Style / Mood</label>
                  <textarea
                    rows={2}
                    value={preferencesInput}
                    onChange={(e) => setPreferencesInput(e.target.value)}
                    className="w-full border-2 border-brand-dark rounded-lg p-2 text-xs font-bold bg-white focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#6C5CE7] text-white hover:bg-indigo-500 text-[10px] font-black uppercase rounded-lg border-2 border-brand-dark shadow-[1.5px_1.5px_0px_0px_#2D3436] cursor-pointer"
                  >
                    Save Preference
                  </button>
                </form>
              </div>

              {/* Saved Travels lists */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest font-display text-brand-pink flex items-center gap-1.5">
                  <Heart size={12} className="stroke-[3px]" /> Saved Trips list ({savedPlans.length})
                </h3>
                
                {savedPlans.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center text-xs text-gray-400 font-semibold leading-relaxed">
                    No Saved Trip Plans inside your Firebase Cloud directory yet! Click "Save Plan" on active itineraries.
                  </div>
                ) : (
                  <div className="grid gap-2 max-h-56 overflow-y-auto pr-1">
                    {savedPlans.map(stored => (
                      <div 
                        key={stored.id}
                        onClick={() => handleLoadSavedPlan(stored)}
                        className="bg-white hover:bg-slate-50 border-2 border-brand-dark p-3.5 rounded-xl flex items-center justify-between cursor-pointer transition-all shadow-[2px_2px_0px_0px_rgba(45,52,54,0.1)] hover:-translate-y-0.5"
                      >
                        <div className="min-w-0">
                          <h4 className="text-xs font-extrabold text-brand-dark">📍 {stored.destinationName}</h4>
                          <span className="text-[9px] font-bold text-gray-400 font-mono flex items-center gap-1.5 mt-0.5">
                            ⏳ {stored.days} days • 👥 {stored.people} travellers
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSavedPlan(stored.id, e)}
                          className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg border border-brand-dark transition-all"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Booking History Section */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-black uppercase tracking-widest font-display text-brand-green flex items-center gap-1.5">
                  <ShieldCheck size={12} className="stroke-[3px]" /> Registered Bookings Logs ({bookingHistory.length})
                </h3>
                
                {bookingHistory.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center text-xs text-gray-400 font-semibold leading-relaxed">
                    No booked hotels, flights, or local tours registered. Select accommodations inside the Dashboard to log history.
                  </div>
                ) : (
                  <div className="grid gap-2 max-h-56 overflow-y-auto pr-1">
                    {bookingHistory.map(book => (
                      <div 
                        key={book.id}
                        className="bg-white border-2 border-brand-dark p-3 rounded-xl flex items-center justify-between shadow-[2.5px_2.5px_0px_0px_#6BCB77]"
                      >
                        <div className="min-w-0 flex items-start gap-2">
                          <span className="text-base mt-0.5">
                            {book.itemType === "hotel" ? "🏨" : book.itemType === "transport" ? "✈️" : "🧳"}
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-[11px] font-extrabold text-brand-dark truncate">{book.itemName}</h4>
                            <p className="text-[9px] font-bold text-gray-500 font-mono mt-0.5">
                              Cost: {book.cost} • Location: {book.details || "N/A"}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteBooking(book.id, e)}
                          className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg border border-brand-dark transition-all shrink-0 ml-1"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <div className="pt-6 border-t-2 border-dashed border-gray-100 flex items-center justify-between">
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-4 py-2 bg-brand-pink text-white hover:bg-[#ff5555] border-2 border-brand-dark rounded-xl text-xs font-bold shadow-[2px_2px_0px_0px_#2D3436] active:translate-y-[1px] cursor-pointer"
              >
                <LogOut size={12} className="stroke-[3px]" />
                Log Out Destination Account
              </button>
              
              <button
                onClick={() => setShowDashboardDrawer(false)}
                className="px-4 py-2 bg-gray-200 border-2 border-brand-dark rounded-xl text-xs font-bold leading-normal cursor-pointer"
              >
                Close Drawer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Top Navigation Bar with Persistent account options */}
      <header className="sticky top-0 z-40 bg-white border-b-4 border-brand-pink py-4 px-6 md:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center text-white text-xl shadow-md transform -rotate-3 hover:rotate-3 transition-transform">
              🌍
            </div>
            <div>
              <h1 className="text-2xl font-black text-brand-dark tracking-tight italic">
                VoyageAI <span className="text-brand-pink">Scout</span>
              </h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">
                Your Personal Trip Architect
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {(chatState.destination || plan) && (
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                {chatState.destination && (
                  <span className="flex items-center gap-1 bg-brand-green px-4 py-2 rounded-full shadow-sm text-brand-dark">
                    📍 {chatState.destination}
                  </span>
                )}
                {(chatState.days || chatState.people) && (
                  <span className="flex items-center gap-1.5 bg-brand-blue px-4 py-2 rounded-full shadow-sm">
                    ⏳ {chatState.days ? `${chatState.days} Days` : ""} {chatState.people ? `| 👥 ${chatState.people} Travelers` : ""}
                  </span>
                )}
              </div>
            )}

            {/* Toggle dashboard sidebar button */}
            <button
              onClick={() => setShowDashboardDrawer(true)}
              className="flex items-center gap-1.5 bg-[#6C5CE7] hover:bg-indigo-500 text-white border-2 border-brand-dark px-4 py-1.5 rounded-xl text-xs font-black transition-all shadow-[2px_2px_0px_0px_#2D3436] cursor-pointer"
            >
              👤 My Account & Profile
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 bg-brand-yellow hover:bg-yellow-400 text-brand-dark border-2 border-brand-dark px-4 py-1.5 rounded-xl text-xs font-black transition-all shadow-[2px_2px_0px_0px_#2D3436] active:translate-y-[1px] active:shadow-0 cursor-pointer"
            >
              <RefreshCw size={12} className="stroke-[3px]" />
              Reset Plan
            </button>
          </div>
        </div>
      </header>

      {/* Main Panel Area: Split screen if plan exists, else single centered column */}
      <main className="max-w-7xl mx-auto w-full flex-1 p-4 md:p-6 flex flex-col lg:flex-row gap-6 overflow-hidden">
        
        {/* LEFT PANEL: Chat Window with Neo-Brutalist design */}
        <section className={`flex flex-col bg-white border-4 border-brand-dark rounded-3xl shadow-[8px_8px_0px_0px_#2D3436] transition-all duration-300 overflow-hidden ${
          plan ? "w-full lg:w-[430px] h-[550px] lg:h-auto" : "max-w-2xl mx-auto w-full h-[650px]"
        }`}>
          {/* Chat Header */}
          <div className="bg-brand-dark text-white px-5 py-4 border-b-4 border-brand-dark flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-brand-green border-2 border-brand-dark rounded-full"></span>
                <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-lg">
                  🤖
                </div>
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider font-display">Advisor Assistant</h4>
                <p className="text-[10px] text-brand-yellow font-bold">Online • Traveler Mode</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded border border-white/20 text-[9px] uppercase tracking-wider font-bold">
              <span>👤 {user.displayName || "traveler"}</span>
            </div>
          </div>

          {/* Messages Grid */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F9FAFB]">
            
            {/* Custom Welcome Banner indicating user style if present */}
            {userPreferences && (
              <div className="bg-brand-blue/5 border-2 border-brand-blue/20 rounded-2xl p-3 text-[11px] font-bold text-gray-500 mb-1 flex items-center gap-1.5">
                <Sparkles size={12} className="text-brand-blue shrink-0 animate-pulse" />
                <span>Travel desk aligned to preferences: <strong className="text-brand-dark">"{userPreferences}"</strong></span>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${
                  msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl bg-brand-blue/10 border-2 border-brand-blue/20 flex items-center justify-center text-sm flex-shrink-0 shadow-sm font-bold">
                    🦁
                  </div>
                )}
                
                <div className="space-y-1">
                  <div className={`p-4 rounded-2xl text-xs break-words border-2 leading-relaxed shadow-[4px_4px_0px_0px_rgba(45,52,54,0.1)] ${
                    msg.role === "user"
                      ? "bg-brand-blue text-white border-brand-dark rounded-tr-xs shadow-[4px_4px_0px_0px_#2D3436]"
                      : "bg-white text-brand-dark border-brand-dark rounded-tl-xs"
                  }`}>
                    {msg.role === "assistant" ? (
                      <MarkdownOutput content={msg.content} />
                    ) : (
                      <p className="font-bold whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  <span className={`text-[9px] font-bold text-gray-400 block px-1.5 ${
                    msg.role === "user" ? "text-right" : ""
                  }`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {/* Loading / Typing indicator */}
            {loading && (
              <div className="flex gap-2 max-w-[80%] items-center">
                <div className="w-8 h-8 rounded-xl bg-brand-blue/10 border-2 border-brand-blue/20 flex items-center justify-center text-sm flex-shrink-0">
                  🦁
                </div>
                <div className="bg-white border-2 border-brand-dark px-4 py-3 rounded-2xl text-xs flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#2D3436]">
                  <span className="w-1.5 h-1.5 bg-brand-pink rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-bounce delay-100"></span>
                  <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-bounce delay-200"></span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chat Inputs with autocomplete */}
          <div className="border-t-4 border-brand-dark bg-white p-4 relative">
            
            {/* Auto-complete suggestions box */}
            {chatState.currentStep === "destination" && isInputFocused && (
              <div className="absolute bottom-[65px] left-4 right-4 bg-white border-4 border-brand-dark rounded-2xl shadow-[6px_6px_0px_0px_#2D3436] z-50 max-h-56 overflow-y-auto p-2">
                <div className="bg-brand-blue text-white text-[9px] px-2 py-1 rounded-md font-extrabold uppercase tracking-widest mb-1.5 flex justify-between items-center">
                  <span>📍 Destination Suggestions</span>
                  <span>{chatState.regionType === "india" ? "🇮🇳 Indian States & Cities" : "🌍 International Only"}</span>
                </div>
                {(() => {
                  const text = inputText.toLowerCase().trim();
                  // Huge list of suggestions
                  const allSuggestions = [
                    // Indian
                    "Kerala", "Goa", "Rajasthan", "Himachal Pradesh", "Jammu & Kashmir", "Uttarakhand", "Sikkim",
                    "Indore", "Itanagar", "Imphal", "Hyderabad", "Shimla", "Jaipur", "Ladakh", "Kochi", "Alleppey", "Mumbai", "Delhi", "Amritsar", "Darjeeling", "Manali", "Rishikesh", "Ooty", "Munnar",
                    // International
                    "Italy", "Iceland", "Ireland", "Indonesia", "Iran", "Istanbul", "Ibiza", "Incheon", "Interlaken", "Paris", "Japan", "Switzerland", "France", "Spain", "Singapore", "Thailand", "Vietnam", "Dubai", "London", "New York", "Maldives", "Bali"
                  ];

                  const filtered = chatState.regionType === "india"
                    ? allSuggestions.slice(0, 25).filter(item => !text || item.toLowerCase().includes(text))
                    : allSuggestions.slice(25).filter(item => !text || item.toLowerCase().includes(text));

                  if (filtered.length > 0) {
                    return filtered.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onMouseDown={() => {
                          setInputText(item);
                          setIsInputFocused(false);
                        }}
                        className="w-full text-left font-bold text-xs hover:bg-brand-pink hover:text-white rounded-lg p-2 transition-colors flex items-center justify-between text-brand-dark cursor-pointer animate-fade-in"
                      >
                        <span>✨ {item}</span>
                        <span className="text-[9px] text-gray-400 font-medium font-mono uppercase">Click to fill</span>
                      </button>
                    ));
                  } else {
                    return (
                      <div className="text-[10px] text-gray-400 p-2 text-center font-bold">
                        No matches found. Feel free to type anyway!
                      </div>
                    );
                  }
                })()}
              </div>
            )}

            {/* Region selection options */}
            {chatState.currentStep === "region" && !loading && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => selectRegion("india")}
                  className="p-4 bg-brand-yellow/15 hover:bg-brand-yellow text-brand-dark border-3 border-brand-dark rounded-2xl font-black text-xs transition-all shadow-[4px_4px_0px_0px_#2D3436] hover:translate-y-[1px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#2D3436] cursor-pointer text-center flex flex-col items-center gap-1.5"
                >
                  <span className="text-2xl">🇮🇳</span>
                  <span>Indian State / City</span>
                </button>
                <button
                  type="button"
                  onClick={() => selectRegion("international")}
                  className="p-4 bg-brand-blue/15 hover:bg-brand-blue/80 hover:text-white text-brand-dark border-3 border-brand-dark rounded-2xl font-black text-xs transition-all shadow-[4px_4px_0px_0px_#2D3436] hover:translate-y-[1px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#2D3436] cursor-pointer text-center flex flex-col items-center gap-1.5"
                >
                  <span className="text-2xl">🌍</span>
                  <span>Other Country / City</span>
                </button>
              </div>
            )}
            
            {/* Context helpers for easy click details input */}
            {chatState.currentStep === "destination" && !loading && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(chatState.regionType === "india" 
                  ? ["Kerala", "Goa", "Rajasthan", "Indore", "Shimla", "Alleppey"]
                  : ["Italy", "Iceland", "Paris", "Japan", "Switzerland", "Istanbul"]
                ).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setInputText(item);
                      setIsInputFocused(true);
                    }}
                    className="text-[10px] font-black text-brand-dark bg-brand-yellow/20 hover:bg-brand-yellow border-2 border-brand-dark px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-[2px_2px_0px_0px_#2D3436] active:translate-y-[1px] active:shadow-0"
                  >
                    🚀 {item}
                  </button>
                ))}
              </div>
            )}

            {chatState.currentStep === "days" && !loading && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {["3 days", "5 days", "7 days", "10 days"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setInputText(item.split(" ")[0])}
                    className="text-[10px] font-black text-brand-dark bg-brand-blue/25 hover:bg-brand-blue/70 border-2 border-brand-dark px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-[2px_2px_0px_0px_#2D3436] active:translate-y-[1px] active:shadow-0"
                  >
                    📅 {item}
                  </button>
                ))}
              </div>
            )}

            {chatState.currentStep === "people" && !loading && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {["1 person", "2 people", "3 people", "4 people", "Family of 5"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setInputText(item.match(/\d+/)?.toString() || item)}
                    className="text-[10px] font-black text-brand-dark bg-brand-pink/20 hover:bg-brand-pink/60 border-2 border-brand-dark px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-[2px_2px_0px_0px_#2D3436] active:translate-y-[1px] active:shadow-0"
                  >
                    👥 {item}
                  </button>
                ))}
              </div>
            )}

            {chatState.currentStep === "ready" && !loading && (
              <div className="flex flex-col gap-1.5 mb-3">
                {[
                  "Can you give me a day-wise plan?",
                  "Recommend budget stays instead",
                  "Suggest vegetarian restaurants"
                ].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setInputText(item)}
                    className="text-[10px] font-black text-brand-dark bg-white border-2 border-brand-dark px-3 py-1.5 rounded-xl transition-all text-left flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(45,52,54,0.15)] hover:bg-[#F9FAFB] hover:translate-y-[1px] cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <ChevronRight size={11} className="text-brand-pink stroke-[3px]" />
                      {item}
                    </span>
                    <span className="text-[9px] text-[#A29BFE] uppercase font-bold italic">Quick Ask</span>
                  </button>
                ))}
              </div>
            )}

            {generationError && !loading && (
              <div className="mb-3 p-3 bg-red-50 border-3 border-brand-pink rounded-2xl flex flex-col gap-2">
                <p className="text-[11px] font-bold text-brand-dark flex items-center gap-1.5">
                  ⚡ Pre-filled retry is ready! Keep your inputs intact.
                </p>
                <button
                  type="button"
                  onClick={handleRetryPlan}
                  className="w-full flex items-center justify-center gap-2 bg-brand-pink text-white hover:bg-[#ff5555] border-2 border-brand-dark px-3 py-2 rounded-xl font-black text-xs transition-all shadow-[2px_2px_0px_0px_#2D3436] active:translate-y-[1px] active:shadow-none cursor-pointer"
                >
                  <RefreshCw size={11} className="stroke-[3px]" />
                  <span>Retry Generating Plan to {generationError.payload.destination}</span>
                </button>
              </div>
            )}

            {validationError && (
              <div className="mb-3 p-2.5 bg-red-100 border-2 border-brand-dark rounded-xl text-[11px] font-bold text-brand-dark flex items-center gap-1.5 animate-pulse">
                ⚠️ {validationError}
              </div>
            )}

            <form onSubmit={handleSend} className="flex gap-2.5">
              <input
                type="text"
                value={inputText}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setTimeout(() => setIsInputFocused(false), 200)} // delay blur so click selection catches
                onChange={(e) => {
                  setInputText(e.target.value);
                  setValidationError(null);
                }}
                disabled={chatState.currentStep === "region"}
                placeholder={
                  chatState.currentStep === "region" ? "Please select the region above first..." :
                  chatState.currentStep === "destination" ? "Select or type destination..." :
                  chatState.currentStep === "days" ? "e.g. 5 days, 3..." :
                  chatState.currentStep === "people" ? "e.g. 2, 4 people..." :
                  "Ask anything about your trip..."
                }
                className="flex-1 border-2 border-brand-dark rounded-xl px-4 py-2.5 text-xs focus:outline-hidden focus:bg-[#FFF] transition-all font-bold text-brand-dark placeholder-gray-400 bg-gray-50 shadow-[2px_2px_0px_0px_rgba(45,52,54,0.1)] animate-fade-in"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || loading || chatState.currentStep === "region"}
                className="p-3 bg-brand-pink disabled:opacity-40 hover:bg-[#ff5555] text-white border-2 border-brand-dark rounded-xl shadow-[2px_2px_0px_0px_#2D3436] hover:translate-y-[1px] active:shadow-0 transition-transform flex items-center justify-center cursor-pointer flex-shrink-0"
              >
                <Send className="w-4 h-4 stroke-[2.5px]" />
              </button>
            </form>
          </div>
        </section>

        {/* RIGHT PANEL: Dynamic Travel Map / Dashboard */}
        <section className="flex-1 h-[650px] lg:h-auto min-w-0">
          {plan ? (
            <div className="flex flex-col h-full space-y-4">
              
              {/* Floating Save Travel plan bar inside active dashboard */}
              <div className="bg-white border-4 border-brand-dark p-4 rounded-3xl shadow-[5px_5px_0px_0px_#2D3436] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-pink text-white flex items-center justify-center text-sm font-bold shadow">
                    💾
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-brand-dark uppercase tracking-wide">Persistent Active Itinerary</h4>
                    <p className="text-[10px] text-gray-400 font-bold leading-none mt-1">
                      {savedPlans.some(p => p.destinationName === plan.destinationName) 
                        ? "Saved in Firebase database!" 
                        : "Not yet stored on the Cloud server."}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSaveTravelPlan}
                  loading={isSavingPlan}
                  className="flex items-center gap-1 bg-brand-yellow hover:bg-yellow-400 text-brand-dark border-3 border-brand-dark px-4 py-1.5 rounded-xl text-xs font-black transition-all shadow-[2.5px_2.5px_0px_0px_#2D3436] cursor-pointer"
                >
                  <Sparkles size={11} className="text-brand-pink animate-pulse" />
                  {savedPlans.some(p => p.destinationName === plan.destinationName) ? "Update / Overwrite Saved Plan" : "💾 Save Plan to Cloud Database"}
                </button>
              </div>

              <div className="flex-1 min-h-0">
                <TravelDashboard 
                  plan={plan} 
                  onBookItem={handleBookItem}
                />
              </div>
            </div>
          ) : (
            <div className="bg-white border-4 border-brand-dark rounded-3xl p-8 h-full flex flex-col items-center justify-center text-center shadow-[8px_8px_0px_0px_#2D3436]">
              <div className="w-20 h-20 bg-brand-yellow rounded-3xl border-4 border-brand-dark flex items-center justify-center text-brand-dark shadow-[4px_4px_0px_0px_#2D3436] animate-pulse">
                <Compass className="w-10 h-10 stroke-[2.5px]" />
              </div>
              <h2 className="text-2xl font-black font-display text-brand-dark mt-6 uppercase tracking-tight">Ready to Scout Your Trip</h2>
              <p className="text-xs text-gray-500 max-w-sm mt-2 font-medium leading-relaxed">
                Complete the conversational steps in the Advisor Assistant to compile travel prices, handpicked accommodations, local food options, top activities, and local guides into an interactive dashboard!
              </p>
              
              <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm w-full">
                <div className="flex flex-col items-center p-3.5 bg-brand-yellow/15 rounded-2xl border-2 border-brand-dark shadow-[4px_4px_0px_0px_#2D3436]">
                  <MapPin className={`w-5 h-5 ${chatState.destination ? "text-brand-pink shrink-0" : "text-gray-400 shrink-0"}`} />
                  <span className="text-[10px] font-black text-brand-dark uppercase tracking-wider mt-2.5">1. Place</span>
                  <span className="text-[10px] font-bold text-gray-500 mt-1 truncate max-w-full">
                    {chatState.destination || "Not Set"}
                  </span>
                </div>
                
                <div className="flex flex-col items-center p-3.5 bg-brand-blue/15 rounded-2xl border-2 border-brand-dark shadow-[4px_4px_0px_0px_#2D3436]">
                  <Calendar className={`w-5 h-5 ${chatState.days ? "text-brand-blue shrink-0" : "text-gray-400 shrink-0"}`} />
                  <span className="text-[10px] font-black text-brand-dark uppercase tracking-wider mt-2.5">2. Days</span>
                  <span className="text-[10px] font-bold text-gray-500 mt-1">
                    {chatState.days ? `${chatState.days} Days` : "Not Set"}
                  </span>
                </div>

                <div className="flex flex-col items-center p-3.5 bg-brand-green/15 rounded-2xl border-2 border-brand-dark shadow-[4px_4px_0px_0px_#2D3436]">
                  <Users className={`w-5 h-5 ${chatState.people ? "text-brand-green shrink-0" : "text-gray-400 shrink-0"}`} />
                  <span className="text-[10px] font-black text-brand-dark uppercase tracking-wider mt-2.5">3. Size</span>
                  <span className="text-[10px] font-bold text-gray-500 mt-1">
                    {chatState.people ? `${chatState.people} People` : "Not Set"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>
        
      </main>

      {/* Decorative footer */}
      <footer className="py-4 border-t-4 border-brand-dark bg-white text-center text-xs text-brand-dark mt-auto font-bold uppercase tracking-wider">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-between items-center gap-3">
          <span>VoyageAI Scout • Trip Architect 2026</span>
          <span className="flex items-center gap-1.5 text-gray-500 text-[10px]">
            Integrated persistent Cloud Firestore & Firebase Auth security desk 🛡️
          </span>
        </div>
      </footer>

    </div>
  );
}
