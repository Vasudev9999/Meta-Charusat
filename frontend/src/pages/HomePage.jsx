import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/HomePage.css";
import noiseTexture from "../assets/noise-texture.png";

const HomePage = () => {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeTile, setActiveTile] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 500);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timer);
    };
  }, []);

  const handleEnterCampus = () => {
    navigate("/avatar");
  };

  const features = [
    {
      id: 1,
      icon: "🎮",
      title: "Avatar Customization",
      description: "Design your digital self with unique styles and accessories",
      color: "#FF5D5D"
    },
    {
      id: 2,
      icon: "🏫",
      title: "Interactive Campus",
      description: "Explore buildings, classrooms, and social spaces",
      color: "#5DB9FF"
    },
    {
      id: 3,
      icon: "💬",
      title: "Real-time Chat",
      description: "Connect with friends and classmates instantly",
      color: "#5DFF8F"
    },
    {
      id: 4,
      icon: "🎯",
      title: "Virtual Events",
      description: "Attend lectures, workshops, and social gatherings",
      color: "#FFB15D"
    }
  ];

  return (
    <div className="brutalist-homepage">
      <div className="noise-overlay" style={{ backgroundImage: `url(${noiseTexture})` }}></div>
      
      <div className="cursor-follower" 
        style={{ 
          left: `${mousePosition.x}px`, 
          top: `${mousePosition.y}px` 
        }}>
      </div>

      <div className="bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      
      <AnimatePresence>
        {!isLoaded ? (
          <motion.div 
            className="loader"
            exit={{ opacity: 0 }}
            key="loader"
          >
            <h1>META<br />CHARUSAT</h1>
            <div className="loader-bar">
              <motion.div 
                className="loader-progress"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.5 }}
              ></motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            className="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            key="content"
          >
            <header className="brutalist-header">
              <div className="logo-area">
                <svg className="logo-svg" viewBox="0 0 100 100" width="50" height="50">
                  <rect x="20" y="20" width="60" height="60" fill="none" stroke="#000" strokeWidth="4" />
                  <circle cx="50" cy="50" r="20" fill="none" stroke="#000" strokeWidth="4" />
                  <path d="M30,30 L70,70" stroke="#000" strokeWidth="4" />
                  <path d="M70,30 L30,70" stroke="#000" strokeWidth="4" />
                </svg>
                <h1 className="site-title">METACHARUSAT</h1>
              </div>
              
              <nav className="main-nav">
                <a href="#about">About</a>
                <a href="#features">Features</a>
                <a href="#contact">Contact</a>
              </nav>
            </header>

            <main>
              <section className="hero-section">
                <div className="hero-content">
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <h1 className="headline">
                      Experience<br />
                      <span className="highlight-text">Virtual Campus</span><br />
                      Like Never Before
                    </h1>
                  </motion.div>
                  
                  <motion.p 
                    className="subheadline"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    A digital realm where learning meets social interaction.
                    Customize your avatar, attend virtual classes, and connect with peers.
                  </motion.p>
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                  >
                    <button 
                      className="enter-button"
                      onClick={handleEnterCampus}
                    >
                      <span className="button-text">ENTER CAMPUS</span>
                      <svg className="arrow-icon" viewBox="0 0 24 24" width="24" height="24">
                        <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" />
                      </svg>
                    </button>
                  </motion.div>
                </div>
                
                <motion.div 
                  className="hero-visual"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <div className="abstract-campus">
                    <div className="campus-building building-1"></div>
                    <div className="campus-building building-2"></div>
                    <div className="campus-building building-3"></div>
                    <div className="campus-ground"></div>
                    <div className="campus-avatar"></div>
                  </div>
                </motion.div>
              </section>
              
              <section className="features-section" id="features">
                <motion.h2 
                  className="section-title"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  FEATURES
                </motion.h2>
                
                <div className="feature-tiles">
                  {features.map((feature, index) => (
                    <motion.div 
                      className={`feature-tile ${activeTile === feature.id ? 'active' : ''}`}
                      key={feature.id}
                      onMouseEnter={() => setActiveTile(feature.id)}
                      onMouseLeave={() => setActiveTile(null)}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      style={{
                        '--feature-color': feature.color
                      }}
                    >
                      <div className="feature-icon">{feature.icon}</div>
                      <h3 className="feature-title">{feature.title}</h3>
                      <p className="feature-description">{feature.description}</p>
                    </motion.div>
                  ))}
                </div>
              </section>
              
              <section className="cta-section">
                <motion.div 
                  className="cta-content"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <h2 className="cta-title">Ready to join the<br />virtual campus?</h2>
                  <button 
                    className="enter-button secondary"
                    onClick={handleEnterCampus}
                  >
                    <span className="button-text">GET STARTED</span>
                    <svg className="arrow-icon" viewBox="0 0 24 24" width="24" height="24">
                      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" />
                    </svg>
                  </button>
                </motion.div>
              </section>
            </main>
            
            <footer className="brutalist-footer">
              <div className="footer-content">
                <div className="footer-info">
                  <h3 className="footer-logo">METACHARUSAT</h3>
                  <p>The future of virtual campuses.</p>
                </div>
                
                <div className="footer-links">
                  <div className="link-group">
                    <h4>Navigation</h4>
                    <a href="#about">About</a>
                    <a href="#features">Features</a>
                    <a href="#contact">Contact</a>
                  </div>
                  
                  <div className="link-group">
                    <h4>Legal</h4>
                    <a href="#terms">Terms of Use</a>
                    <a href="#privacy">Privacy Policy</a>
                  </div>
                </div>
              </div>
              
              <div className="copyright">
                <p>&copy; 2025 MetaCharusat. All rights reserved.</p>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomePage;