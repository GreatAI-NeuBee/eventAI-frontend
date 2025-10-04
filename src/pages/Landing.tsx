import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, Users, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/common/Logo';
import Spinner from '../components/common/Spinner';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { user, signInWithGoogle, loading, error } = useAuth();
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Sign in failed:', err);
    }
  };

  const handleVideoLoad = () => {
    setIsVideoLoading(false);
  };

  const features = [
    {
      icon: Calendar,
      title: 'Intelligent Event Planning',
      description: 'Create and manage events with AI-powered venue layout tools and crowd flow prediction.',
    },
    {
      icon: Users,
      title: 'Real-time Crowd Monitoring',
      description: 'Track crowd density and movement patterns in real-time with live updates and alerts.',
    },
    {
      icon: TrendingUp,
      title: 'Predictive Analytics',
      description: 'Advanced ML models forecast crowd behavior and identify potential congestion hotspots.',
    },
  ];

  // Animation variants
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-orange-100">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Logo 
            size="md" 
            textColor="text-gray-900" 
            iconColor="text-blue-600"
          />
          
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="bg-black hover:bg-gray-800 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </button>
        </div>
      </nav>

      {/* Auth Error Display */}
      {error && (
        <div className="fixed top-20 right-4 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-6 py-24 text-center">
        <motion.p 
          className="text-gray-600 text-sm font-medium mb-4"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          Powered by AI
        </motion.p>
        
        <motion.h1 
          className="text-6xl font-bold text-gray-900 mb-6 leading-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Crowd Control
          <br />
          made simple
        </motion.h1>
        
        <motion.p 
          className="text-xl text-gray-700 max-w-3xl mx-auto mb-20 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Event Buddy gives you powerful AI-driven crowd simulation, real-time monitoring 
          for safer events, and intelligent venue planning tools to optimize every aspect 
          of your event management.
        </motion.p>

        {/* Demo Video Below Title */}
        <motion.div 
          className="relative mt-8 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          {isVideoLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-2xl z-10">
              <div className="text-center">
                <Spinner size="lg" className="mb-3" />
                <p className="text-sm text-gray-600">Loading demo video...</p>
              </div>
            </div>
          )}
          <video
            className="w-full rounded-2xl shadow-2xl"
            autoPlay
            loop
            muted
            playsInline
            onLoadedData={handleVideoLoad}
          >
            <source src="/videos/modelControl.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </motion.div>
      </div>

      {/* Features Section */}
      <motion.div 
        className="max-w-7xl mx-auto px-6 py-20"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
      >
        <motion.h2 
          className="text-4xl font-bold text-gray-900 text-center mb-4"
          variants={fadeInUp}
        >
          Everything you need
          <br />
          to manage your events
        </motion.h2>
        
        <motion.div 
          className="grid md:grid-cols-3 gap-8 mt-16"
          variants={staggerContainer}
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
                variants={fadeInUp}
              >
                <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mb-6">
                  <Icon className="h-7 w-7 text-gray-900" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>

      {/* Workflow Section */}
      <div className="bg-white py-20">
        <motion.div 
          className="max-w-6xl mx-auto px-6"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.h2 
            className="text-4xl font-bold text-gray-900 text-center mb-4"
            variants={fadeInUp}
          >
            Manage the entire
            <br />
            event workflow
          </motion.h2>
          <motion.p 
            className="text-xl text-gray-600 text-center max-w-3xl mx-auto mb-16"
            variants={fadeInUp}
          >
            Event Buddy is built with productivity at heart and is loaded with features to 
            help you manage events more effectively. It's quick to learn, fast to navigate, 
            and empowering to use.
          </motion.p>
          
          <motion.div 
            className="grid md:grid-cols-2 gap-8"
            variants={staggerContainer}
          >
            <motion.div className="space-y-4" variants={fadeInUp}>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Flexible event tracking</h4>
                  <p className="text-gray-600 text-sm">Track multiple events with customizable workflows and stages</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">AI-powered predictions</h4>
                  <p className="text-gray-600 text-sm">Get accurate crowd density forecasts and safety recommendations</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Real-time monitoring</h4>
                  <p className="text-gray-600 text-sm">Live crowd tracking with instant alerts and notifications</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div className="space-y-4" variants={fadeInUp}>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Interactive venue planning</h4>
                  <p className="text-gray-600 text-sm">Design and visualize venue layouts with drag-and-drop tools</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Detailed analytics</h4>
                  <p className="text-gray-600 text-sm">Comprehensive reports and insights for data-driven decisions</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Document management</h4>
                  <p className="text-gray-600 text-sm">Centralized storage for permits, layouts, and event materials</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* CTA Section */}
      <motion.div 
        className="max-w-4xl mx-auto px-6 py-24 text-center"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
      >
        <motion.h2 
          className="text-4xl font-bold text-gray-900 mb-4"
          variants={fadeInUp}
        >
          Get started with Event Buddy today
        </motion.h2>
        <motion.p 
          className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto"
          variants={fadeInUp}
        >
          No matter what type of event, from small gatherings to large conferences, 
          Event Buddy is the best way to ensure safety and success.
        </motion.p>
        <motion.button
          onClick={handleSignIn}
          disabled={loading}
          className="bg-black hover:bg-gray-800 text-white px-10 py-3 rounded-lg text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          variants={fadeInUp}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {loading ? 'Signing in...' : 'Get started free'}
        </motion.button>
      </motion.div>
    </div>
  );
};

export default Landing;
