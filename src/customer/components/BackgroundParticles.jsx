import React, { useEffect, useState, useRef } from 'react';

const colors = ['#9b87f5', '#e5deff', '#d6bcfa', '#D3E4FD', '#FDE1D3'];

const BackgroundParticles = ({ count = 5 }) => {
  const [particles, setParticles] = useState([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const frameRef = useRef();
  
  // Generate initial particles
  useEffect(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const initialParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * viewportWidth,
      y: Math.random() * viewportHeight,
      size: Math.random() * 150 + 50,
      color: colors[Math.floor(Math.random() * colors.length)],
      velocity: {
        x: (Math.random() - 0.5) * 0.5,
        y: (Math.random() - 0.5) * 0.5
      }
    }));
    
    setParticles(initialParticles);
    
    // Update mouse position
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(frameRef.current);
    };
  }, [count]);

  // Animate particles
  useEffect(() => {
    if (particles.length === 0) return;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const animateParticles = () => {
      setParticles(prevParticles => prevParticles.map(particle => {
        // Calculate distance from mouse
        const dx = mousePosition.x - particle.x;
        const dy = mousePosition.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Add slight attraction to mouse
        const attraction = Math.min(30 / Math.max(distance, 100), 0.3);
        let vx = particle.velocity.x;
        let vy = particle.velocity.y;
        
        // Only apply attraction if mouse is moving
        if (mousePosition.x !== 0 && mousePosition.y !== 0) {
          vx += dx * attraction * 0.01;
          vy += dy * attraction * 0.01;
        }
        
        // Apply velocity with limits
        vx = Math.max(-0.5, Math.min(0.5, vx));
        vy = Math.max(-0.5, Math.min(0.5, vy));
        
        // Update position
        let newX = particle.x + vx;
        let newY = particle.y + vy;
        
        // Bounce off edges
        if (newX < 0 || newX > viewportWidth) {
          vx *= -1;
          newX = newX < 0 ? 0 : viewportWidth;
        }
        
        if (newY < 0 || newY > viewportHeight) {
          vy *= -1;
          newY = newY < 0 ? 0 : viewportHeight;
        }
        
        return {
          ...particle,
          x: newX,
          y: newY,
          velocity: { x: vx, y: vy }
        };
      }));
      
      frameRef.current = requestAnimationFrame(animateParticles);
    };
    
    frameRef.current = requestAnimationFrame(animateParticles);
    
    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [particles, mousePosition]);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
      {/* Add a subtle background blur overlay */}
      <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-0" />
      
      {particles.map(particle => (
        <div
          key={particle.id}
          className="particle absolute rounded-full opacity-10 backdrop-blur-sm"
          style={{
            left: particle.x - particle.size / 2,
            top: particle.y - particle.size / 2,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            filter: 'blur(10px)',
            transform: 'translateZ(0)',
          }}
        />
      ))}
    </div>
  );
};

export default BackgroundParticles; 