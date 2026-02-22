import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import './MagicBento.css'; // Esto le dice a React que use el otro archivo

const DEFAULT_SPOTLIGHT_RADIUS = 400;
const DEFAULT_GLOW_COLOR = '132, 0, 255';

export default function MagicBento({ children, spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS, glowColor = DEFAULT_GLOW_COLOR }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const spotlight = spotlightRef.current;
    const grid = gridRef.current;
    if (!spotlight || !grid) return;

    const handleMouseMove = (e: MouseEvent) => {
      gsap.to(spotlight, {
        left: e.clientX,
        top: e.clientY,
        opacity: 0.8,
        duration: 0.2,
        ease: 'power2.out'
      });

      const cards = grid.querySelectorAll('.magic-bento-card');
      cards.forEach((card: any) => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = Math.hypot(e.clientX - centerX, e.clientY - centerY);
        
        // Intensidad basada en distancia
        const intensity = distance < spotlightRadius ? 1 : 0;

        card.style.setProperty('--glow-x', `${x}%`);
        card.style.setProperty('--glow-y', `${y}%`);
        card.style.setProperty('--glow-intensity', intensity.toString());
      });
    };

    const handleMouseLeave = () => {
      gsap.to(spotlight, { opacity: 0, duration: 0.5 });
    };

    window.addEventListener('mousemove', handleMouseMove);
    grid.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      grid.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [spotlightRadius]);

  return (
    <div ref={gridRef} className="bento-section w-full h-full">
      <div 
        ref={spotlightRef} 
        className="global-spotlight" 
        style={{
          position: 'fixed',
          width: '800px',
          height: '800px',
          background: `radial-gradient(circle, rgba(${glowColor}, 0.15) 0%, transparent 70%)`,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 5,
          opacity: 0,
          mixBlendMode: 'screen'
        }}
      />
      {children}
    </div>
  );
}