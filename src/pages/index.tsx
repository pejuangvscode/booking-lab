import Head from "next/head";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Home as HomeIcon, BookOpen, Users, Calendar, FileText, Phone, Menu, X, Layers, Timer, Info } from "lucide-react";
import React from "react";

const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [ref, setRef] = useState<Element | null>(null);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(([entry]) => {
      // Update state whenever intersection changes (both entering and leaving)
      setIsIntersecting(entry?.isIntersecting ?? false);
    }, {
      threshold: 0.01,
      rootMargin: '150px 0px -50px 0px',
      ...options
    });

    observer.observe(ref);

    return () => observer.disconnect();
  }, [ref, options]);

  return [setRef, isIntersecting] as const;
};

const AnimatedSection: React.FC<{
  children: React.ReactNode;
  className?: string;
  animation?: 'fadeInUp' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight' | 'fadeIn' | 'scaleIn';
  delay?: number;
  showByDefault?: boolean;
}> = ({ children, className = "", animation = 'fadeInUp', delay = 0, showByDefault = false }) => {
  const [ref, isIntersecting] = useIntersectionObserver();
  const [shouldShow, setShouldShow] = useState(showByDefault);

  useEffect(() => {
    if (showByDefault) {
      setShouldShow(true);
    } else {
      // Update based on intersection - will animate both ways
      setShouldShow(isIntersecting);
    }
  }, [isIntersecting, showByDefault]);

  const getAnimationClass = () => {
    const baseClasses = "transition-all duration-300 ease-out";
    
    if (!shouldShow) {
      switch (animation) {
        case 'fadeInUp':
          return `${baseClasses} opacity-0 transform translate-y-8`;
        case 'fadeInDown':
          return `${baseClasses} opacity-0 transform -translate-y-8`;
        case 'fadeInLeft':
          return `${baseClasses} opacity-0 transform -translate-x-8`;
        case 'fadeInRight':
          return `${baseClasses} opacity-0 transform translate-x-8`;
        case 'fadeIn':
          return `${baseClasses} opacity-0`;
        case 'scaleIn':
          return `${baseClasses} opacity-0 transform scale-95`;
        default:
          return `${baseClasses} opacity-0 transform translate-y-8`;
      }
    }
    
    return `${baseClasses} opacity-100 transform translate-y-0 translate-x-0 scale-100`;
  };

  return (
    <div 
      ref={ref}
      className={`${getAnimationClass()} ${className}`}
      style={{ 
        transitionDelay: `${delay}ms`,
        willChange: 'transform, opacity'
      }}
    >
      {children}
    </div>
  );
};

const StaggeredAnimationContainer: React.FC<{
  children: React.ReactNode;
  staggerDelay?: number;
  animation?: 'fadeInUp' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight' | 'fadeIn' | 'scaleIn';
  className?: string;
  showByDefault?: boolean;
}> = ({ children, staggerDelay = 150, animation = 'fadeInUp', className = "", showByDefault = false }) => {
  const childrenArray = React.Children.toArray(children);
  
  return (
    <div className={className}>
      {childrenArray.map((child, index) => (
        <AnimatedSection 
          key={index} 
          animation={animation} 
          delay={index * staggerDelay}
          showByDefault={showByDefault}
        >
          {child}
        </AnimatedSection>
      ))}
    </div>
  );
};

