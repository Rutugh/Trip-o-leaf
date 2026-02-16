"use client";

import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plane, MapPin, Globe, Palmtree, Compass } from "lucide-react";
import Image from "next/image";

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const token = await user.getIdToken();
      document.cookie = `firebase-token=${token}; path=/; max-age=3600`;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        createdAt: new Date(),
      }, { merge: true });

      router.push("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      setError(error.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen w-full overflow-hidden">
      {/* Gradient Background (shows immediately) */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400">
        {/* Image loads in background without blocking */}
        <Image
          src="https://images.unsplash.com/photo-1660207768602-f6327ae51d82?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=75&w=1920"
          alt="Travel background"
          fill
          className="object-cover opacity-60"
          priority
          quality={75}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/40 via-pink-500/40 to-orange-400/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
      </div>

      {/* Floating Icons Animation */}
      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
        <Plane className="absolute top-[15%] left-[10%] w-8 h-8 text-white/30 animate-[float_6s_ease-in-out_infinite]" style={{ animationDelay: '0s' }} />
        <MapPin className="absolute top-[25%] right-[15%] w-10 h-10 text-white/20 animate-[float_8s_ease-in-out_infinite]" style={{ animationDelay: '1s' }} />
        <Globe className="absolute bottom-[30%] left-[8%] w-12 h-12 text-white/25 animate-[float_7s_ease-in-out_infinite]" style={{ animationDelay: '2s' }} />
        <Palmtree className="absolute bottom-[20%] right-[12%] w-9 h-9 text-white/30 animate-[float_9s_ease-in-out_infinite]" style={{ animationDelay: '3s' }} />
        <Compass className="absolute top-[60%] right-[8%] w-11 h-11 text-white/20 animate-[float_10s_ease-in-out_infinite]" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Main Content */}
      <div className="relative z-20 flex flex-col items-center justify-center w-full px-6">
        {/* Logo/Brand Section */}
        <div className="mb-12 text-center space-y-4 animate-[fadeInDown_0.8s_ease-out]">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <Palmtree className="w-16 h-16 text-emerald-400 drop-shadow-lg transform -rotate-12" />
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-pulse" />
            </div>
            <h1 className="text-6xl md:text-7xl tracking-tight text-white drop-shadow-2xl">
              Trip-o-leaf
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-white/90 drop-shadow-lg max-w-md mx-auto">
            Your next adventure awaits ✈️
          </p>
          <div className="flex items-center justify-center gap-2 text-white/80 text-sm">
            <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
              Plan
            </div>
            <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
              Explore
            </div>
            <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
              Discover
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-md animate-[fadeInUp_0.8s_ease-out]">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-10 border border-white/40">
            <div className="text-center mb-8">
              <h2 className="text-2xl mb-2 text-purple-400">
                Let's get you started! 🌍
              </h2>
              <p className="text-gray-600">
                Sign in to plan your dream trip
              </p>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full group relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white px-6 py-4 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center justify-center gap-3">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-lg">Signing you in...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="text-lg">Sign in with Google</span>
                  </>
                )}
              </div>
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 text-sm text-center">{error}</p>
              </div>
            )}

            <div className="mt-6 text-center text-sm text-gray-500">
              Join thousands of travelers worldwide 🌏
            </div>
          </div>
        </div>

        {/* Bottom Tagline */}
        <div className="mt-8 text-center animate-[fadeIn_1s_ease-out_0.5s_both]">
          <p className="text-white/70 text-sm">
            Travel smarter, not harder 💫
          </p>
        </div>
      </div>

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