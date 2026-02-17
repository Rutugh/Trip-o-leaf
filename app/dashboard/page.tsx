"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { createTrip, deleteTrip, shareTrip, unshareTrip } from "@/lib/tripService";
import { useTripStore } from "@/store/tripStore";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Plane, MapPin, Globe, Palmtree, Compass, Calendar, DollarSign, Trash2, Plus, X, Sparkles, Users, Share2, UserPlus, UserMinus, Bell, Copy, Check } from "lucide-react";

export default function Dashboard() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState("");
  const [shareSuccess, setShareSuccess] = useState("");
  const [copied, setCopied] = useState(false);

  const { trips, fetchTrips } = useTripStore();

  const [form, setForm] = useState({
    title: "",
    destination: "",
    startDate: "",
    endDate: "",
    budget: 0,
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        router.push("/login");
      } else {
        setUser(u);
        await fetchTrips(u);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white text-xl">Loading your adventures...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      await createTrip(user, form);
      await fetchTrips(user);
      setShowForm(false);

      setForm({
        title: "",
        destination: "",
        startDate: "",
        endDate: "",
        budget: 0,
      });
    } catch (error) {
      console.error("Error creating trip:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteTrip(id);
    await fetchTrips(user);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const handleShareClick = (trip: any) => {
    setSelectedTrip(trip);
    setShowShareModal(true);
    setShareEmail("");
    setShareError("");
    setShareSuccess("");
    setCopied(false);
  };

  const handleShare = async (e: any) => {
    e.preventDefault();
    if (!selectedTrip || !shareEmail) return;

    try {
      setShareLoading(true);
      setShareError("");
      setShareSuccess("");
      
      await shareTrip(selectedTrip.id, shareEmail.trim(), user);
      await fetchTrips(user);
      
      setShareSuccess(`✅ Trip shared with ${shareEmail}! They'll see it when they log in.`);
      setShareEmail("");
      
      // Update selected trip to show new share
      const updatedTrip = trips.find(t => t.id === selectedTrip.id);
      if (updatedTrip) {
        setSelectedTrip(updatedTrip);
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => setShareSuccess(""), 5000);
    } catch (error: any) {
      setShareError(error.message || "Failed to share trip");
    } finally {
      setShareLoading(false);
    }
  };

  const handleUnshare = async (tripId: string, email: string) => {
    try {
      await unshareTrip(tripId, email);
      await fetchTrips(user);
      
      // Update selected trip if it's open in modal
      if (selectedTrip?.id === tripId) {
        const updatedTrip = trips.find(t => t.id === tripId);
        if (updatedTrip) {
          setSelectedTrip(updatedTrip);
        }
      }
    } catch (error) {
      console.error("Error unsharing trip:", error);
    }
  };

  const handleCopyEmail = () => {
    if (user?.email) {
      navigator.clipboard.writeText(user.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getSharedTripsCount = () => {
    return trips.filter(trip => 
      (trip.sharedWith && trip.sharedWith.length > 0) || 
      (trip.ownerId !== user?.uid)
    ).length;
  };

  const getSharedWithMeCount = () => {
    return trips.filter(trip => trip.ownerId !== user?.uid).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 relative overflow-hidden">
      {/* Animated Background Icons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        <Plane className="absolute top-[10%] left-[5%] w-12 h-12 text-white animate-[float_6s_ease-in-out_infinite]" style={{ animationDelay: '0s' }} />
        <MapPin className="absolute top-[20%] right-[10%] w-10 h-10 text-white animate-[float_8s_ease-in-out_infinite]" style={{ animationDelay: '1s' }} />
        <Globe className="absolute bottom-[25%] left-[8%] w-14 h-14 text-white animate-[float_7s_ease-in-out_infinite]" style={{ animationDelay: '2s' }} />
        <Palmtree className="absolute bottom-[15%] right-[15%] w-11 h-11 text-white animate-[float_9s_ease-in-out_infinite]" style={{ animationDelay: '3s' }} />
        <Compass className="absolute top-[50%] right-[5%] w-13 h-13 text-white animate-[float_10s_ease-in-out_infinite]" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="relative z-10 p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4 animate-[fadeInDown_0.6s_ease-out]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Palmtree className="w-12 h-12 text-emerald-400 drop-shadow-lg transform -rotate-12" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
              Trip-o-leaf ✈️
            </h1>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="group relative overflow-hidden bg-white/95 backdrop-blur-xl text-purple-600 px-6 py-3 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-white/40"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
              <div className="relative flex items-center gap-2">
                <Plus className="w-5 h-5" />
                <span className="font-semibold">Create Trip</span>
              </div>
            </button>
            
            <button
              onClick={handleLogout}
              className="bg-red-500/90 backdrop-blur-xl hover:bg-red-600 text-white px-5 py-3 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 border border-red-400/40"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Notification for shared trips */}
        {getSharedWithMeCount() > 0 && (
          <div className="mb-6 bg-blue-500/90 backdrop-blur-xl text-white p-4 rounded-2xl shadow-xl animate-[fadeInDown_0.6s_ease-out_0.2s_both] border border-blue-400/40">
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6 animate-bounce" />
              <div>
                <p className="font-semibold">You have {getSharedWithMeCount()} trip{getSharedWithMeCount() > 1 ? 's' : ''} shared with you! 🎉</p>
                <p className="text-sm text-blue-100">Check them out below</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10 animate-[fadeInUp_0.6s_ease-out_0.2s_both]">
          <StatCard 
            title="Total Trips" 
            value={trips.length} 
            icon={<Globe className="w-6 h-6" />}
            gradient="from-blue-500 to-cyan-400"
          />
          <StatCard
            title="Total Budget"
            value={`₹${trips.reduce((sum, t) => sum + Number(t.budget), 0)}`}
            icon={<DollarSign className="w-6 h-6" />}
            gradient="from-green-500 to-emerald-400"
          />
          <StatCard 
            title="Shared Trips" 
            value={getSharedTripsCount()} 
            icon={<Users className="w-6 h-6" />}
            gradient="from-purple-500 to-pink-400"
          />
          <StatCard 
            title="Upcoming Trips" 
            value={trips.length} 
            icon={<Calendar className="w-6 h-6" />}
            gradient="from-orange-500 to-yellow-400"
          />
        </div>

        {/* Trips Grid */}
        <div className="animate-[fadeIn_0.8s_ease-out_0.4s_both]">
          {trips.length === 0 ? (
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-12 text-center border border-white/40">
              <Plane className="w-20 h-20 text-purple-400 mx-auto mb-4 animate-bounce" />
              <h3 className="text-2xl font-bold text-gray-800 mb-2">No trips yet!</h3>
              <p className="text-gray-600 mb-6">Start planning your next adventure 🌍</p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white px-8 py-3 rounded-2xl shadow-lg hover:scale-105 transition-all duration-300"
              >
                Create Your First Trip
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.map((trip, index) => {
                const isOwner = trip.ownerId === user?.uid;
                const isShared = trip.sharedWith && trip.sharedWith.length > 0;
                const splitCount = trip.splitCount || 1;
                const splitBudget = trip.budget / splitCount;

                return (
                  <div
                    key={trip.id}
                    className="group bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 border border-white/40 hover:scale-105 animate-[fadeInUp_0.6s_ease-out_both]"
                    style={{ animationDelay: `${0.1 * index}s` }}
                  >
                    {/* Trip Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-gray-800 group-hover:text-purple-600 transition-colors">
                            {trip.title}
                          </h3>
                          {!isOwner && (
                            <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-lg flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              Shared
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <p className="text-sm">{trip.destination}</p>
                        </div>
                        {!isOwner && trip.ownerName && (
                          <p className="text-xs text-gray-500 mt-1">
                            By {trip.ownerName}
                          </p>
                        )}
                      </div>
                      <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-2xl shadow-lg">
                        <Palmtree className="w-6 h-6 text-white" />
                      </div>
                    </div>

                    {/* Trip Dates */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Calendar className="w-4 h-4 text-purple-500" />
                        <span>{trip.startDate} - {trip.endDate}</span>
                      </div>
                    </div>

                    {/* Budget */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="bg-green-100 p-2 rounded-xl">
                            <DollarSign className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Total Budget</p>
                            <p className="text-lg font-bold text-green-600">₹{trip.budget}</p>
                          </div>
                        </div>
                      </div>

                      {/* Split Budget Display */}
                      {splitCount > 1 && (
                        <div className="bg-blue-50 rounded-xl p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-700">
                              Split {splitCount} ways
                            </span>
                          </div>
                          <span className="text-sm font-bold text-blue-700">
                            ₹{splitBudget.toFixed(2)}/person
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Shared With List */}
                    {isShared && isOwner && (
                      <div className="mb-4 p-3 bg-purple-50 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4 text-purple-600" />
                          <p className="text-xs font-semibold text-purple-700">Shared with:</p>
                        </div>
                        <div className="space-y-1 max-h-20 overflow-y-auto">
                          {trip.sharedWith?.map((email: string) => (
                            <div key={email} className="flex items-center justify-between text-xs">
                              <span className="text-gray-700">{email}</span>
                              <button
                                onClick={() => handleUnshare(trip.id!, email)}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Remove"
                              >
                                <UserMinus className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* // ─── Replace your trip card action buttons section in dashboard/page.tsx ───
// Find the "Action Buttons" comment block and replace it with this: */}

{/* Action Buttons */}
<div className="flex gap-2">
  {/* 🆕 View Map button — routes to full trip planner */}
  <button
    onClick={() => router.push(`/trip/${trip.id}`)}
    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-2 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 hover:scale-105 shadow-md"
  >
    <MapPin className="w-4 h-4" />
    <span className="text-sm font-semibold">Plan on Map</span>
  </button>

  {isOwner && (
    <button
      onClick={() => handleShareClick(trip)}
      className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-600 py-2 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group/share"
    >
      <Share2 className="w-4 h-4 group-hover/share:scale-110 transition-transform" />
      <span className="text-sm font-medium">Share</span>
    </button>
  )}
  {isOwner && (
    <button
      onClick={() => handleDelete(trip.id!)}
      className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-xl transition-all duration-300 flex items-center justify-center group/delete"
    >
      <Trash2 className="w-4 h-4 group-hover/delete:scale-110 transition-transform" />
    </button>
  )}
</div>

{/* // ─── Also add MapPin to your imports at top of dashboard ───────────────────
// import { ..., MapPin } from "lucide-react";  ← already there ✅
// Make sure `router` is available — it already is from useRouter() ✅ */}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Trip Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.3s_ease-out]">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-md shadow-2xl border border-white/40 animate-[fadeInUp_0.4s_ease-out]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Create New Trip</h2>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm p-2 rounded-xl transition-all duration-300 hover:scale-110"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  Trip Title
                </label>
                <input
                  type="text"
                  placeholder="e.g., Tokyo Adventure"
                  required
                  className="w-full border-2 border-purple-200 focus:border-purple-500 p-3 rounded-xl bg-white/50 backdrop-blur-sm transition-all outline-none"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-pink-500" />
                  Destination
                </label>
                <input
                  type="text"
                  placeholder="Where to?"
                  required
                  className="w-full border-2 border-pink-200 focus:border-pink-500 p-3 rounded-xl bg-white/50 backdrop-blur-sm transition-all outline-none"
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full border-2 border-blue-200 focus:border-blue-500 p-3 rounded-xl bg-white/50 backdrop-blur-sm transition-all outline-none"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-orange-500" />
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full border-2 border-orange-200 focus:border-orange-500 p-3 rounded-xl bg-white/50 backdrop-blur-sm transition-all outline-none"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  Budget
                </label>
                <input
                  type="number"
                  required
                  placeholder="₹ 0"
                  className="w-full border-2 border-green-200 focus:border-green-500 p-3 rounded-xl bg-white/50 backdrop-blur-sm transition-all outline-none"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full group relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white px-6 py-4 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed mt-6"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="font-semibold">Creating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span className="font-semibold">Create Trip</span>
                    </>
                  )}
                </div>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Share Trip Modal */}
      {showShareModal && selectedTrip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.3s_ease-out]">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-md shadow-2xl border border-white/40 animate-[fadeInUp_0.4s_ease-out]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl">
                    <Share2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Share Trip</h2>
                    <p className="text-white/80 text-sm">{selectedTrip.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm p-2 rounded-xl transition-all duration-300 hover:scale-110"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Your Email Info */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                <p className="text-sm text-gray-600 mb-2">Share with friends who have Trip-o-leaf accounts:</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white px-3 py-2 rounded-lg text-sm text-gray-700 border">
                    Your email: {user?.email}
                  </div>
                  <button
                    onClick={handleCopyEmail}
                    className="bg-purple-500 hover:bg-purple-600 text-white p-2 rounded-lg transition-all"
                    title="Copy your email"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <form onSubmit={handleShare} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-purple-500" />
                    Friend's Email (must have an account)
                  </label>
                  <input
                    type="email"
                    placeholder="friend@example.com"
                    required
                    className="w-full border-2 border-purple-200 focus:border-purple-500 p-3 rounded-xl bg-white/50 backdrop-blur-sm transition-all outline-none text-purple-400"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Bell className="w-3 h-3" />
                    They'll see this trip when they log in to Trip-o-leaf
                  </p>
                </div>

                {shareError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                    <p className="text-red-600 text-sm">{shareError}</p>
                  </div>
                )}

                {shareSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                    <p className="text-green-600 text-sm">{shareSuccess}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={shareLoading}
                  className="w-full group relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white px-6 py-3 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative flex items-center justify-center gap-2">
                    {shareLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="font-semibold">Sharing...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5" />
                        <span className="font-semibold">Share Trip</span>
                      </>
                    )}
                  </div>
                </button>
              </form>

              {/* Current Shares */}
              {selectedTrip.sharedWith && selectedTrip.sharedWith.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-purple-600" />
                    <p className="text-sm font-semibold text-gray-700">Currently shared with:</p>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedTrip.sharedWith.map((email: string) => (
                      <div key={email} className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                        <span className="text-sm text-gray-700">{email}</span>
                        <button
                          onClick={() => handleUnshare(selectedTrip.id, email)}
                          className="text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded-lg transition-all"
                          title="Remove"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Budget Split Info */}
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-blue-700">Total Budget:</span>
                  <span className="text-lg font-bold text-blue-700">₹{selectedTrip.budget}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-600">Split {selectedTrip.splitCount || 1} ways:</span>
                  <span className="text-sm font-bold text-blue-600">
                    ₹{(selectedTrip.budget / (selectedTrip.splitCount || 1)).toFixed(2)}/person
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

function StatCard({ title, value, icon, gradient }: any) {
  return (
    <div className="group bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/40 hover:scale-105 transition-all duration-300 hover:shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <div className={`bg-gradient-to-br ${gradient} p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform`}>
          <div className="text-white">{icon}</div>
        </div>
      </div>
      <p className="text-gray-600 text-sm mb-1">{title}</p>
      <h3 className="text-2xl md:text-3xl font-bold text-gray-800">{value}</h3>
    </div>
  );
}