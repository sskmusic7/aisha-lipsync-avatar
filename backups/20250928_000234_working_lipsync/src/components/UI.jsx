import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { Experience } from "./Experience";
import { Visualizer } from "./Visualizer";
import { ChatInterface } from "./ChatInterface";

const examples = [
  {
    label: "Visualizer",
    href: "#",
  },
  {
    label: "3D model",
    href: "#model",
  },
  {
    label: "AI Chat",
    href: "#chat",
  },
];

export const UI = () => {
  const [currentHash, setCurrentHash] = useState(
    window.location.hash.replace("#", "")
  );

  useEffect(() => {
    // When hash in the url changes, update the href state
    const handleHashChange = () => {
      setCurrentHash(window.location.hash.replace("#", ""));
    };
    window.addEventListener("hashchange", handleHashChange);

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  return (
    <section className="flex flex-col-reverse lg:flex-row overflow-hidden h-full w-full">
      <div className="p-10 lg:max-w-2xl overflow-y-auto">
        <a
          className="pointer-events-auto select-none opacity-0 animate-fade-in-down animation-delay-200 "
          href="https://wawasensei.dev"
          target="_blank"
        >
          <img
            src="/images/wawasensei.png"
            alt="Wawa Sensei logo"
            className="w-20 h-20 object-contain"
          />
        </a>
        
        {/* Navigation tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {examples.map((example) => (
            <a
              key={example.label}
              href={example.href}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentHash === example.href.replace('#', '') || (example.href === '#' && currentHash === '')
                  ? 'bg-pink-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {example.label}
            </a>
          ))}
        </div>

        {/* Content based on current hash */}
        {(currentHash === '' || currentHash === 'visualizer') && <Visualizer />}
        {currentHash === 'model' && (
          <div className="text-center py-8">
            <p className="text-lg">3D Model view is shown on the right panel</p>
            <p className="text-sm text-gray-600 mt-2">Switch to other tabs to see different features</p>
          </div>
        )}
        {currentHash === 'chat' && <ChatInterface />}
      </div>
      <div className="flex-1 bg-gradient-to-b from-pink-400 to-pink-200 relative">
        <Canvas shadows camera={{ position: [12, 8, 26], fov: 30 }}>
          <Suspense>
            <Experience />
          </Suspense>
        </Canvas>
        <div className="bg-gradient-to-b from-transparent to-black/90 absolute bottom-0 top-3/4 left-0 right-0 pointer-events-none z-10">
          <div className="bottom-4 fixed z-20 right-4 md:right-15 flex items-center gap-4 animation-delay-1500 animate-fade-in-up opacity-0 ">
            <div className="w-20 h-px bg-white/60"></div>
            <a
              href="https://lessons.wawasensei.dev/courses/react-three-fiber/"
              className="text-white/60 text-xs pointer-events-auto select-none"
            >
              Learn Three.js & React Three Fiber
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
