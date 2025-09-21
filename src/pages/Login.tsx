import { useState } from "react";
import {
  FaCheckCircle,
  FaUser,
  FaLock,
  FaEnvelope,
  FaGoogle,
  FaFacebookF,
  FaTwitter,
  FaLandmark,
} from "react-icons/fa";

// Tailwind version with glassmorphism card, fixed size, 50/50 split, non-scrollable signup, and titles
// Palette: #89A8B2, #B3C8CF, #E5E1DA, #F1F0E8
export default function Login() {
  const [isLogin, setIsLogin] = useState(true);

  const handleLoginSubmit = (e: any) => {
    e.preventDefault();
    alert("Login functionality would be implemented here!");
  };

  const handleSignupSubmit = (e: any) => {
    e.preventDefault();
    alert("Signup functionality would be implemented here!");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-x-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?q=80&w=1920&auto=format&fit=crop')",
        }}
      />
      {/* Dark veil for readability */}
      <div className="absolute inset-0 bg-black/35" />

      {/* Glass card container (fixed size, equal split) */}
      <div className="relative z-10 mx-auto w-[1000px] h-[550px] rounded-2xl overflow-hidden border border-white/30 bg-white/10 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.25)] flex">
        {/* Left / Info Section (50%) with translucent gradient so background subtly shows through */}
        <div
          className="relative w-1/2 h-full p-10 text-white"
          style={{
            background: "linear-gradient(135deg, rgba(137,168,178,0.65), rgba(179,200,207,0.45))",
          }}
        >
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 drop-shadow">Welcome to Stadium Events</h2>
              <p className="text-white/95 leading-relaxed">
                We are the premier platform for booking and managing events at world-class stadium venues. From
                concerts to sports events, we provide an unparalleled experience.
              </p>

              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3">
                  <FaCheckCircle className="text-[#F1F0E8]" />
                  <span>Access to 100+ stadiums worldwide</span>
                </li>
                <li className="flex items-center gap-3">
                  <FaCheckCircle className="text-[#F1F0E8]" />
                  <span>Premium event management tools</span>
                </li>
                <li className="flex items-center gap-3">
                  <FaCheckCircle className="text-[#F1F0E8]" />
                  <span>Real-time seating and ticket management</span>
                </li>
                <li className="flex items-center gap-3">
                  <FaCheckCircle className="text-[#F1F0E8]" />
                  <span>Integrated marketing and promotion services</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <FaLandmark className="text-2xl text-[#F1F0E8]" />
              <h1 className="text-2xl font-bold">StadiumEvents</h1>
            </div>
          </div>
        </div>

        {/* Right / Form Section (50%) with glass surface */}
        <div className="w-1/2 h-full p-8 bg-white/20 backdrop-blur-xl relative flex flex-col text-slate-800">

          {/* Forms area - constant size; prevent scrolling */}
          <div className="relative flex-1 overflow-hidden">
            {/* LOGIN */}
            <form
              onSubmit={handleLoginSubmit}
              className={`absolute inset-0 space-y-3 transition-opacity duration-300 ${
                isLogin ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <h3 className="text-2xl font-bold text-[#385864]">Login</h3>

              <div className="relative">
                <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-[#89A8B2]" />
                <input
                  type="text"
                  placeholder="Username or Email"
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-md bg-white/80 border border-white/40 text-slate-700 placeholder-slate-500 focus:outline-none focus:border-[#89A8B2]"
                />
              </div>

              <div className="relative">
                <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#89A8B2]" />
                <input
                  type="password"
                  placeholder="Password"
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-md bg-white/80 border border-white/40 text-slate-700 placeholder-slate-500 focus:outline-none focus:border-[#89A8B2]"
                />
              </div>

              <div className="flex items-center justify-between text-sm text-slate-700">
                <label className="flex items-center gap-2 select-none">
                  <input type="checkbox" className="" /> Remember me
                </label>
                <a href="#" className="hover:underline">Forgot Password?</a>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-md font-semibold text-white shadow-lg bg-gradient-to-r from-[#89A8B2] to-[#B3C8CF] hover:opacity-90 transition"
              >
                Login
              </button>

              <div className="mt-4 text-center">
                <p className="text-slate-700 mb-3">Or login with</p>
                <div className="flex justify-center gap-3">
                  <a href="#" aria-label="Login with Google" className="w-11 h-11 grid place-items-center rounded-full border border-white/40 bg-white/70 hover:bg-white/90 transition"><FaGoogle className="text-[#385864]" /></a>
                  <a href="#" aria-label="Login with Facebook" className="w-11 h-11 grid place-items-center rounded-full border border-white/40 bg-white/70 hover:bg-white/90 transition"><FaFacebookF className="text-[#385864]" /></a>
                  <a href="#" aria-label="Login with Twitter" className="w-11 h-11 grid place-items-center rounded-full border border-white/40 bg-white/70 hover:bg-white/90 transition"><FaTwitter className="text-[#385864]" /></a>
                </div>
              </div>

              <div className="mt-4 text-center text-slate-800">
                Not a member yet?{" "}
                <a
                  href="#"
                  className="ml-1 px-3 py-1 rounded-full bg-gradient-to-r from-[#89A8B2] to-[#B3C8CF] text-white font-semibold shadow hover:opacity-90"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsLogin(false);
                  }}
                >
                  SIGN UP
                </a>{" "}
                now!
              </div>
            </form>

            {/* SIGNUP */}
            <form
              onSubmit={handleSignupSubmit}
              className={`absolute inset-0 space-y-3 transition-opacity duration-300 ${
                !isLogin ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <h3 className="text-2xl font-bold text-[#385864]">Sign Up</h3>

              <div className="relative">
                <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-[#89A8B2]" />
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-md bg-white/80 border border-white/40 text-slate-700 placeholder-slate-500 focus:outline-none focus:border-[#89A8B2]"
                />
              </div>

              <div className="relative">
                <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-[#89A8B2]" />
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-md bg-white/80 border border-white/40 text-slate-700 placeholder-slate-500 focus:outline-none focus:border-[#89A8B2]"
                />
              </div>

              <div className="relative">
                <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#89A8B2]" />
                <input
                  type="password"
                  placeholder="Password"
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-md bg-white/80 border border-white/40 text-slate-700 placeholder-slate-500 focus:outline-none focus:border-[#89A8B2]"
                />
              </div>

              <div className="relative">
                <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#89A8B2]" />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-md bg-white/80 border border-white/40 text-slate-700 placeholder-slate-500 focus:outline-none focus:border-[#89A8B2]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-md font-semibold text-white shadow-lg bg-gradient-to-r from-[#89A8B2] to-[#B3C8CF] hover:opacity-90 transition"
              >
                Create Account
              </button>

              <div className="mt-4 text-center">
                <p className="text-slate-800 mb-3">Or sign up with</p>
                <div className="flex justify-center gap-3">
                  <a href="#" aria-label="Signup with Google" className="w-11 h-11 grid place-items-center rounded-full border border-white/40 bg-white/70 hover:bg-white/90 transition"><FaGoogle className="text-[#385864]" /></a>
                  <a href="#" aria-label="Signup with Facebook" className="w-11 h-11 grid place-items-center rounded-full border border-white/40 bg-white/70 hover:bg-white/90 transition"><FaFacebookF className="text-[#385864]" /></a>
                  <a href="#" aria-label="Signup with Twitter" className="w-11 h-11 grid place-items-center rounded-full border border-white/40 bg-white/70 hover:bg-white/90 transition"><FaTwitter className="text-[#385864]" /></a>
                </div>
              </div>

              <div className="mt-4 text-center text-slate-800">
                Already have an account?{" "}
                <a
                  href="#"
                  className="ml-1 px-3 py-1 rounded-full bg-gradient-to-r from-[#89A8B2] to-[#B3C8CF] text-white font-semibold shadow hover:opacity-90"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsLogin(true);
                  }}
                >
                  LOGIN
                </a>{" "}
                instead!
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
