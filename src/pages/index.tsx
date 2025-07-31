import Head from "next/head";
import Image from "next/legacy/image";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { ChevronLeft, ChevronRight, BookOpen, Shield, Users, Code } from "lucide-react";

const carouselItems = [
  {
    id: 1,
    imageSrc: "/B338.png",
    title: "Informatics Studio (B338)",
    subTitle: "keterangan keteranganketeranganketeranganketerangan"
  },
  {
    id: 2,
    imageSrc: "/B357.png", 
    title: "Information System Lab (B357)",
    subTitle: "keteranganketeranganketeranganketeranganketerangan"
  },
  {
    id: 3,
    imageSrc: "/F205.png",
    title: "FIT Showcase Lab (F205)",
    subTitle: "keteranganketeranganketeranganketeranganketerangan"
  },  
  {
    id: 4,
    imageSrc: "/F209.png",
    title: "Lab F209",
    subTitle: "keteranganketeranganketeranganketeranganketerangan"
  }
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);
  };

  return (
    <>
      <Head>
        <title>BookLab | FIT Lab Booking</title>
        <meta name="description" content="UPH Lab Room Booking Portal" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="relative h-[50vh] sm:h-[60vh] lg:h-[70vh] w-full overflow-hidden mt-16">
        <div className="h-full w-full">
          {carouselItems.map((item, index) => (
            <div 
              key={item.id} 
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSlide ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className="absolute inset-0 bg-gray-800">
                <div className="h-full w-full bg-gradient-to-r from-blue-900/50 to-black/50" />
                <Image 
                  src={item.imageSrc} 
                  alt={item.title} 
                  layout="fill" 
                  objectFit="cover" 
                  className="object-cover" 
                  style={{ opacity: 0.8 }}
                />
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
            </div>
          ))}
        </div>

        {/* Navigation Arrows - Fixed positioning and z-index */}
        <button
          onClick={prevSlide}
          className="hover:cursor-pointer absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 text-white p-2 sm:p-3 rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label="Previous slide"
          type="button"
        >
          <ChevronLeft className="h-4 w-4 sm:h-6 sm:w-6" />
        </button>
        
        <button
          onClick={nextSlide}
          className="hover:cursor-pointer absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 text-white p-2 sm:p-3 rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label="Next slide"
          type="button"
        >
          <ChevronRight className="h-4 w-4 sm:h-6 sm:w-6" />
        </button>

        {/* Content overlay */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center text-white">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 text-shadow-lg">
                {carouselItems[currentSlide]?.title}
              </h1>
              <p className="text-sm sm:text-lg md:text-xl mb-6 text-shadow-lg px-4">
                {carouselItems[currentSlide]?.subTitle}
              </p>
              <Button 
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 sm:px-8 py-3 sm:py-4 text-sm sm:text-lg shadow-lg hover:shadow-xl cursor-pointer font-bold rounded-lg transition-all duration-200 hover:scale-105"
                onClick={() => window.location.href = '/lab-search'}
              >
                BOOK A LAB
              </Button>
            </div>
          </div>
        </div>

        {/* Slide Indicators - Improved mobile positioning */}
        <div className="absolute bottom-2 sm:bottom-4 left-0 right-0 z-10">
          <div className="flex justify-center space-x-2">
            {carouselItems.map((_, index) => (
              <button
                key={index}
                className={`h-1.5 sm:h-2 rounded-full transition-all cursor-pointer ${
                  index === currentSlide ? "w-6 sm:w-8 bg-white" : "w-1.5 sm:w-2 bg-white/50"
                }`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
                type="button"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Information Sections - Improved mobile spacing */}
      <div className="bg-gray-50">
        {/* About BookLab Section */}
        <section className="py-8 sm:py-12 lg:py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex justify-center mb-4 sm:mb-6">
                <div className="bg-orange-100 p-3 sm:p-4 rounded-full">
                  <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
                About BookLab
              </h2>
              <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 leading-relaxed px-2">
                BookLab adalah sistem booking laboratorium FIT (Faculty of Information Technology) UPH yang memungkinkan mahasiswa dan dosen untuk mereservasi ruang laboratorium dengan mudah dan efisien. Platform ini dirancang untuk mengoptimalkan penggunaan fasilitas lab dan memastikan ketersediaan ruang sesuai kebutuhan akademik.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
                <div className="text-center">
                  <div className="bg-blue-100 p-3 rounded-full w-fit mx-auto mb-4">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Easy Booking</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">Sistem booking yang user-friendly dengan calendar interface yang intuitif</p>
                </div>
                <div className="text-center">
                  <div className="bg-green-100 p-3 rounded-full w-fit mx-auto mb-4">
                    <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Real-time Updates</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">Informasi ketersediaan lab yang selalu update secara real-time</p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 p-3 rounded-full w-fit mx-auto mb-4">
                    <Code className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Multiple Labs</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">Akses ke berbagai laboratorium dengan spesifikasi yang berbeda</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Lab Rules Section - Improved mobile layout */}
        <section className="py-8 sm:py-12 lg:py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8 sm:mb-12">
                <div className="flex justify-center mb-4 sm:mb-6">
                  <div className="bg-red-100 p-3 sm:p-4 rounded-full">
                    <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
                  Aturan Penggunaan Lab
                </h2>
                <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 px-2">
                  Harap patuhi aturan berikut untuk menjaga kelancaran dan keamanan penggunaan laboratorium
                </p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
                  <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-3 sm:mb-4">Sebelum Menggunakan Lab</h3>
                  <ul className="space-y-2 text-sm sm:text-base text-gray-600">
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2 flex-shrink-0">•</span>
                      <span>Pastikan sudah melakukan booking terlebih dahulu</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2 flex-shrink-0">•</span>
                      <span>Datang tepat waktu sesuai jadwal booking</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2 flex-shrink-0">•</span>
                      <span>Bawa kartu mahasiswa/dosen sebagai identitas</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2 flex-shrink-0">•</span>
                      <span>Konfirmasi kehadiran kepada lab assistant</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
                  <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-3 sm:mb-4">Selama Menggunakan Lab</h3>
                  <ul className="space-y-2 text-sm sm:text-base text-gray-600">
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2 flex-shrink-0">•</span>
                      <span>Jaga kebersihan dan kerapihan area kerja</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2 flex-shrink-0">•</span>
                      <span>Dilarang makan dan minum di area lab</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2 flex-shrink-0">•</span>
                      <span>Gunakan komputer sesuai keperluan akademik</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2 flex-shrink-0">•</span>
                      <span>Laporkan kerusakan peralatan kepada lab assistant</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
                  <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-3 sm:mb-4">Setelah Menggunakan Lab</h3>
                  <ul className="space-y-2 text-sm sm:text-base text-gray-600">
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2 flex-shrink-0">•</span>
                      <span>Log out dari semua aplikasi dan akun</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2 flex-shrink-0">•</span>
                      <span>Matikan komputer dengan proper shutdown</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2 flex-shrink-0">•</span>
                      <span>Kembalikan kursi ke posisi semula</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2 flex-shrink-0">•</span>
                      <span>Pastikan area kerja bersih sebelum meninggalkan lab</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
                  <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-3 sm:mb-4">Sanksi Pelanggaran</h3>
                  <ul className="space-y-2 text-sm sm:text-base text-gray-600">
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2 flex-shrink-0">•</span>
                      <span>Teguran lisan untuk pelanggaran ringan</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2 flex-shrink-0">•</span>
                      <span>Suspend booking untuk pelanggaran berulang</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2 flex-shrink-0">•</span>
                      <span>Denda untuk kerusakan peralatan lab</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2 flex-shrink-0">•</span>
                      <span>Blacklist dari sistem untuk pelanggaran berat</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How to Use BookLab Section - Mobile optimized */}
        <section className="py-8 sm:py-12 lg:py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8 sm:mb-12">
                <div className="flex justify-center mb-4 sm:mb-6">
                  <div className="bg-green-100 p-3 sm:p-4 rounded-full">
                    <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
                  Cara Menggunakan BookLab
                </h2>
                <p className="text-base sm:text-lg text-gray-600 px-2">
                  Ikuti langkah-langkah berikut untuk melakukan booking laboratorium
                </p>
              </div>
              
              <div className="space-y-6 sm:space-y-8">
                <div className="flex items-start space-x-4 sm:space-x-6">
                  <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-base sm:text-lg">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Sign In ke Akun Anda</h3>
                    <p className="text-sm sm:text-base text-gray-600">Klik tombol "Sign In" di pojok kanan atas dan masuk menggunakan akun UPH Anda.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4 sm:space-x-6">
                  <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-base sm:text-lg">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Pilih Lab dan Waktu</h3>
                    <p className="text-sm sm:text-base text-gray-600">Buka halaman "Lab Search" atau "Booking Calendar" untuk melihat ketersediaan lab dan pilih waktu yang diinginkan.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4 sm:space-x-6">
                  <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-base sm:text-lg">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Isi Form Booking</h3>
                    <p className="text-sm sm:text-base text-gray-600">Lengkapi informasi booking seperti nama event, deskripsi, dan jumlah peserta yang akan menggunakan lab.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4 sm:space-x-6">
                  <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-base sm:text-lg">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Konfirmasi Booking</h3>
                    <p className="text-sm sm:text-base text-gray-600">Review informasi booking Anda dan klik "Submit" untuk mengirim request. Anda akan menerima konfirmasi via email.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4 sm:space-x-6">
                  <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-base sm:text-lg">
                    5
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Monitor Status Booking</h3>
                    <p className="text-sm sm:text-base text-gray-600">Cek status booking Anda di halaman "Dashboard" untuk melihat apakah booking sudah dikonfirmasi atau masih pending.</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 sm:mt-12 text-center">
                <Button 
                  className="bg-orange-600 hover:bg-orange-700 text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg shadow-lg hover:shadow-xl cursor-pointer font-bold rounded-lg transition-all duration-200 hover:scale-105"
                  onClick={() => window.location.href = '/lab-search'}
                >
                  Start Booking Now
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-8 sm:py-12 lg:py-16 bg-gray-100">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Credits</h2>
              <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md">
                <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-6">
                  BookLab developed by Cak Gendon
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Solo Developer</h3>
                    <p className="text-gray-600 text-xs sm:text-sm">Full-Stack Development</p>
                    <p className="text-gray-600 text-xs sm:text-sm">UI/UX Design</p>
                    <p className="text-gray-600 text-xs sm:text-sm">Database Design & Architecture</p>
                    <p className="text-gray-600 text-xs sm:text-sm">System Integration</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Technologies Used</h3>
                    <p className="text-gray-600 text-xs sm:text-sm">Next.js, TypeScript, Tailwind CSS</p>
                    <p className="text-gray-600 text-xs sm:text-sm">Prisma ORM, PostgreSQL</p>
                    <p className="text-gray-600 text-xs sm:text-sm">Clerk Authentication</p>
                    <p className="text-gray-600 text-xs sm:text-sm">React Big Calendar, Lucide Icons</p>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-blue-50 rounded-lg border border-orange-200">
                  <p className="text-sm text-gray-700 italic">
                    "For from him and through him and for him are all things. To him be the glory forever! Amen. (Romans 11:36) - Developed with purpose to serve and glorify God."
                  </p>
                </div>
                
                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
                  <p className="text-xs sm:text-sm text-gray-500">
                    © 2025 BookLab - Faculty of Information Technology, Universitas Pelita Harapan
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}