import Head from "next/head";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Home as HomeIcon, BookOpen, Users, Calendar, FileText, Phone, Menu, X, Layers, Timer, Info, ChevronDown, ArrowRight, Mail, Wrench } from "lucide-react";
import React from "react";
import { RENOVATION_ROOM_LABEL } from "~/lib/renovation";

const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [ref, setRef] = useState<Element | null>(null);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry?.isIntersecting ?? false);
    }, {
      threshold: 0.01,
      rootMargin: '50px 0px 0px 0px',
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
  delay?: number;
}> = ({ children, className = "", delay = 0 }) => {
  const [ref, isIntersecting] = useIntersectionObserver();
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    if (isIntersecting) setHasShown(true);
  }, [isIntersecting]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${hasShown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export default function Home() {
  // Show the renovation notice on every page load.
  const [showNoticeModal, setShowNoticeModal] = useState(true);
  const [activeSection, setActiveSection] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openRuleSection, setOpenRuleSection] = useState<string | null>(null);

  const handleCloseNotice = () => {
    setShowNoticeModal(false);
  };

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

  const toggleRuleSection = (id: string) => {
    setOpenRuleSection(openRuleSection === id ? null : id);
  };

  return (
    <div className="relative bg-white">
      <Head>
        <title>BookLab | FAIDAS Lab Booking</title>
        <meta name="description" content="UPH Lab Room Booking Portal" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      {showNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] animate-[noticeFade_0.2s_ease-out]"
            onClick={handleCloseNotice}
          />
          <div
            role="dialog"
            aria-live="polite"
            aria-modal="true"
            aria-labelledby="renovation-notice-title"
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-xl animate-[noticeIn_0.25s_ease-out] sm:p-7"
          >
            <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.3em] text-orange-600">
              Pemberitahuan
            </p>
            <h2
              id="renovation-notice-title"
              className="mt-2 text-xl font-medium text-gray-900"
            > 
              Ruangan sedang direnovasi
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-gray-600">
              Ruangan{' '}
              <span className="font-medium text-gray-900">
                {RENOVATION_ROOM_LABEL}
              </span>{' '}
              sedang dalam masa renovasi dan untuk sementara tidak dapat digunakan.
              Mohon pilih ruangan lain untuk peminjaman.
            </p>

            <button
              type="button"
              onClick={handleCloseNotice}
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:cursor-pointer hover:bg-orange-700"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* Side Navigation - Desktop */}
      <nav className="hidden lg:block fixed top-1/2 right-6 transform -translate-y-1/2 z-40">
        <div className="rounded-full border border-gray-200 bg-white py-3 px-1.5 shadow-sm">
          <div className="flex flex-col space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`group relative p-2.5 rounded-full transition-all duration-200 ${
                  activeSection === item.id
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-700 hover:text-gray-600 hover:bg-gray-50'
                }`}
                title={item.label}
              >
                {item.icon}
                <span className="absolute right-full mr-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
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
        className="lg:hidden fixed bottom-6 right-6 z-50 bg-orange-600 text-white p-3.5 rounded-full shadow-md transition-colors duration-200 hover:bg-orange-700 active:scale-95"
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute bottom-24 left-4 right-4 bg-white rounded-2xl shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 px-1">Navigation</p>
            <div className="flex flex-col space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    activeSection === item.id
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className={activeSection === item.id ? 'text-orange-500' : 'text-gray-400'}>{item.icon}</span>
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== HERO SECTION ==================== */}
      <section id="home" className="relative flex min-h-screen items-center overflow-hidden" style={{ background: 'linear-gradient(155deg, #fb923c 0%, #ea580c 52%, #c2410c 100%)' }}>
        <div className="pointer-events-none absolute -top-28 -right-24 h-[460px] w-[460px] rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-[420px] w-[420px] rounded-full bg-orange-900/20 blur-3xl" />

        <div className="container relative z-10 mx-auto px-5 py-24 sm:px-10 sm:py-28 lg:px-16">
          <div className="max-w-2xl">
            <AnimatedSection delay={80}>
              <h1 className="mt-6 text-4xl font-medium leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Book your lab,<br />
                <span className="text-white/80">in a few clicks.</span>
              </h1>
            </AnimatedSection>

            <AnimatedSection delay={160}>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
                Sistem reservasi laboratorium FAIDAS UPH. Pesan ruangan, pantau status booking, dan selesaikan peminjaman
              </p>
            </AnimatedSection>

            <AnimatedSection delay={240}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  className="h-12 w-full cursor-pointer rounded-lg bg-white px-7 text-sm font-medium text-orange-600 shadow-sm transition-colors hover:bg-orange-50 sm:w-auto"
                  onClick={() => window.location.href = '/book-room'}
                >
                  Book a Lab Now
                </Button>
                <Button
                  variant="outline"
                  className="h-12 w-full cursor-pointer rounded-lg border border-white/40 bg-transparent px-7 text-sm font-medium text-white transition-colors hover:bg-white/10 hover:text-white sm:w-auto"
                  onClick={() => window.location.href = '/booking-calendar'}
                >
                  View Calendar
                </Button>
              </div>
            </AnimatedSection>
          </div>
        </div>

        <button
          onClick={() => scrollToSection('about')}
          className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 text-white/60 transition-colors hover:cursor-pointer hover:text-white"
        >
          <span className="text-[10px] font-medium uppercase tracking-widest">Scroll</span>
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </button>
      </section>

      {/* ==================== ABOUT SECTION ==================== */}
      <section id="about" className="relative border-t border-gray-100 py-20 sm:py-28">
        {/* Accent line */}
        {/* Orbs */}

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <AnimatedSection>
              <div className="mb-16">
                <p className="text-xs font-medium text-orange-600 uppercase tracking-widest mb-3">About Us</p>
                <h2 className="text-3xl sm:text-4xl font-medium text-gray-900 mb-4">
                  About FAIDAS BookLab
                </h2>
                <p className="text-base sm:text-lg text-gray-600 mx-auto leading-relaxed">
                  BookLab adalah sistem booking laboratorium FAIDAS (Faculty of Artificial Intelligence and Data Science) UPH yang memungkinkan mahasiswa dan dosen untuk mereservasi ruang laboratorium dengan mudah dan efisien.
                </p>
              </div>
            </AnimatedSection>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  title: "Easy Booking",
                  description: "Sistem booking yang user-friendly dengan calendar yang intuitif"
                },
                {
                  title: "Real-time Updates",
                  description: "Informasi ketersediaan lab yang selalu update secara real-time"
                },
                {
                  title: "Multiple Labs",
                  description: "Akses ke berbagai laboratorium dengan spesifikasi yang berbeda"
                }
              ].map((feature, index) => (
                <AnimatedSection key={index} delay={index * 100}>
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                    <div className="relative">
                      <h3 className="text-base font-medium text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== HOW TO USE SECTION ==================== */}
      <section id="how-to-use" className="relative border-t border-gray-100 py-20 sm:py-28">
        {/* Accent line */}
        {/* Orbs */}

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <AnimatedSection>
              <div className="text-center mb-14">
                <p className="text-xs font-medium text-orange-600 uppercase tracking-widest mb-3">How It Works</p>
                <h2 className="text-3xl sm:text-4xl font-medium text-gray-900 mb-4">
                  Cara Menggunakan BookLab
                </h2>
                <p className="text-base sm:text-lg text-gray-600">
                  Ikuti 6 langkah mudah untuk melakukan booking laboratorium
                </p>
              </div>
            </AnimatedSection>

            <div className="relative space-y-4">
              {/* Vertical connecting line */}
              <div className="absolute left-[31px] sm:left-[33px] top-6 bottom-6 w-[2px] bg-gray-200 rounded-full" />
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
                <AnimatedSection key={step.number} delay={step.number * 80}>
                  <div className="relative flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-600 text-sm font-medium text-white">
                      {step.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-1">{step.title}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>

            <AnimatedSection delay={600} className="mt-10 text-center">
              <Button
                className="w-full cursor-pointer rounded-md bg-orange-600 px-8 py-4 text-sm font-medium text-white transition-colors hover:bg-orange-700 sm:w-auto sm:py-5 sm:text-base"
                onClick={() => window.location.href = '/book-room'}>
                Start Booking Now
              </Button>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ==================== RULES SECTION ==================== */}
      <section id="rules" className="relative border-t border-gray-100 py-20 sm:py-28">
        {/* Accent line */}
        {/* Orbs */}

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <AnimatedSection>
              <div className="text-center mb-8">
                <p className="text-xs font-medium text-orange-600 uppercase tracking-widest mb-3">Rules & Regulations</p>
                <h2 className="text-3xl sm:text-4xl font-medium text-gray-900">
                  Tata Tertib Penggunaan Laboratorium FAIDAS
                </h2>
              </div>
            </AnimatedSection>

            {/* Accordion-style Rules */}
            <div className="space-y-3">

              {/* 1. Larangan */}
              <AnimatedSection delay={100}>
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <button
                    onClick={() => toggleRuleSection('larangan')}
                    className="flex w-full cursor-pointer items-center justify-between p-5 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-600 text-xs font-medium text-white">1</span>
                      <span className="font-medium text-gray-900 text-sm sm:text-base">Larangan di Laboratorium FAIDAS</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openRuleSection === 'larangan' ? 'rotate-180' : ''}`} />
                  </button>
                  {openRuleSection === 'larangan' && (
                    <div className="px-5 pb-5 border-t border-gray-50">
                      <p className="text-sm text-gray-600 font-medium mt-4 mb-3">Semua pengunjung atau pengguna Laboratorium FAIDAS, DILARANG:</p>
                      <div className="space-y-2">
                        {[
                          { letter: "a", text: <>Merokok atau melakukan <i>vaping</i></> },
                          { letter: "b", text: "Membuang sampah sembarangan dan mengotori area Laboratorium (Lab)" },
                          { letter: "c", text: "Membawa makanan dan minuman ke dalam Laboratorium" },
                          { letter: "d", text: "Makan atau minum dalam Laboratorium FAIDAS tanpa se-izin Laboran (kecuali pengajar)" },
                          { letter: "e", text: "Membuat keributan" },
                          { letter: "f", text: "Melakukan perjudian dalam bentuk apapun" },
                          { letter: "g", text: "Merusak (melakukan vandalisme) dan mengotori fasilitas (meja, kursi, papan tulis, pintu, tembok, komputer dan seluruh peralatan dalam Laboratorium)" },
                          { letter: "h", text: "Melakukan kegiatan yang melanggar etika, moral, atau hukum yang berlaku" },
                          { letter: "i", text: "Menciptakan atau menyebarkan virus komputer" },
                          { letter: "j", text: <>Melakukan <i>cracking</i> atau <i>hacking</i></> },
                          { letter: "k", text: "Menginstall atau menyimpan program dalam bentuk apapun ke dalam fasilitas yang ada di Laboratorium" },
                          { letter: "l", text: "Mencuri fasilitas, peralatan, atau benda apapun yang merupakan milik Lab" },
                          { letter: "m", text: "Memainkan game dalam bentuk apapun dengan menggunakan fasilitas Lab" },
                          { letter: "n", text: <><i>Browsing</i> ke situs-situs yang melanggar etika atau berkaitan dengan pornografi atau kekerasan</> },
                        ].map((item) => (
                          <div key={item.letter} className="flex items-start gap-2.5 text-sm text-gray-600 py-1.5 px-3 rounded-lg bg-gray-50">
                            <span className="text-orange-500 font-medium text-xs mt-0.5 w-4 flex-shrink-0">{item.letter}.</span>
                            <span>{item.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AnimatedSection>

              {/* 2. Kewajiban */}
              <AnimatedSection delay={150}>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <button
                    onClick={() => toggleRuleSection('kewajiban')}
                    className="flex w-full cursor-pointer items-center justify-between p-5 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-600 text-xs font-medium text-white">2</span>
                      <span className="font-medium text-gray-900 text-sm sm:text-base">Kewajiban Pengguna Laboratorium</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openRuleSection === 'kewajiban' ? 'rotate-180' : ''}`} />
                  </button>
                  {openRuleSection === 'kewajiban' && (
                    <div className="px-5 pb-5 border-t border-gray-50">
                      <p className="text-sm text-gray-600 font-medium mt-4 mb-3">Semua pengunjung atau pengguna Laboratorium FAIDAS, WAJIB:</p>
                      <div className="space-y-2">
                        {[
                          { letter: "a", text: <>Mengenakan pakaian rapi dan sopan sesuai dengan peraturan berpenampilan yang dapat dilihat pada <button className="text-orange-500 hover:underline font-medium" onClick={() => setOpenRuleSection('penampilan')}>poin 4</button></> },
                          { letter: "b", text: <>Melakukan peminjaman melalui website FAIDASBookLab. Prosedur peminjaman Laboratorium dapat dilihat pada <button className="text-orange-500 hover:underline font-medium" onClick={() => setOpenRuleSection('prosedur')}>poin 3</button></> },
                          { letter: "c", text: "Mahasiswa FAIDAS yang berada di area Lab wajib menjaga ketertiban Laboratorium" },
                          { letter: "d", text: "Mahasiswa harus mengembalikan kembali posisi meja atau kursi jika Lab sudah selesai digunakan. Kondisi sebelum dan sesudah peminjaman harus rapi" },
                          { letter: "e", text: "Bertanggung jawab atas barang pribadi yang di bawa ke Lab. Kehilangan di luar tanggung jawab pengajar atau PIC Lab/Laboran" },
                        ].map((item) => (
                          <div key={item.letter} className="flex items-start gap-2.5 text-sm text-gray-600 py-1.5 px-3 rounded-lg bg-gray-50">
                            <span className="text-orange-500 font-medium text-xs mt-0.5 w-4 flex-shrink-0">{item.letter}.</span>
                            <span>{item.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AnimatedSection>

              {/* 3. Prosedur */}
              <AnimatedSection delay={200}>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <button
                    onClick={() => toggleRuleSection('prosedur')}
                    className="flex w-full cursor-pointer items-center justify-between p-5 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-600 text-xs font-medium text-white">3</span>
                      <span className="font-medium text-gray-900 text-sm sm:text-base">Prosedur Peminjaman Laboratorium</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openRuleSection === 'prosedur' ? 'rotate-180' : ''}`} />
                  </button>
                  {openRuleSection === 'prosedur' && (
                    <div className="px-5 pb-5 border-t border-gray-50">
                      <div className="space-y-2 mt-4">
                        {[
                          { letter: "a", text: "Cek jadwal perkuliahan yang ditempel di pintu Lab dan pastikan tidak ada kelas" },
                          { letter: "b", text: <>Masuk ke website BookLab <a className="text-orange-500 hover:underline font-medium" href="https://www.book.uphfaidas.com">book.uphfaidas.com</a> atau pindai (scan) QR Code di pintu Lab. Lakukan pemesanan ruang Lab melalui Website. Ikuti langkah pemesanan yang tertera pada website</> },
                          { letter: "c", text: "Mahasiswa hanya dapat menggunakan Lab jika pemesanan melalui website BookLab telah disetujui" },
                          { letter: "d", text: "Jika pemesanan sudah disetujui silahkan gunakan Lab dengan tertib dan tetap mematuhi semua Tata Tertib Penggunaan Laboratorium" },
                        ].map((item) => (
                          <div key={item.letter} className="flex items-start gap-2.5 text-sm text-gray-600 py-1.5 px-3 rounded-lg bg-gray-50">
                            <span className="text-orange-500 font-medium text-xs mt-0.5 w-4 flex-shrink-0">{item.letter}.</span>
                            <span>{item.text}</span>
                          </div>
                        ))}

                        {/* Sub-point e with nested items */}
                        <div className="text-sm text-gray-600 py-1.5 px-3 rounded-lg bg-gray-50">
                          <div className="flex items-start gap-2.5">
                            <span className="text-orange-500 font-medium text-xs mt-0.5 w-4 flex-shrink-0">e.</span>
                            <span>Jika penggunaan Lab berlanjut hingga di luar jam kerja (07:00 – 16:00), ikuti prosedur berikut ini:</span>
                          </div>
                          <div className="ml-6 mt-2 space-y-1.5">
                            {[
                              { n: "i", text: "Konfirmasi peminjaman ruang Lab di luar jam kerja dilakukan maksimal pukul 15:00 WIB di hari-H peminjaman kepada PIC Lab" },
                              { n: "ii", text: "PIC Lab akan memberikan kunci Lab kepada PIC peminjam Lab. PIC bertanggung jawab penuh atas keamanan dan seluruh fasilitas Lab" },
                              { n: "iii", text: "Matikan lampu, AC, dan semua peralatan elektronik setelah Lab digunakan" },
                              { n: "iv", text: "Kunci kembali pintu Lab" },
                            ].map((sub) => (
                              <div key={sub.n} className="flex items-start gap-2 text-sm py-1 px-2 rounded bg-white">
                                <span className="text-orange-400 font-medium text-xs mt-0.5 w-4 flex-shrink-0">{sub.n}.</span>
                                <span>{sub.text}</span>
                              </div>
                            ))}
                            <div className="text-sm py-1 px-2 rounded bg-white">
                              <div className="flex items-start gap-2">
                                <span className="text-orange-400 font-medium text-xs mt-0.5 w-4 flex-shrink-0">v.</span>
                                <span>Pengembalian kunci:</span>
                              </div>
                              <div className="ml-6 mt-1.5 space-y-1.5">
                                <div className="flex items-start gap-2 text-sm py-1 px-2 rounded bg-gray-50">
                                  <span className="text-gray-400 mt-1">•</span>
                                  <span>Jika kantor Fakultas masih buka, letakkan kunci di meja staf administrasi/office boy (OB) dan kirimkan bukti foto bahwa kunci telah dikembalikan ke PIC Lab</span>
                                </div>
                                <div className="flex items-start gap-2 text-sm py-1 px-2 rounded bg-gray-50">
                                  <span className="text-gray-400 mt-1">•</span>
                                  <span>Jika kantor Fakultas sudah tutup, titipkan kunci kepada staf Security Lobby Barat Gedung B (sebelah Pelita Shop) dan tulis di log book mereka, kemudian kirimkan bukti foto bahwa kunci telah dikembalikan ke PIC Lab</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </AnimatedSection>

              {/* 4. Penampilan */}
              <AnimatedSection delay={250}>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <button
                    onClick={() => toggleRuleSection('penampilan')}
                    className="flex w-full cursor-pointer items-center justify-between p-5 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-600 text-xs font-medium text-white">4</span>
                      <span className="font-medium text-gray-900 text-sm sm:text-base">Peraturan Berpenampilan</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openRuleSection === 'penampilan' ? 'rotate-180' : ''}`} />
                  </button>
                  {openRuleSection === 'penampilan' && (
                    <div className="px-5 pb-5 border-t border-gray-50">
                      <div className="grid sm:grid-cols-3 gap-4 mt-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2.5">a. Atasan</h4>
                          <ul className="space-y-1.5 text-xs sm:text-sm text-gray-600">
                            <li className="flex items-start gap-1.5"><span className="text-orange-400 mt-0.5">i.</span> Menggunakan pakaian bebas dan wajib berlengan</li>
                            <li className="flex items-start gap-1.5"><span className="text-orange-400 mt-0.5">ii.</span> Nyaman saat digunakan dan tidak mengganggu aktivitas praktikum</li>
                            <li className="flex items-start gap-1.5"><span className="text-orange-400 mt-0.5">iii.</span> Dilarang menggunakan baju vulgar dan terbuka</li>
                          </ul>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2.5">b. Bawahan</h4>
                          <ul className="space-y-1.5 text-xs sm:text-sm text-gray-600">
                            <li className="flex items-start gap-1.5"><span className="text-orange-400 mt-0.5">i.</span> Celana bahan kain panjang (menutup mata kaki) dan tidak ketat</li>
                            <li className="flex items-start gap-1.5"><span className="text-orange-400 mt-0.5">ii.</span> Celana berbahan jeans panjang (menutup mata kaki) tidak ketat dan tidak sobek-sobek</li>
                            <li className="flex items-start gap-1.5"><span className="text-orange-400 mt-0.5">iii.</span> Rok panjang (menutup lutut)</li>
                          </ul>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2.5">c. Alas Kaki</h4>
                          <ul className="space-y-1.5 text-xs sm:text-sm text-gray-600">
                            <li className="flex items-start gap-1.5"><span className="text-orange-400 mt-0.5">i.</span> Wajib mengenakan sepatu yang menutup semua permukaan kaki</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </AnimatedSection>

              {/* Disclaimer */}
              <AnimatedSection delay={275}>
                <div className="px-4 py-3 bg-orange-50/80 rounded-lg border border-orange-200/50 text-xs sm:text-sm text-orange-800/70 italic">
                  Segala bentuk pelanggaran terhadap tata tertib di atas akan dikenakan sanksi. Penentuan sanksi merupakan hak mutlak dari Kepala Laboratorium FAIDAS dan juga PIC Lab yang bertugas
                </div>
              </AnimatedSection>

              {/* 5. Sanksi */}
              <AnimatedSection delay={300}>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <button
                    onClick={() => toggleRuleSection('sanksi')}
                    className="flex w-full cursor-pointer items-center justify-between p-5 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-600 text-xs font-medium text-white">5</span>
                      <span className="font-medium text-gray-900 text-sm sm:text-base">Sanksi Pelanggaran</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openRuleSection === 'sanksi' ? 'rotate-180' : ''}`} />
                  </button>
                  {openRuleSection === 'sanksi' && (
                    <div className="px-5 pb-5 border-t border-gray-50">
                      <div className="space-y-3 mt-4">
                        <div className="text-sm text-gray-600 py-2 px-3 rounded-lg bg-gray-50">
                          <div className="flex items-start gap-2.5 mb-2">
                            <span className="text-orange-500 font-medium text-xs mt-0.5 w-4 flex-shrink-0">a.</span>
                            <span className="font-medium">Mahasiswa yang terbukti:</span>
                          </div>
                          <div className="ml-6 space-y-1">
                            <div className="flex items-start gap-2 py-1 px-2 rounded bg-white text-sm">
                              <span className="text-orange-400 text-xs mt-0.5">i.</span>
                              <span>Merokok atau melakukan <i>vaping</i></span>
                            </div>
                            <div className="flex items-start gap-2 py-1 px-2 rounded bg-white text-sm">
                              <span className="text-orange-400 text-xs mt-0.5">ii.</span>
                              <span>Memakai sandal</span>
                            </div>
                            <div className="flex items-start gap-2 py-1 px-2 rounded bg-white text-sm">
                              <span className="text-orange-400 text-xs mt-0.5">iii.</span>
                              <span>Melakukan praktek <i>hacking/cracking</i> di Lab</span>
                            </div>
                          </div>
                          <p className="ml-6 mt-2 text-sm font-medium text-gray-700 bg-orange-50 px-3 py-2 rounded">
                            Akan dikenakan skorsing larangan masuk ke seluruh area Lab selama 1 bulan penuh
                          </p>
                        </div>

                        <div className="flex items-start gap-2.5 text-sm text-gray-600 py-1.5 px-3 rounded-lg bg-gray-50">
                          <span className="text-orange-500 font-medium text-xs mt-0.5 w-4 flex-shrink-0">b.</span>
                          <span>Pelanggran aturan Lab dikenakan skorsing larangan masuk ke seluruh area Lab selama 1 bulan penuh</span>
                        </div>

                        <div className="text-sm text-gray-600 py-2 px-3 rounded-lg bg-gray-50">
                          <div className="flex items-start gap-2.5 mb-2">
                            <span className="text-orange-500 font-medium text-xs mt-0.5 w-4 flex-shrink-0">c.</span>
                            <span className="font-medium">Mahasiswa yang terbukti melakukan perusakan fasilitas atau peralatan di Lab:</span>
                          </div>
                          <div className="ml-6 space-y-1">
                            <div className="flex items-start gap-2 py-1 px-2 rounded bg-white text-sm">
                              <span className="text-orange-400 text-xs mt-0.5">i.</span>
                              <span>Secara tidak sengaja : Wajib mengganti fasilitas atau peralatan yang rusak dengan yang baru</span>
                            </div>
                            <div className="flex items-start gap-2 py-1 px-2 rounded bg-white text-sm">
                              <span className="text-orange-400 text-xs mt-0.5">ii.</span>
                              <span>Secara sengaja : Wajib mengganti seharga 2x harga fasilitas atau peralatan yang baru</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5 text-sm text-gray-600 py-1.5 px-3 rounded-lg bg-gray-50">
                          <span className="text-orange-500 font-medium text-xs mt-0.5 w-4 flex-shrink-0">d.</span>
                          <span>Pelanggaran lain akan ditindak sesuai kebijakan Kepala Laboratorium FAIDAS</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </AnimatedSection>

              {/* 6. Kontak */}
              <AnimatedSection delay={350}>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <button
                    onClick={() => toggleRuleSection('kontak')}
                    className="flex w-full cursor-pointer items-center justify-between p-5 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-600 text-xs font-medium text-white">6</span>
                      <span className="font-medium text-gray-900 text-sm sm:text-base">Nomor Kontak Penanggung Jawab</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openRuleSection === 'kontak' ? 'rotate-180' : ''}`} />
                  </button>
                  {openRuleSection === 'kontak' && (
                    <div className="px-5 pb-5 border-t border-gray-50">
                      <div className="grid sm:grid-cols-2 gap-3 mt-4">
                        {[
                          {
                            letter: "a",
                            lab: "Lab B338",
                            desc: "Jika memerlukan bantuan seputar peminjaman ruangan dan alat di dalam ruangan bersangkutan silahkan hubungi melalui kontak berikut:",
                            email: "kelvin.wiriyatama@uph.edu",
                            phone: "0851-5544-3290",
                            phoneRaw: "085155443290",
                            name: "Kelvin Wiriyatama"
                          },
                          {
                            letter: "b",
                            lab: "Lab B357",
                            desc: "Jika memerlukan bantuan seputar peminjaman ruangan dan alat di dalam ruangan bersangkutan silahkan hubungi melalui kontak berikut:",
                            email: "hery.fik@uph.edu",
                            phone: "0877-7573-7824",
                            phoneRaw: "087775737824",
                            name: "Hery"
                          },
                          {
                            letter: "c",
                            lab: "Paddock P208",
                            desc: "Jika memerlukan bantuan seputar peminjaman ruangan dan alat di dalam ruangan bersangkutan silahkan hubungi PIC melalui kontak berikut:",
                            email: "kusno.prasetya@uph.edu",
                            phone: "08560-5502-8999",
                            phoneRaw: "0856055028999",
                            name: "Kusno Prasetya"
                          },
                          {
                            letter: "d",
                            lab: "Lab Gedung F205 dan F209-210",
                            desc: "Jika memerlukan bantuan seputar peminjaman ruangan dan alat di dalam ruangan bersangkutan silahkan hubungi PIC melalui kontak berikut:",
                            email: "ricky.purba@uph.edu",
                            phone: "0859-7455-6230",
                            phoneRaw: "085974556230",
                            name: "Ricky Ricardo Purba"
                          },
                          {
                            letter: "e",
                            lab: "Laboran",
                            desc: "Jika memerlukan bantuan teknis tentang peralatan lab yang tidak bisa ditangani oleh PIC silahkan hubungi Laboran melalui kontak berikut:",
                            email: "ricky.purba@uph.edu",
                            phone: "0859-7455-6230",
                            phoneRaw: "085974556230",
                            name: "Ricky Ricardo Purba"
                          },
                          {
                            letter: "f",
                            lab: "Kepala Lab",
                            desc: "Jika ada masalah yang berkaitan dengan laboratorium dan bertingkat fakultas silahkan hubungi:",
                            email: "aditya.mitra@uph.edu",
                            phone: "0817-4822-825",
                            phoneRaw: "08174822825",
                            name: "Aditya Rama Mitra"
                          },
                        ].map((contact) => (
                          <div key={contact.letter} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-orange-500 font-medium text-xs">{contact.letter}.</span>
                              <h4 className="text-sm font-medium text-gray-900">{contact.lab}</h4>
                            </div>
                            <p className="text-xs text-gray-500 mb-3">{contact.desc}</p>
                            <div className="space-y-1.5 text-sm">
                              <div className="flex items-center gap-2">
                                <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                <a href={`mailto:${contact.email}`} className="text-orange-500 hover:underline text-xs">{contact.email}</a>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                <a href={`tel:${contact.phoneRaw}`} className="text-orange-500 hover:underline text-xs">{contact.phone}</a>
                                <span className="text-xs text-gray-400">({contact.name})</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AnimatedSection>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER / CONTACT SECTION ==================== */}
      <section id="contact" className="relative py-16 sm:py-20 bg-white border-t border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <AnimatedSection>
              <div className="flex justify-center mb-4">
                  <img src="/colored_logo.png" alt="FAIDAS Logo" className="h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-medium text-gray-900">Faculty of Artificial Intelligence and Data Science</h3>
              <p className="text-sm text-gray-500 mb-4">Universitas Pelita Harapan</p>

              <div className="flex items-center justify-center space-x-3 mb-8">
                <a href="https://www.uph.edu/id/faculty/faculty-of-artificial-intelligence-and-data-science/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-orange-500 hover:bg-orange-50 hover:border-orange-200 transition-colors">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.49996 1.80002C4.35194 1.80002 1.79996 4.352 1.79996 7.50002C1.79996 10.648 4.35194 13.2 7.49996 13.2C10.648 13.2 13.2 10.648 13.2 7.50002C13.2 4.352 10.648 1.80002 7.49996 1.80002ZM0.899963 7.50002C0.899963 3.85494 3.85488 0.900024 7.49996 0.900024C11.145 0.900024 14.1 3.85494 14.1 7.50002C14.1 11.1451 11.145 14.1 7.49996 14.1C3.85488 14.1 0.899963 11.1451 0.899963 7.50002Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path><path d="M13.4999 7.89998H1.49994V7.09998H13.4999V7.89998Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path><path d="M7.09991 13.5V1.5H7.89991V13.5H7.09991zM10.375 7.49998C10.375 5.32724 9.59364 3.17778 8.06183 1.75656L8.53793 1.24341C10.2396 2.82218 11.075 5.17273 11.075 7.49998 11.075 9.82724 10.2396 12.1778 8.53793 13.7566L8.06183 13.2434C9.59364 11.8222 10.375 9.67273 10.375 7.49998zM3.99969 7.5C3.99969 5.17611 4.80786 2.82678 6.45768 1.24719L6.94177 1.75281C5.4582 3.17323 4.69969 5.32389 4.69969 7.5 4.6997 9.67611 5.45822 11.8268 6.94179 13.2472L6.45769 13.7528C4.80788 12.1732 3.9997 9.8239 3.99969 7.5z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path><path d="M7.49996 3.95801C9.66928 3.95801 11.8753 4.35915 13.3706 5.19448 13.5394 5.28875 13.5998 5.50197 13.5055 5.67073 13.4113 5.83948 13.198 5.89987 13.0293 5.8056 11.6794 5.05155 9.60799 4.65801 7.49996 4.65801 5.39192 4.65801 3.32052 5.05155 1.97064 5.8056 1.80188 5.89987 1.58866 5.83948 1.49439 5.67073 1.40013 5.50197 1.46051 5.28875 1.62927 5.19448 3.12466 4.35915 5.33063 3.95801 7.49996 3.95801zM7.49996 10.85C9.66928 10.85 11.8753 10.4488 13.3706 9.6135 13.5394 9.51924 13.5998 9.30601 13.5055 9.13726 13.4113 8.9685 13.198 8.90812 13.0293 9.00238 11.6794 9.75643 9.60799 10.15 7.49996 10.15 5.39192 10.15 3.32052 9.75643 1.97064 9.00239 1.80188 8.90812 1.58866 8.9685 1.49439 9.13726 1.40013 9.30601 1.46051 9.51924 1.62927 9.6135 3.12466 10.4488 5.33063 10.85 7.49996 10.85z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd">
                    </path>
                  </svg>
                </a>
                <a href="https://www.instagram.com/uph.faidas" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-orange-500 hover:bg-orange-50 hover:border-orange-200 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={100}>
              <div className="bg-orange-50 rounded-xl p-5 mb-8 border border-orange-100">
                <p className="text-sm text-gray-700 italic leading-relaxed">
                  &ldquo;For from him and through him and for him are all things. To him be the glory forever! Amen.&rdquo;
                </p>
                <p className="text-xs text-gray-400 mt-2">Romans 11:36</p>
                <p className="text-xs text-gray-500 mt-3">
                  Developed with purpose to serve and glorify God.
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={150}>
              <p className="text-sm text-gray-400 mb-6">
                Developed by Teofilus Insani, Informatics 2023
              </p>

              <div className="pt-6 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs text-gray-400 order-2 sm:order-1">
                    © 2025 BookLab - Faculty of Artificial Intelligence and Data Science, Universitas Pelita Harapan
                  </p>
                  <div className="flex items-center space-x-1.5 order-1 sm:order-2">
                    <img src="/colored_logo.png" alt="FAIDAS Logo" className="h-5" />
                    <div className="flex flex-col pl-2 border-l-2 border-gray-400">
                      <span className="text-xs font-medium leading-none text-orange-500">Book</span>
                      <span className="text-xs font-medium leading-none text-orange-500">Lab</span>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <style jsx global>{`
        html { scroll-behavior: smooth; }
        @keyframes noticeIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes noticeFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

