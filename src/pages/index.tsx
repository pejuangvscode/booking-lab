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
    subTitle: "keterangan keterangan keteranganketeranganketerangan"
  },
  { 
    id: 2,
    imageSrc: "/B357.png", 
    title: "Information System Lab (B357)",
    subTitle: "keteranganketerangan keteranganketeranganketerangan"
  },
  {
    id: 3,
    imageSrc: "/F205.png",
    title: "FIT Showcase Room (F205)",
    subTitle: "keteranganketerangan keteranganketeranganketerangan"
  },  
  {
    id: 4,
    imageSrc: "/F209.png",
    title: "Lab F209",
    subTitle: "keteranganketerangan keteranganketeranganketerangan"
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

        {/* Navigation Arrows */}
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

        {/* Slide Indicators */}
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

      {/* Information Sections */}
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

        {/* Lab Rules Section */}
        <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-gray-50 to-gray-100">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10 sm:mb-14">

                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-5">
                  Tata Tertib Penggunaan Laboratorium FIT
                </h2>
                <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
                  Harap patuhi aturan berikut untuk menjaga kelancaran dan keamanan penggunaan laboratorium
                </p>
              </div>
              
              {/* Table of Contents */}
              <div className="bg-white p-5 rounded-xl shadow-md mb-8 sm:mb-10">
                <h3 className="font-semibold text-gray-900 mb-3 text-lg">Daftar Isi:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <a href="#larangan" className="flex items-center p-2 hover:bg-gray-50 rounded-md group transition-colors">
                    <span className="w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 rounded-full mr-2 font-medium">1</span>
                    <span className="text-gray-700 group-hover:text-red-600">Larangan</span>
                  </a>
                  <a href="#kewajiban" className="flex items-center p-2 hover:bg-gray-50 rounded-md group transition-colors">
                    <span className="w-6 h-6 flex items-center justify-center bg-green-100 text-green-600 rounded-full mr-2 font-medium">2</span>
                    <span className="text-gray-700 group-hover:text-green-600">Kewajiban</span>
                  </a>
                  <a href="#prosedur" className="flex items-center p-2 hover:bg-gray-50 rounded-md group transition-colors">
                    <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full mr-2 font-medium">3</span>
                    <span className="text-gray-700 group-hover:text-blue-600">Prosedur Peminjaman</span>
                  </a>
                  <a href="#penampilan" className="flex items-center p-2 hover:bg-gray-50 rounded-md group transition-colors">
                    <span className="w-6 h-6 flex items-center justify-center bg-purple-100 text-purple-600 rounded-full mr-2 font-medium">4</span>
                    <span className="text-gray-700 group-hover:text-purple-600">Peraturan Berpenampilan</span>
                  </a>
                  <a href="#sanksi" className="flex items-center p-2 hover:bg-gray-50 rounded-md group transition-colors">
                    <span className="w-6 h-6 flex items-center justify-center bg-orange-100 text-orange-600 rounded-full mr-2 font-medium">5</span>
                    <span className="text-gray-700 group-hover:text-orange-600">Sanksi Pelanggaran</span>
                  </a>
                  <a href="#kontak" className="flex items-center p-2 hover:bg-gray-50 rounded-md group transition-colors">
                    <span className="w-6 h-6 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-full mr-2 font-medium">6</span>
                    <span className="text-gray-700 group-hover:text-indigo-600">Kontak Penanggung Jawab</span>
                  </a>
                </div>
              </div>
              
              {/* Rules Content */}
              <div className="space-y-8 sm:space-y-10">
                {/* 1. Larangan */}
                <div id="larangan" className="bg-white p-6 sm:p-8 rounded-xl shadow-md border-l-4 border-red-500">
                  <div className="flex items-center mb-5">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-red-600 font-bold">1</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Semua pengunjung atau pengguna Laboratorium FIT, DILARANG:</h3>
                  </div>
                  
                  <ul className="space-y-3 text-sm sm:text-base text-gray-700 ml-2">
                    <li className="flex items-start bg-red-50 p-3 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">a</span>
                      <span>Merokok</span>
                    </li>
                    <li className="flex items-start bg-red-50 p-3 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">b</span>
                      <span>Membuang sampah sembarangan dan mengotori area Lab</span>
                    </li>
                    <li className="flex items-start bg-red-50 p-3 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">c</span>
                      <span>Membawa makanan ke dalam Laboratorium</span>
                    </li>
                    <li className="flex items-start bg-red-50 p-3 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">d</span>
                      <span>Makan atau minum dalam Laboratorium FIT tanpa se-izin Laboran (kecuali pengajar)</span>
                    </li>
                    <li className="flex items-start bg-red-50 p-3 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">e</span>
                      <span>Membuat keributan</span>
                    </li>
                    <li className="flex items-start bg-red-50 p-3 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">f</span>
                      <span>Melakukan perjudian dalam bentuk apapun</span>
                    </li>
                    <li className="flex items-start bg-red-50 p-3 rounded-lg sm:col-span-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">g</span>
                      <span>Merusak dan mengotori fasilitas (meja, kursi, papan tulis, pintu, tembok, komputer dan seluruh peralatan dalam Laboratorium)</span>
                    </li>
                    <li className="flex items-start bg-red-50 p-3 rounded-lg sm:col-span-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">h</span>
                      <span>Melakukan kegiatan yang melanggar etika, moral, atau hukum yang berlaku</span>
                    </li>
                    <li className="flex items-start bg-red-50 p-3 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">i</span>
                      <span>Menciptakan atau menyebarkan virus komputer</span>
                    </li>
                    <li className="flex items-start bg-red-50 p-3 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">j</span>
                      <span>Melakukan cracking atau hacking</span>
                    </li>
                    <li className="flex items-start bg-red-50 p-3 rounded-lg sm:col-span-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">k</span>
                      <span>Menginstall atau menyimpan program dalam bentuk apapun ke dalam fasilitas yang ada di Laboratorium</span>
                    </li>
                    <li className="flex items-start bg-red-50 p-3 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">l</span>
                      <span>Mencuri fasilitas, peralatan, atau benda apapun yang merupakan milik Lab</span>
                    </li>
                    <li className="flex items-start bg-red-50 p-3 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">m</span>
                      <span>Memainkan game dalam bentuk apapun dengan menggunakan fasilitas Lab</span>
                    </li>
                    <li className="flex items-start bg-red-50 p-3 rounded-lg sm:col-span-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">n</span>
                      <span>Browsing ke situs-situs yang melanggar etika atau "berbau" pornografi atau kekerasan</span>
                    </li>
                  </ul>
                </div>
                
                {/* 2. Kewajiban */}
                <div id="kewajiban" className="bg-white p-6 sm:p-8 rounded-xl shadow-md border-l-4 border-green-500">
                  <div className="flex items-center mb-5">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-green-600 font-bold">2</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Semua pengunjung atau pengguna Laboratorium FIT, WAJIB:</h3>
                  </div>
                  
                  <ul className="space-y-3 text-sm sm:text-base text-gray-700">
                    <li className="flex p-3 bg-green-50 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">a</span>
                      <span>Mengenakan pakaian rapi dan sopan sesuai dengan peraturan berpenampilan yang dapat dilihat pada poin 4</span>
                    </li>
                    <li className="flex p-3 bg-green-50 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">b</span>
                      <span>Melakukan peminjaman melalui website BookLab. Prosedur peminjaman Laboratorium dapat dilihat pada poin 3</span>
                    </li>
                    <li className="flex p-3 bg-green-50 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">c</span>
                      <span>Mahasiswa FIT yang berada di area Lab wajib menjaga ketertiban Laboratorium</span>
                    </li>
                    <li className="flex p-3 bg-green-50 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">d</span>
                      <span>Mahasiswa harus mengembalikan kembali posisi meja atau kursi jika Lab sudah selesai digunakan. Kondisi sebelum dan sesudah peminjaman harus rapi</span>
                    </li>
                    <li className="flex p-3 bg-green-50 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">e</span>
                      <span>Bertanggung jawab atas barang pribadi yang di bawa ke Lab. Kehilangan di luar tanggung jawab pengajar atau petugas Lab</span>
                    </li>
                  </ul>
                </div>
                
                {/* 3. Prosedur Peminjaman */}
                <div id="prosedur" className="bg-white p-6 sm:p-8 rounded-xl shadow-md border-l-4 border-blue-500">
                  <div className="flex items-center mb-5">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-blue-600 font-bold">3</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Prosedur Peminjaman Laboratorium</h3>
                  </div>
                  
                  <ul className="space-y-3 text-sm sm:text-base text-gray-700">
                    <li className="flex p-3 bg-blue-50 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">a</span>
                      <span>Cek jadwal perkuliahan yang ditempel di pintu Lab dan pastikan tidak ada kelas</span>
                    </li>
                    <li className="flex p-3 bg-blue-50 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">b</span>
                      <span>Masuk ke website BookLab (bit.ly/FITBookLab) atau Scan QR Code di pintu Lab. Lakukan pemesanan ruang Lab melalui Website. Ikuti langkah pemesanan yang tertera pada website</span>
                    </li>
                    <li className="flex p-3 bg-blue-50 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">c</span>
                      <span>Mahasiswa hanya dapat menggunakan Lab jika pemesanan melalui website BookLab telah disetujui</span>
                    </li>
                    <li className="flex p-3 bg-blue-50 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">d</span>
                      <span>Jika pemesanan sudah disetujui silahkan gunakan Lab dengan tertib dan tetap mematuhi semua Tata Tertib Penggunaan Laboratorium</span>
                    </li>
                    <li className="flex flex-col p-3 bg-blue-50 rounded-lg">
                      <div className="flex">
                        <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">e</span>
                        <span>Jika penggunaan Lab berlanjut hingga di luar jam kerja (07:00 – 16:00), ikuti prosedur berikut ini:</span>
                      </div>
                      
                      <ul className="mt-3 ml-7 space-y-3">
                        <li className="flex p-2 bg-blue-100/70 rounded-lg">
                          <span className="flex-shrink-0 w-5 h-5 bg-blue-400 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">i</span>
                          <span>Konfirmasi peminjaman ruang Lab di luar jam kerja dilakukan maksimal Jam 15:00 WIB di hari-H peminjaman kepada Penanggung Jawab Lab</span>
                        </li>
                        <li className="flex p-2 bg-blue-100/70 rounded-lg">
                          <span className="flex-shrink-0 w-5 h-5 bg-blue-400 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">ii</span>
                          <span>Penanggung jawab Lab akan memberikan kunci Lab kepada PIC peminjam Lab. PIC bertanggung jawab penuh atas keamanan dan seluruh fasilitas Lab</span>
                        </li>
                        <li className="flex p-2 bg-blue-100/70 rounded-lg">
                          <span className="flex-shrink-0 w-5 h-5 bg-blue-400 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">iii</span>
                          <span>Matikan lampu, AC, dan semua peralatan elektronik setelah Lab digunakan</span>
                        </li>
                        <li className="flex p-2 bg-blue-100/70 rounded-lg">
                          <span className="flex-shrink-0 w-5 h-5 bg-blue-400 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">iv</span>
                          <span>Kunci kembali pintu Lab</span>
                        </li>
                        <li className="flex flex-col p-2 bg-blue-100/70 rounded-lg">
                          <div className="flex">
                            <span className="flex-shrink-0 w-5 h-5 bg-blue-400 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">v</span>
                            <span>Pengembalian kunci:</span>
                          </div>
                          
                          <ul className="ml-7 mt-2 space-y-2">
                            <li className="flex items-start p-2 bg-blue-100 rounded-lg">
                              <span className="flex-shrink-0 w-4 h-4 bg-blue-300 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">•</span>
                              <span>Jika Kantor Fakultas masih buka: letakan di meja Admin/OB dan kirimkan bukti foto bahwa kunci telah dikembalikan ke Penanggung Jawab Lab</span>
                            </li>
                            <li className="flex items-start p-2 bg-blue-100 rounded-lg">
                              <span className="flex-shrink-0 w-4 h-4 bg-blue-300 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-xs font-bold">•</span>
                              <span>Jika Kantor Fakultas tutup, titipkan ke Security Lobby Gedung B (Pelita Shop) dan tulis di log book mereka, kemudian kirimkan bukti foto bahwa kunci telah dikembalikan ke Penaggung Jawab Lab</span>
                            </li>
                          </ul>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </div>
                
                {/* 4. Peraturan Berpenampilan */}
                <div id="penampilan" className="bg-white p-6 sm:p-8 rounded-xl shadow-md border-l-4 border-purple-500">
                  <div className="flex items-center mb-5">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-purple-600 font-bold">4</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Peraturan Berpenampilan di Laboratorium FIT</h3>
                  </div>
                  
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="flex items-center mb-3 font-semibold">
                        <span className="flex-shrink-0 w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center mr-2 text-xs font-bold">a</span>
                        <span className="text-purple-700">Atasan</span>
                      </h4>
                      <ul className="space-y-2 ml-7 text-sm sm:text-base text-gray-700">
                        <li className="flex items-start">
                          <span className="flex-shrink-0 w-4 h-4 bg-purple-300 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-[10px] font-bold">i</span>
                          <span>Menggunakan pakaian bebas dan wajib berlengan</span>
                        </li>
                        <li className="flex items-start">
                          <span className="flex-shrink-0 w-4 h-4 bg-purple-300 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-[10px] font-bold">ii</span>
                          <span>Nyaman saat digunakan dan tidak mengganggu aktivitas praktikum</span>
                        </li>
                        <li className="flex items-start">
                          <span className="flex-shrink-0 w-4 h-4 bg-purple-300 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-[10px] font-bold">iii</span>
                          <span>Dilarang menggunakan baju vulgar dan terbuka</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="flex items-center mb-3 font-semibold">
                        <span className="flex-shrink-0 w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center mr-2 text-xs font-bold">b</span>
                        <span className="text-purple-700">Bawahan</span>
                      </h4>
                      <ul className="space-y-2 ml-7 text-sm sm:text-base text-gray-700">
                        <li className="flex items-start">
                          <span className="flex-shrink-0 w-4 h-4 bg-purple-300 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-[10px] font-bold">i</span>
                          <span>Celana bahan kain panjang (menutup mata kaki) dan tidak ketat</span>
                        </li>
                        <li className="flex items-start">
                          <span className="flex-shrink-0 w-4 h-4 bg-purple-300 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-[10px] font-bold">ii</span>
                          <span>Celana berbahan jeans panjang (menutup mata kaki) tidak ketat dan tidak sobek-sobek</span>
                        </li>
                        <li className="flex items-start">
                          <span className="flex-shrink-0 w-4 h-4 bg-purple-300 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-[10px] font-bold">iii</span>
                          <span>Rok panjang (menutup lutut)</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="flex items-center mb-3 font-semibold">
                        <span className="flex-shrink-0 w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center mr-2 text-xs font-bold">c</span>
                        <span className="text-purple-700">Alas Kaki</span>
                      </h4>
                      <ul className="space-y-2 ml-7 text-sm sm:text-base text-gray-700">
                        <li className="flex items-start">
                          <span className="flex-shrink-0 w-4 h-4 bg-purple-300 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-[10px] font-bold">i</span>
                          <span>Wajib mengenakan sepatu yang menutup semua permukaan kaki</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-5 p-3 bg-gray-100 rounded-lg border border-gray-300 italic text-sm text-gray-700">
                  Segala bentuk pelanggaran terhadap tata tertib di atas akan dikenakan sanksi. Penentuan sanksi merupakan hak mutlak dari Kepala Laboratorium FIT dan juga Laboran yang bertugas.
                </div>
                
                {/* 5. Sanksi Pelanggaran */}
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
                          <span>Merokok</span>
                        </li>
                        <li className="flex items-start">
                          <span className="flex-shrink-0 w-4 h-4 bg-orange-300 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-[10px] font-bold">ii</span>
                          <span>Memakai sandal</span>
                        </li>
                        <li className="flex items-start">
                          <span className="flex-shrink-0 w-4 h-4 bg-orange-300 text-white rounded-full flex items-center justify-center mr-2 mt-0.5 text-[10px] font-bold">iii</span>
                          <span>Melakukan praktek hacking/cracking di Lab</span>
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
                        <span className="font-medium">Mahasiswa yang terbukti melakukan pengrusakan fasilitas atau peraltan di Lab:</span>
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
                
                {/* 6. Nomor Kontak */}
                <div id="kontak" className="bg-white p-6 sm:p-8 rounded-xl shadow-md border-l-4 border-indigo-500">
                  <div className="flex items-center mb-5">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-indigo-600 font-bold">6</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Nomor Kontak Penangung Jawab</h3>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <h4 className="flex items-center text-indigo-700 font-semibold mb-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-indigo-500 text-white rounded-full flex items-center justify-center mr-2 text-xs font-bold">a</span>
                        PIC Lab B338
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">Jika memerlukan bantuan seputar peminjaman ruangan dan alat di dalam ruangan bersangkutan silahkan hubungi PIC melalui kontak berikut:</p>
                      <ul className="space-y-1 text-sm text-gray-700 border-l-2 border-indigo-200 pl-3">
                        <li className="flex items-center">
                          <span className="font-medium mr-2">Email:</span>
                        </li>
                        <li>
                          <a href="mailto:kelvin.wiriyatama@uph.edu" className="text-indigo-600 hover:underline">kelvin.wiriyatama@uph.edu</a>
                        </li>
                        <li className="flex items-center">
                          <span className="font-medium mr-2">Nomor Telepon:</span>
                        </li>
                        <li>
                          <a href="tel:085155443290" className="text-indigo-600 hover:underline">0851-5544-3290</a>
                          <span className="text-gray-500 ml-1">(Kelvin Wiriyatama)</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <h4 className="flex items-center text-indigo-700 font-semibold mb-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-indigo-500 text-white rounded-full flex items-center justify-center mr-2 text-xs font-bold">b</span>
                        PIC Lab B357
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">Jika memerlukan bantuan seputar peminjaman ruangan dan alat di dalam ruangan bersangkutan silahkan hubungi PIC melalui kontak berikut:</p>
                      <ul className="space-y-1 text-sm text-gray-700 border-l-2 border-indigo-200 pl-3">
                        <li className="flex items-center">
                          <span className="font-medium mr-2">Email:</span>
                        </li>
                        <li className="flex items-center">
                          <a href="mailto:kusno.prasetya@uph.edu" className="text-indigo-600 hover:underline">kusno.prasetya@uph.edu</a>
                        </li>
                        <li className="flex items-center">
                          <span className="font-medium mr-2">Nomor Telepon:</span>
                        </li>
                        <li className="flex items-center">
                          <a href="tel:081234567890" className="text-indigo-600 hover:underline">0812-3456-7890</a>
                          <span className="text-gray-500 ml-1">(Kusno Prasetya)</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <h4 className="flex items-center text-indigo-700 font-semibold mb-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-indigo-500 text-white rounded-full flex items-center justify-center mr-2 text-xs font-bold">c</span>
                        PIC Lab Gedung F
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">Jika memerlukan bantuan seputar peminjaman ruangan dan alat di dalam ruangan bersangkutan silahkan hubungi PIC melalui kontak berikut:</p>
                      <ul className="space-y-1 text-sm text-gray-700 border-l-2 border-indigo-200 pl-3">
                        <li className="flex items-center">
                          <span className="font-medium mr-2">Email:</span>
                        </li>
                        <li>
                          <a href="mailto:ricky.purba@uph.edu" className="text-indigo-600 hover:underline">ricky.purba@uph.edu</a>
                        </li>
                        <li className="flex items-center">
                          <span className="font-medium mr-2">Nomor Telepon:</span>
                        </li>
                        <li className="flex items-center">
                          <a href="tel:085974556230" className="text-indigo-600 hover:underline">0859-7455-6230</a>
                          <span className="text-gray-500 ml-1">(Ricky Ricardo Purba)</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <h4 className="flex items-center text-indigo-700 font-semibold mb-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-indigo-500 text-white rounded-full flex items-center justify-center mr-2 text-xs font-bold">d</span>
                        Laboran
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">Jika memerlukan bantuan teknis tentang peralatan lab yang tidak bisa ditangani oleh PIC silahkan hubungi Laboran melalui kontak berikut:</p>
                      <ul className="space-y-1 text-sm text-gray-700 border-l-2 border-indigo-200 pl-3">
                        <li className="flex items-center">
                          <span className="font-medium mr-2">Email:</span>
                        </li>
                        <li>
                          <a href="mailto:ricky.purba@uph.edu" className="text-indigo-600 hover:underline">ricky.purba@uph.edu</a>
                        </li>
                        <li className="flex items-center">
                          <span className="font-medium mr-2">Nomor Telepon:</span>
                        </li>
                        <li>
                          <a href="tel:085974556230" className="text-indigo-600 hover:underline">0859-7455-6230</a>
                          <span className="text-gray-500 ml-1">(Ricky Ricardo Purba)</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="bg-indigo-50 p-4 rounded-lg sm:col-span-2">
                      <h4 className="flex items-center text-indigo-700 font-semibold mb-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-indigo-500 text-white rounded-full flex items-center justify-center mr-2 text-xs font-bold">e</span>
                        Kontak Kepala Lab
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">Jika ada masalah yang barikaitan dengan laboratorium dan bertingkat fakultas silahkan hubungi:</p>
                      <ul className="space-y-1 text-sm text-gray-700 border-l-2 border-indigo-200 pl-3">
                        <li className="flex items-center">
                          <span className="font-medium mr-2">Email:</span>
                          <a href="mailto:aditya.mitra@uph.edu" className="text-indigo-600 hover:underline">aditya.mitra@uph.edu</a>
                        </li>
                        <li className="flex items-center">
                          <span className="font-medium mr-2">Nomor Telepon:</span>
                          <a href="tel:08174822825" className="text-indigo-600 hover:underline">0817-4822-825</a>
                          <span className="text-gray-500 ml-1">(Aditya R. Mitra)</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How to Use BookLab Section */}
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
                    <p className="text-sm sm:text-base text-gray-600">Klik tombol "Sign In" di pojok kanan atas dan masuk menggunakan akun Google Anda.</p>
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
                  Developed by Teofilus Insani
                </p>
                
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