export default function Home() {
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Check if user has seen the notice modal
  useEffect(() => {
    const hasSeenNotice = localStorage.getItem('hasSeenTechnicalNotice');
    if (!hasSeenNotice) {
      setShowNoticeModal(true);
    }
  }, []);

  const handleCloseNotice = () => {
    setShowNoticeModal(false);
    localStorage.setItem('hasSeenTechnicalNotice', 'true');
  };
  
  // Scroll spy to update active section
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'about', 'how-to-use', 'rules', 'contact'];
      const scrollPosition = window.scrollY + 100;
      
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    setIsMobileMenuOpen(false);
  };
  
  const navItems = [
    { id: 'home', label: 'Home', icon: <HomeIcon className="w-4 h-4" /> },
    { id: 'about', label: 'About', icon: <Info className="w-4 h-4" /> },
    { id: 'how-to-use', label: 'How to Use', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'rules', label: 'Rules', icon: <FileText className="w-4 h-4" /> },
    { id: 'contact', label: 'Contact', icon: <Phone className="w-4 h-4" /> },
  ];

  return (
    <div className="relative">
      <Head>
        <title>BookLab | FIT Lab Booking</title>
        <meta name="description" content="UPH Lab Room Booking Portal" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Floating Navigation - Desktop */}
      <nav className="hidden lg:block fixed top-1/2 right-8 transform -translate-y-1/2 z-40">
        <div className="bg-white/90 backdrop-blur-md rounded-full shadow-2xl border border-gray-200 py-4 px-2">
          <div className="flex flex-col space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`group relative p-3 rounded-full transition-all duration-300 ${
                  activeSection === item.id
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title={item.label}
              >
                {item.icon}
                <span className={`absolute right-full mr-4 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
                  activeSection === item.id ? 'font-semibold' : ''
                }`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-full shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-110"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute bottom-24 left-4 right-4 bg-white rounded-3xl shadow-2xl p-6 transform transition-all duration-300 animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 text-center">
              <h3 className="text-lg font-bold text-gray-900">Navigation</h3>
              <p className="text-xs text-gray-500 mt-1">Jump to section</p>
            </div>
            <div className="flex flex-col space-y-3">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-300 ${
                    activeSection === item.id
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg scale-105'
                      : 'text-gray-700 bg-gray-50 hover:bg-gray-100 active:scale-95'
                  }`}
                >
                  <div className={`flex-shrink-0 ${activeSection === item.id ? 'text-white' : 'text-orange-600'}`}>
                    {item.icon}
                  </div>
                  <span className="font-semibold text-base">{item.label}</span>
                  {activeSection === item.id && (
                    <div className="ml-auto">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hero Section - Chinese New Year 2026 Theme */}
      <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-red-900 via-red-800 to-red-950">
        {/* Chinese New Year Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Chinese Clouds - Red with Yellow Border - Different Speeds, Directions & Sizes */}
          <img 
            src="/chinese_event/1.png" 
            alt="Chinese Cloud" 
            className="absolute top-16 w-32 lg:w-48 h-auto opacity-70 animate-float-left"
            style={{ animationDuration: '30s' }}
          />
          <img 
            src="/chinese_event/1.png" 
            alt="Chinese Cloud" 
            className="absolute bottom-20 w-48 lg:w-80 h-auto opacity-60 animate-float-right"
            style={{ animationDuration: '40s' }}
          />
          <img 
            src="/chinese_event/1.png" 
            alt="Chinese Cloud" 
            className="absolute top-1/3 w-40 lg:w-120 h-auto opacity-50 animate-float-right"
            style={{ animationDuration: '25s' }}
          />
          
          {/* Red Lanterns - Hanging and Swinging from Top - Desktop Only */}
          <img 
            src="/chinese_event/2.png" 
            alt="Red Lantern" 
            className="hidden lg:block absolute top-0 left-20 w-75 h-auto opacity-95 animate-swing"
            style={{ 
              filter: 'drop-shadow(0 25px 40px rgba(0, 0, 0, 0.2)) drop-shadow(0 10px 20px rgba(139, 0, 0, 0.6))'
            }}
          />
          <img 
            src="/chinese_event/2.png" 
            alt="Red Lantern" 
            className="hidden lg:block absolute top-0 right-20 w-56 h-auto opacity-95 animate-swing"
            style={{ 
              animationDelay: '1s',
              filter: 'drop-shadow(0 25px 40px rgba(0, 0, 0, 0.2)) drop-shadow(0 10px 20px rgba(139, 0, 0, 0.6))'
            }}
          />
          
          {/* Golden Fire Horse - Year of the Horse 2026 */}
          {/* <img 
            src="/chinese_event/3.png" 
            alt="Golden Fire Horse" 
            className="absolute -bottom-80 -right-120 w-[900px] opacity-30 h-auto animate-float"
            style={{ animationDelay: '1s' }}
          /> */}
        </div>
        
        {/* Traditional Chinese Waves Pattern */}
        <div className="absolute inset-0 opacity-[0.30]">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='60' viewBox='0 0 200 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30 Q 25 10, 50 30 T 100 30 T 150 30 T 200 30' stroke='%23ffd700' stroke-width='1.5' fill='none' opacity='0.4'/%3E%3Cpath d='M0 40 Q 25 20, 50 40 T 100 40 T 150 40 T 200 40' stroke='%23ffd700' stroke-width='1.5' fill='none' opacity='0.3'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 60px',
            backgroundRepeat: 'repeat'
          }} />
        </div>
        
        {/* Elegant Chinese Knot Pattern */}
        <div className="absolute inset-0 opacity-[0.17]">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 60 L50 50 L60 60 L70 50 L80 60 L70 70 L60 60 L50 70 Z' stroke='%23ffd700' stroke-width='1' fill='none' opacity='0.5'/%3E%3Ccircle cx='60' cy='60' r='15' stroke='%23ff6b35' stroke-width='0.5' fill='none' opacity='0.3'/%3E%3C/svg%3E")`,
            backgroundSize: '120px 120px'
          }} />
        </div>
        
        {/* Subtle Diagonal Shimmer */}
        <div className="absolute inset-0 opacity-[0.1]">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255, 215, 0, 0.2) 40px, rgba(255, 215, 0, 0.2) 42px)`,
          }} />
        </div>
        
        {/* Firework Sparkles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute top-1/3 left-1/3 w-2 h-2 bg-amber-400 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
          <div className="absolute bottom-1/3 right-1/3 w-2 h-2 bg-yellow-500 rounded-full animate-ping" style={{ animationDuration: '2.5s', animationDelay: '1s' }} />
          <div className="absolute top-1/2 right-1/5 w-2 h-2 bg-red-400 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '1.5s' }} />
          <div className="absolute bottom-1/4 left-1/4 w-2 h-2 bg-yellow-300 rounded-full animate-ping" style={{ animationDuration: '2s', animationDelay: '2s' }} />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col items-center justify-center text-center">
              {/* Main Content - Centered */}
              <div className="text-center w-full">
                {/* CNY Badge */}
                <AnimatedSection animation="fadeInDown" showByDefault>
                  <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 border-3 border-red-900 rounded-full px-6 py-3 mb-8 shadow-2xl hover:shadow-yellow-500/50 transition-all duration-300 group">
                    <div className="w-6 h-6 rounded-full border-2 border-red-900 bg-yellow-500 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full border border-red-900" />
                    </div>
                    <span className="text-sm font-black text-red-900 tracking-wide">FACULTY OF INFORMATION TECHNOLOGY</span>
                    <div className="w-6 h-6 rounded-full border-2 border-red-900 bg-yellow-500 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full border border-red-900" />
                    </div>
                  </div>
                </AnimatedSection>

                {/* Main Heading - CNY 2026 */}
                <AnimatedSection animation="fadeInUp" delay={100} showByDefault>
                  <div className="mb-4">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-yellow-400 mb-2 animate-pulse">恭喜发财 Gong Xi Fa Cai</h2>
                    <p className="text-lg sm:text-xl text-yellow-300 font-semibold">Happy Chinese New Year 2026 - Year of the Fire Horse</p>
                  </div>
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-6 text-white leading-tight">
                    Book Your{' '}
                    <span className="relative inline-block">
                      <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent">
                        Laboratory
                      </span>
                      <div className="absolute -bottom-2 left-0 right-0 h-3 bg-yellow-500/50 -rotate-1 -z-10" />
                    </span>
                    <br />
                    <span className="text-yellow-200 text-2xl sm:text-3xl md:text-4xl font-bold">
                      Anytime, Anywhere
                    </span>
                  </h1>
                </AnimatedSection>

                {/* Subtitle */}
                {/* <AnimatedSection animation="fadeInUp" delay={200} showByDefault>
                  <p className="text-lg sm:text-xl md:text-2xl mb-12 text-gray-600 font-light max-w-3xl mx-auto lg:mx-0 leading-relaxed">
                    Sistem booking laboratorium <span className="font-semibold text-orange-600">FIT UPH</span> yang memudahkan mahasiswa dan dosen untuk reservasi ruang lab dengan cepat dan efisien.
                  </p>
                </AnimatedSection> */}

                {/* CTA Buttons */}
                <AnimatedSection animation="scaleIn" delay={300} showByDefault>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                    <Button 
                      className="group relative bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-600 hover:to-amber-600 text-red-900 px-8 py-6 text-lg font-black rounded-full shadow-2xl hover:shadow-yellow-500/50 cursor-pointer transition-all duration-300 hover:scale-110 w-full sm:w-auto border-2 border-yellow-600"
                      onClick={() => window.location.href = '/book-room'}
                    >
                      <span className="flex items-center gap-3 justify-center">
                        <Calendar className="h-5 w-5" />
                        <span>Book a Lab Now</span>
                      </span>
                    </Button>
                    
                    <Button 
                      variant="outline"
                      className="group relative bg-white/95 hover:bg-yellow-50 text-red-900 px-8 py-6 text-lg font-bold rounded-full border-3 border-yellow-600 hover:border-yellow-500 cursor-pointer transition-all duration-300 hover:scale-110 w-full sm:w-auto shadow-xl"
                      onClick={() => window.location.href = '/booking-calendar'}
                    >
                      <span className="flex items-center gap-3 justify-center">
                        <BookOpen className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                        <span>View Calendar</span>
                      </span>
                    </Button>
                  </div>
                </AnimatedSection>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
          <button 
            onClick={() => scrollToSection('about')}
            className="group flex flex-col items-center gap-3 transition-all duration-300 hover:scale-110"
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-yellow-300 group-hover:text-yellow-400 transition-colors duration-300">Scroll Down</span>
            <div className="relative">
              {/* Mouse Icon */}
              <div className="w-6 h-10 border-2 border-yellow-400 group-hover:border-yellow-300 rounded-full flex justify-center pt-2 transition-colors duration-300">
                <div className="w-1.5 h-2.5 bg-yellow-400 group-hover:bg-yellow-300 rounded-full animate-scroll transition-colors duration-300" />
              </div>
            </div>
            {/* Arrow */}
            <svg className="w-5 h-5 text-yellow-400 group-hover:text-yellow-300 animate-bounceArrow transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 sm:py-24 bg-gradient-to-br from-red-50 via-red-50/80 to-yellow-50/60 overflow-hidden relative">
        {/* CNY Background Decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-[500px] h-[500px] bg-gradient-to-br from-red-300/20 to-red-400/15 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-24 -left-24 w-[500px] h-[500px] bg-gradient-to-br from-yellow-300/18 to-amber-400/15 rounded-full blur-3xl animate-float" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-to-br from-red-200/12 to-rose-200/10 rounded-full blur-3xl" />
          <div className="absolute top-20 left-1/4 w-[350px] h-[350px] bg-gradient-to-br from-yellow-400/15 to-amber-400/12 rounded-full blur-3xl" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-red-400/15 to-rose-400/12 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>
        
        {/* Multiple Pattern Layers */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(to right, #f97316 1px, transparent 1px), linear-gradient(to bottom, #f97316 1px, transparent 1px)`,
            backgroundSize: '80px 80px'
          }} />
        </div>
        <div className="absolute inset-0 opacity-[0.01]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle, #f97316 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-6xl mx-auto">
            <AnimatedSection animation="fadeInUp" delay={200}>
              <div className="text-center mb-12 sm:mb-16">
                <div className="inline-block mb-4">
                  <span className="text-red-900 font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-2 rounded-full border-2 border-red-700">About Us</span>
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-red-900 mb-4 sm:mb-6">
                  About <span className="bg-gradient-to-r from-red-700 to-red-800 bg-clip-text text-transparent">FIT BookLab</span>
                </h2>
                <p className="text-sm sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                  BookLab adalah sistem booking laboratorium FIT (Faculty of Information Technology) UPH yang memungkinkan mahasiswa dan dosen untuk mereservasi ruang laboratorium dengan mudah dan efisien.
                </p>
              </div>
            </AnimatedSection>
              
              <StaggeredAnimationContainer
                staggerDelay={150}
                animation="scaleIn"
                className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8"
              >
                {[
                  {
                    icon: <Users className="h-7 w-7 sm:h-8 sm:w-8" />,
                    gradient: "from-red-600 to-red-700",
                    title: "Easy Booking",
                    description: "Sistem booking yang user-friendly dengan calendar yang intuitif"
                  },
                  {
                    icon: <Timer className="h-7 w-7 sm:h-8 sm:w-8" />,
                    gradient: "from-red-600 to-red-700",
                    title: "Real-time Updates",
                    description: "Informasi ketersediaan lab yang selalu update secara real-time"
                  },
                  {
                    icon: <Layers className="h-7 w-7 sm:h-8 sm:w-8" />,
                    gradient: "from-red-600 to-red-700",
                    title: "Multiple Labs",
                    description: "Akses ke berbagai laboratorium dengan spesifikasi yang berbeda"
                  }
                ].map((feature, index) => (
                  <div key={index} className="group relative bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-2 border-red-200 hover:border-yellow-500 overflow-hidden">
                    {/* Animated Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-8 transition-opacity duration-500`} />
                    
                    {/* Icon */}
                    <div className={`relative inline-flex p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br ${feature.gradient} text-white mb-3 sm:mb-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg border-2 border-yellow-400`}>
                      {feature.icon}
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-red-900 mb-2 sm:mb-3 group-hover:text-red-700 transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                    
                    {/* Hover Accent */}
                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} />
                  </div>
                ))}
              </StaggeredAnimationContainer>
            </div>
          </div>
        </section>

        {/* How to Use Section */}
        <section id="how-to-use" className="py-16 sm:py-24 bg-gradient-to-br from-red-100/70 via-red-50/50 to-yellow-50/40 overflow-hidden relative">
          {/* Enhanced Background Pattern */}
          <div className="absolute inset-0 opacity-[0.06]">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f97316' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '60px 60px'
            }} />
          </div>
          <div className="absolute inset-0 opacity-[0.025]">
            <div className="absolute inset-0" style={{
              backgroundImage: `linear-gradient(30deg, #f97316 12%, transparent 12.5%, transparent 87%, #f97316 87.5%, #f97316), linear-gradient(150deg, #f97316 12%, transparent 12.5%, transparent 87%, #f97316 87.5%, #f97316)`,
              backgroundSize: '80px 80px'
            }} />
          </div>
          
          {/* CNY Floating Orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 right-20 w-[400px] h-[400px] bg-gradient-to-br from-red-400/22 to-rose-400/15 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-20 left-20 w-[500px] h-[500px] bg-gradient-to-br from-yellow-400/18 to-amber-400/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/2 w-[350px] h-[350px] bg-gradient-to-br from-red-300/15 to-red-400/12 rounded-full blur-3xl" style={{ animationDelay: '1s' }} />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-5xl mx-auto">
              <AnimatedSection animation="fadeInUp" className="text-center mb-8 sm:mb-16">
                <div className="inline-block mb-3">
                  <span className="text-red-900 font-bold text-xs sm:text-sm uppercase tracking-wider bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-2 rounded-full shadow-md border-2 border-red-700">How It Works</span>
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-red-900 mb-4 sm:mb-6">
                  Cara Menggunakan <span className="bg-gradient-to-r from-red-700 to-red-800 bg-clip-text text-transparent">BookLab</span>
                </h2>
                <p className="text-sm sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                  Ikuti 6 langkah mudah untuk melakukan booking laboratorium
                </p>
              </AnimatedSection>
              
              <StaggeredAnimationContainer
                staggerDelay={120}
                animation="fadeInLeft"
                className="relative space-y-6 sm:space-y-8"
              >
                {/* Vertical Line */}
                <div className="absolute left-5 sm:left-7 top-8 bottom-8 w-0.5 bg-gradient-to-b from-orange-500 via-orange-400 to-orange-300 hidden sm:block" />
                
                {[
                  {
                    number: 1,
                    title: "Sign In ke Akun Anda",
                    description: "Klik tombol \"Sign In\" di pojok kanan atas dan masuk menggunakan akun Google Anda."
                  },
                  {
                    number: 2,
                    title: "Pilih Lab dan Waktu",
                    description: "Buka halaman \"Lab Search\" atau \"Booking Calendar\" untuk melihat ketersediaan lab dan pilih waktu yang diinginkan."
                  },
                  {
                    number: 3,
                    title: "Isi Form Booking",
                    description: "Lengkapi informasi booking seperti nama event, deskripsi, dan jumlah peserta yang akan menggunakan lab."
                  },
                  {
                    number: 4,
                    title: "Konfirmasi Booking",
                    description: "Review informasi booking Anda dan klik \"Submit\" untuk mengirim request."
                  },
                  {
                    number: 5,
                    title: "Monitor Status Booking",
                    description: "Cek status booking Anda di halaman \"Dashboard\" untuk melihat apakah booking sudah dikonfirmasi atau masih pending."
                  },
                  {
                    number: 6,
                    title: "Complete Booking",
                    description: "Setelah selesai menggunakan lab, kembali ke \"Dashboard\" dan klik tombol \"Complete Booking\" pada booking Anda yang berstatus \"accepted\". Jangan lupa untuk mengupload bukti bahwa ruangan telah dibersihkan di halaman complete booking."
                  }
                ].map((step) => (
                  <div key={step.number} className="relative flex items-start gap-3 sm:gap-4 md:gap-6 group">
                    {/* Number Badge */}
                    <div className="flex-shrink-0 relative z-10">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br from-red-600 to-red-700 text-yellow-400 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-base sm:text-lg md:text-xl shadow-lg group-hover:shadow-2xl group-hover:shadow-red-500/50 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 border-2 border-yellow-500">
                        {step.number}
                      </div>
                    </div>
                    
                    {/* Content Card */}
                    <div className="flex-1 bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-md hover:shadow-xl transition-all duration-500 group-hover:-translate-y-1 border-2 border-red-200 group-hover:border-yellow-500">
                      <h3 className="text-sm sm:text-base md:text-lg font-bold text-red-900 mb-1 sm:mb-2 group-hover:text-red-700 transition-colors duration-300">
                        {step.title}
                      </h3>
                      <p className="text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </StaggeredAnimationContainer>
              
              <AnimatedSection animation="scaleIn" delay={800} className="mt-8 sm:mt-16 text-center">
                <Button 
                  className="group relative bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-600 hover:to-amber-600 text-red-900 px-6 sm:px-12 py-3 sm:py-5 text-sm sm:text-base md:text-lg font-black rounded-full shadow-2xl hover:shadow-yellow-500/50 cursor-pointer transition-all duration-300 hover:scale-110 border-3 border-red-700 overflow-hidden"
                  onClick={() => window.location.href = '/book-room'}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  <span className="flex items-center gap-2 relative z-10">
                    Start Booking Now
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* Rules Section */}
        <section id="rules" className="py-16 sm:py-24 bg-gradient-to-br from-gray-50 via-orange-50/30 to-blue-50/30 relative overflow-hidden">
          {/* Multiple Grid Patterns */}
          <div className="absolute inset-0 opacity-[0.02]">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, #f97316 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }} />
          </div>
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0" style={{
              backgroundImage: `linear-gradient(90deg, rgba(249, 115, 22, 0.05) 1px, transparent 1px), linear-gradient(rgba(249, 115, 22, 0.05) 1px, transparent 1px)`,
              backgroundSize: '80px 80px'
            }} />
          </div>
          
          {/* Enhanced Gradient Orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-40 right-10 w-[450px] h-[450px] bg-gradient-to-br from-orange-200/15 to-red-200/12 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-40 left-10 w-[450px] h-[450px] bg-gradient-to-br from-blue-200/15 to-cyan-200/12 rounded-full blur-3xl" style={{ animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-purple-200/10 to-pink-200/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          </div>
          <div className="container mx-auto px-3 sm:px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-6 sm:mb-10 md:mb-14">
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 md:mb-5">
                  Tata Tertib Penggunaan Laboratorium FIT
                </h2>
                <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-5xl mx-auto">
                  Harap patuhi aturan berikut untuk menjaga kelancaran dan keamanan penggunaan laboratorium
                </p>
              </div>
              
              
              <AnimatedSection animation="fadeIn" delay={200}>
                <div className="bg-white p-4 sm:p-5 rounded-lg sm:rounded-xl shadow-md mb-6 sm:mb-8 md:mb-10">
                  <h3 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-base sm:text-lg">Daftar Isi:</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {[
                      { href: "#larangan", number: 1, title: "Larangan", color: "orange" },
                      { href: "#kewajiban", number: 2, title: "Kewajiban", color: "orange" },
                      { href: "#prosedur", number: 3, title: "Prosedur Peminjaman", color: "orange" },
                      { href: "#penampilan", number: 4, title: "Peraturan Berpenampilan", color: "orange" },
                      { href: "#sanksi", number: 5, title: "Sanksi Pelanggaran", color: "orange" },
                      { href: "#kontak", number: 6, title: "Kontak Penanggung Jawab", color: "orange" }
                    ].map((item) => (
                      <a key={item.number} href={item.href} className={`flex items-center p-1.5 sm:p-2 hover:bg-gray-50 rounded-md group transition-all duration-300 hover:scale-105`}>
                        <span className={`w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-${item.color}-100 text-${item.color}-600 rounded-full mr-1.5 sm:mr-2 text-xs sm:text-sm font-medium transition-all duration-300 group-hover:scale-110`}>{item.number}</span>
                        <span className={`text-xs sm:text-sm text-gray-700 group-hover:text-${item.color}-600 transition-colors duration-300`}>{item.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </AnimatedSection>
              
              
              <StaggeredAnimationContainer
                staggerDelay={100}
                animation="fadeInUp"
                className="space-y-8 sm:space-y-10"
              >
                
                <div className="space-y-6 sm:space-y-8">
                  
                  <div id="larangan" className="bg-white p-4 sm:p-6 md:p-8 rounded-lg sm:rounded-xl shadow-md border-l-4 border-orange-500 transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                    
                    <div className="flex items-center mb-3 sm:mb-5">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-orange-100 flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                        <span className="text-orange-600 font-bold text-sm sm:text-base">1</span>
                      </div>
                      <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">Semua pengunjung atau pengguna Laboratorium FIT, DILARANG:</h3>
                    </div>
                    
                    <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm md:text-base text-gray-700 ml-1 sm:ml-2">
                      
                      <li className="flex items-start bg-orange-50 p-2 sm:p-3 rounded-md sm:rounded-lg">
                        <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-1.5 sm:mr-2 mt-0.5 text-[10px] sm:text-xs font-bold">a</span>
                        <span>Merokok atau melakukan <i>vaping</i></span>
                      </li>
                    <li className="flex items-start bg-orange-50 p-2 sm:p-3 rounded-md sm:rounded-lg">
                      <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-1.5 sm:mr-2 mt-0.5 text-[10px] sm:text-xs font-bold">b</span>
                      <span>Membuang sampah sembarangan dan mengotori area Laboratorium (Lab)</span>
                    </li>
                    <li className="flex items-start bg-orange-50 p-2 sm:p-3 rounded-md sm:rounded-lg">
                      <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-1.5 sm:mr-2 mt-0.5 text-[10px] sm:text-xs font-bold">c</span>
                      <span>Membawa makanan dan minuman ke dalam Laboratorium</span>
                    </li>
                    <li className="flex items-start bg-orange-50 p-2 sm:p-3 rounded-md sm:rounded-lg">
                      <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-1.5 sm:mr-2 mt-0.5 text-[10px] sm:text-xs font-bold">d</span>
                      <span>Makan atau minum dalam Laboratorium FIT tanpa se-izin Laboran (kecuali pengajar)</span>
                    </li>
                    <li className="flex items-start bg-orange-50 p-2 sm:p-3 rounded-md sm:rounded-lg">
                      <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-1.5 sm:mr-2 mt-0.5 text-[10px] sm:text-xs font-bold">e</span>
                      <span>Membuat keributan</span>
                    </li>
                    <li className="flex items-start bg-orange-50 p-2 sm:p-3 rounded-md sm:rounded-lg">
                      <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-1.5 sm:mr-2 mt-0.5 text-[10px] sm:text-xs font-bold">f</span>
                      <span>Melakukan perjudian dalam bentuk apapun</span>
                    </li>
                    <li className="flex items-start bg-orange-50 p-2 sm:p-3 rounded-md sm:rounded-lg sm:col-span-2">
                      <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-1.5 sm:mr-2 mt-0.5 text-[10px] sm:text-xs font-bold">g</span>
                      <span>Merusak (melakukan vandalisme) dan mengotori fasilitas (meja, kursi, papan tulis, pintu, tembok, komputer dan seluruh peralatan dalam Laboratorium)</span>
                    </li>
                    <li className="flex items-start bg-orange-50 p-2 sm:p-3 rounded-md sm:rounded-lg sm:col-span-2">
                      <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-1.5 sm:mr-2 mt-0.5 text-[10px] sm:text-xs font-bold">h</span>
                      <span>Melakukan kegiatan yang melanggar etika, moral, atau hukum yang berlaku</span>
                    </li>
                    <li className="flex items-start bg-orange-50 p-2 sm:p-3 rounded-md sm:rounded-lg">
                      <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-1.5 sm:mr-2 mt-0.5 text-[10px] sm:text-xs font-bold">i</span>
                      <span>Menciptakan atau menyebarkan virus komputer</span>
                    </li>
                    <li className="flex items-start bg-orange-50 p-2 sm:p-3 rounded-md sm:rounded-lg">
                      <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-1.5 sm:mr-2 mt-0.5 text-[10px] sm:text-xs font-bold">j</span>
                      <span>Melakukan <i>cracking</i> atau <i>hacking</i></span>
                    </li>
                    <li className="flex items-start bg-orange-50 p-2 sm:p-3 rounded-md sm:rounded-lg sm:col-span-2">
                      <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-1.5 sm:mr-2 mt-0.5 text-[10px] sm:text-xs font-bold">k</span>
                      <span>Menginstall atau menyimpan program dalam bentuk apapun ke dalam fasilitas yang ada di Laboratorium</span>
                    </li>
                    <li className="flex items-start bg-orange-50 p-2 sm:p-3 rounded-md sm:rounded-lg">
                      <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-1.5 sm:mr-2 mt-0.5 text-[10px] sm:text-xs font-bold">l</span>
                      <span>Mencuri fasilitas, peralatan, atau benda apapun yang merupakan milik Lab</span>
                    </li>
                    <li className="flex items-start bg-orange-50 p-3 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">m</span>
                      <span>Memainkan game dalam bentuk apapun dengan menggunakan fasilitas Lab</span>
                    </li>
                    <li className="flex items-start bg-orange-50 p-3 rounded-lg sm:col-span-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">n</span>
                      <span><i>Browsing</i> ke situs-situs yang melanggar etika atau berkaitan dengan pornografi atau kekerasan	</span>
                    </li>
                  </ul>
                </div>
                
                
                <div id="kewajiban" className="bg-white p-6 sm:p-8 rounded-xl shadow-md border-l-4 border-orange-500">
                  <div className="flex items-center mb-5">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-orange-600 font-bold">2</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Semua pengunjung atau pengguna Laboratorium FIT, WAJIB:</h3>
                  </div>
                  
                  <ul className="space-y-3 text-sm sm:text-base text-gray-700">
                    <li className="flex p-3 bg-orange-50 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">a</span>
                      <span>Mengenakan pakaian rapi dan sopan sesuai dengan peraturan berpenampilan yang dapat dilihat pada <a className="hover:underline font-bold hover:bg-orange-200 hover:rounded-sm px-1" href="#penampilan">poin 4</a></span>
                    </li>
                    <li className="flex p-3 bg-orange-50 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">b</span>
                      <span>Melakukan peminjaman melalui website FITBookLab. Prosedur peminjaman Laboratorium dapat dilihat pada <a className="hover:underline font-bold hover:bg-orange-200 hover:rounded-sm px-1" href="#prosedur">poin 3</a></span>
                    </li>
                    <li className="flex p-3 bg-orange-50 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">c</span>
                      <span>Mahasiswa FIT yang berada di area Lab wajib menjaga ketertiban Laboratorium</span>
                    </li>
                    <li className="flex p-3 bg-orange-50 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">d</span>
                      <span>Mahasiswa harus mengembalikan kembali posisi meja atau kursi jika Lab sudah selesai digunakan. Kondisi sebelum dan sesudah peminjaman harus rapi</span>
                    </li>
                    <li className="flex p-3 bg-orange-50 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">e</span>
                      <span>Bertanggung jawab atas barang pribadi yang di bawa ke Lab. Kehilangan di luar tanggung jawab pengajar atau PIC Lab/Laboran</span>
                    </li>
                  </ul>
                </div>
                
                
                <div id="prosedur" className="bg-white p-6 sm:p-8 rounded-xl shadow-md border-l-4 border-orange-500">
                  <div className="flex items-center mb-5">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-orange-600 font-bold">3</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Prosedur Peminjaman Laboratorium</h3>
                  </div>
                  
                  <ul className="space-y-3 text-sm sm:text-base text-gray-700">
                    <li className="flex p-3 bg-orange-50 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">a</span>
                      <span>Cek jadwal perkuliahan yang ditempel di pintu Lab dan pastikan tidak ada kelas</span>
                    </li>
                    <li className="flex p-3 bg-orange-50 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">b</span>
                      <span>Masuk ke website BookLab <a className="hover:underline font-bold hover:bg-orange-200 hover:rounded-sm px-1" href="https://www.fitbooklab.com">fitbooklab.com</a> atau pindai (scan) QR Code di pintu Lab. Lakukan pemesanan ruang Lab melalui Website. Ikuti langkah pemesanan yang tertera pada website</span>
                    </li>
                    <li className="flex p-3 bg-orange-50 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">c</span>
                      <span>Mahasiswa hanya dapat menggunakan Lab jika pemesanan melalui website BookLab telah disetujui</span>
                    </li>
                    <li className="flex p-3 bg-orange-50 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">d</span>
                      <span>Jika pemesanan sudah disetujui silahkan gunakan Lab dengan tertib dan tetap mematuhi semua Tata Tertib Penggunaan Laboratorium</span>
                    </li>
                    <li className="flex flex-col p-3 bg-orange-50 rounded-lg">
                      <div className="flex">
                        <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">e</span>
                        <span>Jika penggunaan Lab berlanjut hingga di luar jam kerja (07:00 – 16:00), ikuti prosedur berikut ini:</span>
                      </div>
                      
                      <ul className="mt-3 ml-7 space-y-3">
                        <li className="flex p-2 bg-orange-100/70 rounded-lg">
                          <span className="flex-shrink-0 w-5 h-5 bg-orange-400 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">i</span>
                          <span>Konfirmasi peminjaman ruang Lab di luar jam kerja dilakukan maksimal pukul 15:00 WIB di hari-H peminjaman kepada PIC Lab</span>
                        </li>
                        <li className="flex p-2 bg-orange-100/70 rounded-lg">
                          <span className="flex-shrink-0 w-5 h-5 bg-orange-400 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">ii</span>
                          <span>PIC Lab akan memberikan kunci Lab kepada PIC peminjam Lab. PIC bertanggung jawab penuh atas keamanan dan seluruh fasilitas Lab</span>
                        </li>
                        <li className="flex p-2 bg-orange-100/70 rounded-lg">
                          <span className="flex-shrink-0 w-5 h-5 bg-orange-400 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">iii</span>
                          <span>Matikan lampu, AC, dan semua peralatan elektronik setelah Lab digunakan</span>
                        </li>
                        <li className="flex p-2 bg-orange-100/70 rounded-lg">
                          <span className="flex-shrink-0 w-5 h-5 bg-orange-400 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">iv</span>
                          <span>Kunci kembali pintu Lab</span>
                        </li>
                        <li className="flex flex-col p-2 bg-orange-100/70 rounded-lg">
                          <div className="flex">
                            <span className="flex-shrink-0 w-5 h-5 bg-orange-400 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">v</span>
                            <span>Pengembalian kunci:</span>
                          </div>
                          
                          <ul className="ml-7 mt-2 space-y-2">
                            <li className="flex items-start p-2 bg-orange-100 rounded-lg">
                              <span className="flex-shrink-0 w-4 h-4 bg-orange-300 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">•</span>
                              <span>Jika kantor Fakultas masih buka, letakkan kunci di meja staf administrasi/office boy (OB) dan kirimkan bukti foto bahwa kunci telah dikembalikan ke PIC Lab</span>
                            </li>
                            <li className="flex items-start p-2 bg-orange-100 rounded-lg">
                              <span className="flex-shrink-0 w-4 h-4 bg-orange-300 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">•</span>
                              <span>Jika kantor Fakultas sudah tutup, titipkan kunci kepada staf Security Lobby Barat Gedung B (sebelah Pelita Shop) dan tulis di log book mereka, kemudian kirimkan bukti foto bahwa kunci telah dikembalikan ke PIC Lab</span>
                            </li>
                          </ul>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </div>
                
                
                <div id="penampilan" className="bg-white p-6 sm:p-8 rounded-xl shadow-md border-l-4 border-orange-500">
                  <div className="flex items-center mb-5">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-orange-600 font-bold">4</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Peraturan Berpenampilan di Laboratorium FIT</h3>
                  </div>
                  
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="flex items-center mb-3 font-semibold">
                        <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 text-xs font-bold">a</span>
                        <span className="text-orange-700">Atasan</span>
                      </h4>
                      <ul className="space-y-2 ml-7 text-sm sm:text-base text-gray-700">
                        <li className="flex items-start">
                          <span className="flex-shrink-0 w-4 h-4 bg-orange-300 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-[10px] font-bold">i</span>
                          <span>Menggunakan pakaian bebas dan wajib berlengan</span>
                        </li>
                        <li className="flex items-start">
                          <span className="flex-shrink-0 w-4 h-4 bg-orange-300 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-[10px] font-bold">ii</span>
                          <span>Nyaman saat digunakan dan tidak mengganggu aktivitas praktikum</span>
                        </li>
                        <li className="flex items-start">
                          <span className="flex-shrink-0 w-4 h-4 bg-orange-300 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-[10px] font-bold">iii</span>
                          <span>Dilarang menggunakan baju vulgar dan terbuka</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="flex items-center mb-3 font-semibold">
                        <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 text-xs font-bold">b</span>
                        <span className="text-orange-700">Bawahan</span>
                      </h4>
                      <ul className="space-y-2 ml-7 text-sm sm:text-base text-gray-700">
                        <li className="flex items-start">
                          <span className="flex-shrink-0 w-4 h-4 bg-orange-300 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-[10px] font-bold">i</span>
                          <span>Celana bahan kain panjang (menutup mata kaki) dan tidak ketat</span>
                        </li>
                        <li className="flex items-start">
                          <span className="flex-shrink-0 w-4 h-4 bg-orange-300 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-[10px] font-bold">ii</span>
                          <span>Celana berbahan jeans panjang (menutup mata kaki) tidak ketat dan tidak sobek-sobek</span>
                        </li>
                        <li className="flex items-start">
                          <span className="flex-shrink-0 w-4 h-4 bg-orange-300 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-[10px] font-bold">iii</span>
                          <span>Rok panjang (menutup lutut)</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="flex items-center mb-3 font-semibold">
                        <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 text-xs font-bold">c</span>
                        <span className="text-orange-700">Alas Kaki</span>
                      </h4>
                      <ul className="space-y-2 ml-7 text-sm sm:text-base text-gray-700">
                        <li className="flex items-start">
                          <span className="flex-shrink-0 w-4 h-4 bg-orange-300 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-[10px] font-bold">i</span>
                          <span>Wajib mengenakan sepatu yang menutup semua permukaan kaki</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-5 p-3 bg-gray-100 rounded-lg border border-gray-300 italic text-sm text-gray-700">
                  Segala bentuk pelanggaran terhadap tata tertib di atas akan dikenakan sanksi. Penentuan sanksi merupakan hak mutlak dari Kepala Laboratorium FIT dan juga PIC Lab yang bertugas
                </div>

                
                <div id="sanksi" className="bg-white p-6 sm:p-8 rounded-xl shadow-md border-l-4 border-orange-500">
                  <div className="flex items-center mb-5">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-orange-600 font-bold">5</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Sanksi Pelanggaran Tata Tertib Laboratorium FIT</h3>
                  </div>
                  
                  <ul className="space-y-4 text-sm sm:text-base text-gray-700">
                    <li className="p-4 bg-orange-50 rounded-lg">
                      <div className="flex items-start mb-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">a</span>
                        <span className="font-medium">Mahasiswa yang terbukti:</span>
                      </div>
                      
                      <ul className="ml-7 mb-3 space-y-2">
                        <li className="flex items-start">
                          <span className="flex-shrink-0 w-4 h-4 bg-orange-300 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-[10px] font-bold">i</span>
                          <span>Merokok atau melakukan <i>vaping</i></span>
                        </li>
                        <li className="flex items-start">
                          <span className="flex-shrink-0 w-4 h-4 bg-orange-300 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-[10px] font-bold">ii</span>
                          <span>Memakai sandal</span>
                        </li>
                        <li className="flex items-start">
                          <span className="flex-shrink-0 w-4 h-4 bg-orange-300 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-[10px] font-bold">iii</span>
                          <span>Melakukan praktek <i>hacking/cracking</i> di Lab</span>
                        </li>
                      </ul>
                      
                      <p className="ml-7 p-2 bg-orange-100 rounded-lg font-medium">
                        Akan dikenakan skorsing larangan masuk ke seluruh area Lab selama 1 bulan penuh
                      </p>
                    </li>
                    
                    <li className="flex items-start p-4 bg-orange-50 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">b</span>
                      <span>Pelanggran aturan Lab dikenakan skorsing larangan masuk ke seluruh area Lab selama 1 bulan penuh</span>
                    </li>
                    
                    <li className="p-4 bg-orange-50 rounded-lg">
                      <div className="flex items-start mb-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">c</span>
                        <span className="font-medium">Mahasiswa yang terbukti melakukan perusakan fasilitas atau peralatan di Lab:</span>
                      </div>
                      
                      <ul className="ml-7 space-y-2">
                        <li className="flex items-start p-2 bg-orange-100/70 rounded-lg">
                          <span className="flex-shrink-0 w-4 h-4 bg-orange-400 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-[10px] font-bold">i</span>
                          <span>Secara tidak sengaja : Wajib mengganti fasilitas atau peralatan yang rusak dengan yang baru</span>
                        </li>
                        <li className="flex items-start p-2 bg-orange-100/70 rounded-lg">
                          <span className="flex-shrink-0 w-4 h-4 bg-orange-400 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-[10px] font-bold">ii</span>
                          <span>Secara sengaja : Wajib mengganti seharga 2x harga fasilitas atau peralatan yang baru</span>
                        </li>
                      </ul>
                    </li>
                    
                    <li className="flex items-start p-4 bg-orange-50 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">d</span>
                      <span>Pelanggaran lain akan ditindak sesuai kebijakan Kepala Laboratorium FIT</span>
                    </li>
                  </ul>
                </div>
                
                
                <div id="kontak" className="bg-white p-6 sm:p-8 rounded-xl shadow-md border-l-4 border-orange-500">
                  <div className="flex items-center mb-5">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-orange-600 font-bold">6</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Nomor Kontak Penangung Jawab</h3>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="flex items-center text-orange-700 font-semibold mb-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 text-xs font-bold">a</span>
                        Lab B338
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">Jika memerlukan bantuan seputar peminjaman ruangan dan alat di dalam ruangan bersangkutan silahkan hubungi melalui kontak berikut:</p>
                      <ul className="space-y-1 text-sm text-gray-700 border-l-2 border-orange-200 pl-3">
                        <li className="flex items-center">
                          <span className="font-medium mr-2">Email:</span>
                        </li>
                        <li>
                          <a href="mailto:kelvin.wiriyatama@uph.edu" className="text-orange-600 hover:underline">kelvin.wiriyatama@uph.edu</a>
                        </li>
                        <li className="flex items-center">
                          <span className="font-medium mr-2">Nomor Telepon:</span>
                        </li>
                        <li>
                          <a href="tel:085155443290" className="text-orange-600 hover:underline">0851-5544-3290</a>
                          <span className="text-gray-500 ml-1">(Kelvin Wiriyatama)</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="flex items-center text-orange-700 font-semibold mb-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 text-xs font-bold">b</span>
                        Lab B357
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">Jika memerlukan bantuan seputar peminjaman ruangan dan alat di dalam ruangan bersangkutan silahkan hubungi melalui kontak berikut:</p>
                      <ul className="space-y-1 text-sm text-gray-700 border-l-2 border-orange-200 pl-3">
                        <li className="flex items-center">
                          <span className="font-medium mr-2">Email:</span>
                        </li>
                        <li className="flex items-center">
                          <a href="mailto:hery.fik@uph.edu" className="text-orange-600 hover:underline">hery.fik@uph.edu</a>
                        </li>
                        <li className="flex items-center">
                          <span className="font-medium mr-2">Nomor Telepon:</span>
                        </li>
                        <li className="flex items-center">
                          <a href="tel:087775737824" className="text-orange-600 hover:underline">0877-7573-7824</a>
                          <span className="text-gray-500 ml-1">(Hery)</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="flex items-center text-orange-700 font-semibold mb-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 text-xs font-bold">c</span>
                        Paddock P208
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">Jika memerlukan bantuan seputar peminjaman ruangan dan alat di dalam ruangan bersangkutan silahkan hubungi PIC melalui kontak berikut:</p>
                      <ul className="space-y-1 text-sm text-gray-700 border-l-2 border-orange-200 pl-3">
                        <li className="flex items-center">
                          <span className="font-medium mr-2">Email:</span>
                        </li>
                        <li>
                          <a href="mailto:kusno.prasetya@uph.edu" className="text-orange-600 hover:underline">kusno.prasetya@uph.edu</a>
                        </li>
                        <li className="flex items-center">
                          <span className="font-medium mr-2">Nomor Telepon:</span>
                        </li>
                        <li className="flex items-center">
                          <a href="tel:0856055028999" className="text-orange-600 hover:underline">08560-5502-8999</a>
                          <span className="text-gray-500 ml-1">(Kusno Prasetya)</span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="flex items-center text-orange-700 font-semibold mb-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 text-xs font-bold">d</span>
                        Lab Gedung F205 dan F209-210
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">Jika memerlukan bantuan seputar peminjaman ruangan dan alat di dalam ruangan bersangkutan silahkan hubungi PIC melalui kontak berikut:</p>
                      <ul className="space-y-1 text-sm text-gray-700 border-l-2 border-orange-200 pl-3">
                        <li className="flex items-center">
                          <span className="font-medium mr-2">Email:</span>
                        </li>
                        <li>
                          <a href="mailto:ricky.purba@uph.edu" className="text-orange-600 hover:underline">ricky.purba@uph.edu</a>
                        </li>
                        <li className="flex items-center">
                          <span className="font-medium mr-2">Nomor Telepon:</span>
                        </li>
                        <li className="flex items-center">
                          <a href="tel:085974556230" className="text-orange-600 hover:underline">0859-7455-6230</a>
                          <span className="text-gray-500 ml-1">(Ricky Ricardo Purba)</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="flex items-center text-orange-700 font-semibold mb-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 text-xs font-bold">e</span>
                        Laboran
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">Jika memerlukan bantuan teknis tentang peralatan lab yang tidak bisa ditangani oleh PIC silahkan hubungi Laboran melalui kontak berikut:</p>
                      <ul className="space-y-1 text-sm text-gray-700 border-l-2 border-orange-200 pl-3">
                        <li className="flex items-center">
                          <span className="font-medium mr-2">Email:</span>
                        </li>
                        <li>
                          <a href="mailto:ricky.purba@uph.edu" className="text-orange-600 hover:underline">ricky.purba@uph.edu</a>
                        </li>
                        <li className="flex items-center">
                          <span className="font-medium mr-2">Nomor Telepon:</span>
                        </li>
                        <li>
                          <a href="tel:085974556230" className="text-orange-600 hover:underline">0859-7455-6230</a>
                          <span className="text-gray-500 ml-1">(Ricky Ricardo Purba)</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="flex items-center text-orange-700 font-semibold mb-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center mr-2 text-xs font-bold">f</span>
                        Kepala Lab
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">Jika ada masalah yang barikaitan dengan laboratorium dan bertingkat fakultas silahkan hubungi:</p>
                      <ul className="space-y-1 text-sm text-gray-700 border-l-2 border-orange-200 pl-3">
                        <li className="flex items-center">
                          <span className="font-medium mr-2">Email:</span>                          
                        </li>
                        <li>
                          <a href="mailto:aditya.mitra@uph.edu" className="text-orange-600 hover:underline">aditya.mitra@uph.edu</a>
                        </li>
                        <li className="flex items-center">
                          <span className="font-medium mr-2">Nomor Telepon:</span>
                        </li>
                        <li>
                          <a href="tel:08174822825" className="text-orange-600 hover:underline">0817-4822-825</a>
                          <span className="text-gray-500 ml-1">(Aditya Rama Mitra)</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              </StaggeredAnimationContainer>
            </div>
          </div>
        </section>
        

        {/* Footer/Contact Section */}
        <section id="contact" className="py-16 sm:py-24 bg-gradient-to-br from-gray-100 via-orange-50/30 to-blue-50/30 relative overflow-hidden">
          {/* Enhanced Background Decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-100/15 via-transparent to-blue-100/15" />
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-pink-100/10 via-transparent to-purple-100/10" />
            <div className="absolute -top-20 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-200/12 to-amber-200/10 rounded-full blur-3xl animate-float" />
            <div className="absolute -bottom-20 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-blue-200/12 to-cyan-200/10 rounded-full blur-3xl" style={{ animationDelay: '2s' }} />
            <div className="absolute top-1/2 right-1/3 w-[400px] h-[400px] bg-gradient-to-br from-purple-200/10 to-pink-200/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          </div>
          {/* Pattern Overlay */}
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(249, 115, 22, 0.3) 1px, transparent 0)`,
              backgroundSize: '50px 50px'
            }} />
          </div>
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="bg-transparent p-6 sm:p-8 rounded-x overflow-hidden">
                <div className="flex flex-col items-center justify-center mb-6">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-r from-orange-100 to-blue-100 border-2 border-orange-200 flex items-center justify-center overflow-hidden mb-4">
                    <img src="/favicon.ico" alt="FIT Logo" className="w-14 h-14 sm:w-16 sm:h-16" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800">Faculty of Information Technology</h3>
                    <p className="text-sm sm:text-base text-gray-600">Universitas Pelita Harapan</p>
                    
                    
                    <div className="mt-3 flex items-center justify-center space-x-4">
                      <a href="https://www.uph.edu/faculty/faculty-of-information-technology/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
                        </svg>
                      </a>
                      <a href="https://instagram.com/uphilmukomputer" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700 transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
                
                <div className="relative mt-6 p-5 bg-gradient-to-r from-orange-50 to-blue-50 rounded-lg border border-orange-200">
                  <p className="text-sm sm:text-base text-gray-700 italic">
                    "For from him and through him and for him are all things. To him be the glory forever! Amen."
                  </p>
                  <p className="text-xs text-left mb-3 text-gray-500">Romans 11:36</p>
                  <p className="text-xs text-gray-600 mt-3">
                    Developed with purpose to serve and glorify God.
                  </p>
                </div>
                
                <div className="mt-6 text-center text-lg text-gray-500">
                  <p>Developed by Teofilus Insani, Informatics 2023</p>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-gray-500 order-2 sm:order-1">
                      © 2025 BookLab - Faculty of Information Technology, Universitas Pelita Harapan
                    </p>
                    <div className="flex items-center space-x-2 order-1 sm:order-2">
                      <img src="/favicon.ico" alt="FIT Logo" className="w-6.5 h-6.5" />
                      <div className="flex flex-col">                      
                      <span className={`text-sm font-black leading-none transition-colors duration-200 text-orange-500`}>
                          Book
                        </span>
                        <span className={"text-sm font-black leading-none transition-colors duration-200 text-orange-500"}>
                          Lab
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      
      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        @keyframes floatPhone {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-15px);
          }
        }
        
        .animate-floatPhone {
          animation: floatPhone 4s ease-in-out infinite;
        }
        
        @keyframes float3d {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          25% {
            transform: translateY(-8px) translateX(4px);
          }
          50% {
            transform: translateY(-12px) translateX(-2px);
          }
          75% {
            transform: translateY(-6px) translateX(-4px);
          }
        }
        
        .animate-float3d {
          animation: float3d 8s ease-in-out infinite;
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
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out forwards;
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(100px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out forwards;
        }
        
        @keyframes scroll {
          0% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(8px);
          }
        }
        
        .animate-scroll {
          animation: scroll 1.5s ease-in-out infinite;
        }
        
        @keyframes bounceArrow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(4px);
          }
        }
        
        .animate-bounceArrow {
          animation: bounceArrow 2s ease-in-out infinite;
        }
        
        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }
        
        /* Performance optimizations */
        .transition-all {
          will-change: transform, opacity;
        }
      `}</style>
    </div>
  );
}

