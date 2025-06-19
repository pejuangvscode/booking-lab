import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { SignInButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { Button } from "~/components/ui/button";

import { api } from "~/utils/api";

// Carousel images and texts
const carouselItems = [
  {
    id: 1,
    imageSrc: "/B338.png",
    title: "B338",
    subTitle: "keterangan keterangan keterangan keterangan"
  },
  {
    id: 2,
    imageSrc: "/B357.png", 
    title: "B357",
    subTitle: "keterangan keterangan keterangan keterangan"
  },
  {
    id: 3,
    imageSrc: "/F205.png",
    title: "F205",
    subTitle: "keterangan keterangan keterangan keterangan"
  },  
  {
    id: 4,
    imageSrc: "/F209.png",
    title: "F209",
    subTitle: "keterangan keterangan keterangan keterangan"
  }
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Head>
        <title>BookLab | FIT Lab Booking</title>
        <meta name="description" content="UPH Lab Room Booking Portal" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Hero Section with Carousel */}
      <div className="relative h-screen w-full overflow-hidden">
        {/* Carousel Images */}
        <div className="h-full w-full">
          {carouselItems.map((item, index) => (
            <div 
              key={item.id} 
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSlide ? "opacity-100" : "opacity-0"
              }`}
            >
              {/* Image placeholder - replace with your actual images */}
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
              
              {/* Overlay gradient for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
            </div>
          ))}
        </div>

        {/* Hero Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center text-white">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-shadow-lg">
                {carouselItems[currentSlide].title}
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-shadow-lg">
                {carouselItems[currentSlide].subTitle}
              </p>
              <Button className="bg-orange-600 hover:bg-orange-800 text-white px-8 py-6 text-lg shadow-sm hover:shadow-lg cursor-pointer font-bold"
                onClick={() => window.location.href = '/lab-search'}>
                BOOK A LAB
              </Button>
            </div>
          </div>
        </div>

        {/* Carousel Navigation Dots */}
        <div className="absolute bottom-8 left-0 right-0">
          <div className="flex justify-center space-x-2">
            {carouselItems.map((_, index) => (
              <button
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentSlide ? "w-8 bg-white" : "w-2 bg-white/50"
                }`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}