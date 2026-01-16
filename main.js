/**
 * MeMe - Premium Memecoin Landing Page
 * Main JavaScript - Three.js WebGL + GSAP Animations
 */

(function() {
    'use strict';

    // ============================================
    // Configuration
    // ============================================
    const CONFIG = {
        contractAddress: 'MeMeXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        displayAddress: 'MeMeXXX...XXXXXXX'
    };

    // ============================================
    // WebGL Background
    // ============================================
    class WebGLBackground {
        constructor() {
            this.canvas = document.getElementById('webgl-canvas');
            this.fallback = document.querySelector('.hero-fallback');
            this.isWebGLAvailable = this.checkWebGL();
            
            if (this.isWebGLAvailable) {
                this.init();
            } else {
                this.showFallback();
            }
        }

        checkWebGL() {
            try {
                const canvas = document.createElement('canvas');
                return !!(window.WebGLRenderingContext && 
                    (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
            } catch (e) {
                return false;
            }
        }

        showFallback() {
            if (this.canvas) this.canvas.style.display = 'none';
            if (this.fallback) this.fallback.classList.add('active');
        }

        init() {
            this.scene = new THREE.Scene();
            this.clock = new THREE.Clock();
            this.mouse = { x: 0.5, y: 0.5 };
            
            this.setupCamera();
            this.setupRenderer();
            this.createShaderMaterial();
            this.createMesh();
            this.setupEventListeners();
            this.animate();
        }

        setupCamera() {
            this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
            this.camera.position.z = 1;
        }

        setupRenderer() {
            const dpr = Math.min(window.devicePixelRatio, 2);
            
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                antialias: true,
                alpha: true
            });
            
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(dpr);
        }

        createShaderMaterial() {
            // Custom fragment shader with RGB noise, film grain, and dithering
            const vertexShader = `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `;

            const fragmentShader = `
                uniform float uTime;
                uniform vec2 uResolution;
                uniform vec2 uMouse;
                
                varying vec2 vUv;
                
                // Noise functions
                float random(vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
                }
                
                float noise(vec2 st) {
                    vec2 i = floor(st);
                    vec2 f = fract(st);
                    
                    float a = random(i);
                    float b = random(i + vec2(1.0, 0.0));
                    float c = random(i + vec2(0.0, 1.0));
                    float d = random(i + vec2(1.0, 1.0));
                    
                    vec2 u = f * f * (3.0 - 2.0 * f);
                    
                    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
                }
                
                float fbm(vec2 st) {
                    float value = 0.0;
                    float amplitude = 0.5;
                    float frequency = 1.0;
                    
                    for (int i = 0; i < 5; i++) {
                        value += amplitude * noise(st * frequency);
                        frequency *= 2.0;
                        amplitude *= 0.5;
                    }
                    
                    return value;
                }
                
                // Dithering
                float dither(vec2 pos, float brightness) {
                    float threshold = random(pos + fract(uTime * 0.1));
                    return step(threshold * 0.1, brightness) * brightness;
                }
                
                void main() {
                    vec2 uv = vUv;
                    vec2 st = uv * uResolution / min(uResolution.x, uResolution.y);
                    
                    // Slow time for cinematic feel
                    float time = uTime * 0.15;
                    
                    // Mouse influence (subtle parallax)
                    vec2 mouseInfluence = (uMouse - 0.5) * 0.1;
                    st += mouseInfluence;
                    
                    // Create layered noise
                    float n1 = fbm(st * 2.0 + time * 0.3);
                    float n2 = fbm(st * 3.0 - time * 0.2 + 100.0);
                    float n3 = fbm(st * 1.5 + time * 0.1 + 200.0);
                    
                    // RGB color channels with subtle separation
                    float r = n1 * 0.4 + n2 * 0.3;
                    float g = n2 * 0.35 + n3 * 0.25;
                    float b = n3 * 0.3 + n1 * 0.2;
                    
                    // Coffee/warm accent colors
                    vec3 color1 = vec3(0.769, 0.604, 0.424); // #c49a6c
                    vec3 color2 = vec3(0.702, 0.553, 0.396); // #b38d65
                    vec3 color3 = vec3(0.059, 0.059, 0.059); // #0f0f0f
                    
                    // Mix colors based on noise
                    vec3 color = mix(color3, color1, r * 0.3);
                    color = mix(color, color2, g * 0.2);
                    
                    // Radial gradient (darker at edges)
                    float dist = length(uv - 0.5);
                    float vignette = 1.0 - smoothstep(0.2, 0.9, dist);
                    color *= vignette * 0.8 + 0.2;
                    
                    // Film grain
                    float grain = random(uv * uResolution + fract(uTime)) * 0.08;
                    color += grain - 0.04;
                    
                    // Dithering
                    float brightness = (color.r + color.g + color.b) / 3.0;
                    color *= dither(gl_FragCoord.xy, brightness * 0.5 + 0.5);
                    
                    // Final color adjustment
                    color = clamp(color, 0.0, 1.0);
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `;

            this.uniforms = {
                uTime: { value: 0 },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                uMouse: { value: new THREE.Vector2(0.5, 0.5) }
            };

            this.material = new THREE.ShaderMaterial({
                vertexShader,
                fragmentShader,
                uniforms: this.uniforms
            });
        }

        createMesh() {
            const geometry = new THREE.PlaneGeometry(2, 2);
            this.mesh = new THREE.Mesh(geometry, this.material);
            this.scene.add(this.mesh);
        }

        setupEventListeners() {
            window.addEventListener('resize', () => this.onResize());
            window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        }

        onResize() {
            const dpr = Math.min(window.devicePixelRatio, 2);
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(dpr);
            this.uniforms.uResolution.value.set(window.innerWidth * dpr, window.innerHeight * dpr);
        }

        onMouseMove(e) {
            this.mouse.x = e.clientX / window.innerWidth;
            this.mouse.y = 1.0 - (e.clientY / window.innerHeight);
        }

        animate() {
            requestAnimationFrame(() => this.animate());
            
            this.uniforms.uTime.value = this.clock.getElapsedTime();
            
            // Smooth mouse follow
            this.uniforms.uMouse.value.x += (this.mouse.x - this.uniforms.uMouse.value.x) * 0.05;
            this.uniforms.uMouse.value.y += (this.mouse.y - this.uniforms.uMouse.value.y) * 0.05;
            
            this.renderer.render(this.scene, this.camera);
        }
    }

    // ============================================
    // GSAP Animations
    // ============================================
    class Animations {
        constructor() {
            this.init();
        }

        init() {
            gsap.registerPlugin(ScrollTrigger);
            
            this.setupScrollAnimations();
            this.setupHoverAnimations();
            this.setupParallax();
        }

        setupScrollAnimations() {
            // Fade up animations for sections
            const fadeUpElements = document.querySelectorAll('.fade-up');
            
            fadeUpElements.forEach((el, index) => {
                gsap.to(el, {
                    scrollTrigger: {
                        trigger: el,
                        start: 'top 85%',
                        toggleActions: 'play none none none'
                    },
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    delay: index % 4 * 0.1,
                    ease: 'power2.out'
                });
            });

            // Header scroll effect
            const header = document.getElementById('header');
            
            ScrollTrigger.create({
                start: 'top -80',
                onUpdate: (self) => {
                    if (self.direction === 1) {
                        header.classList.add('scrolled');
                    } else if (self.scroll() < 80) {
                        header.classList.remove('scrolled');
                    }
                }
            });

            // Stats counter animation
            const statValues = document.querySelectorAll('.stat-value');
            
            statValues.forEach(stat => {
                ScrollTrigger.create({
                    trigger: stat,
                    start: 'top 80%',
                    onEnter: () => {
                        gsap.from(stat, {
                            textContent: 0,
                            duration: 1.5,
                            ease: 'power2.out',
                            snap: { textContent: 1 }
                        });
                    }
                });
            });
        }

        setupHoverAnimations() {
            // Button glow effect
            const buttons = document.querySelectorAll('.btn-primary');
            
            buttons.forEach(btn => {
                btn.addEventListener('mouseenter', () => {
                    gsap.to(btn, {
                        scale: 1.02,
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                });
                
                btn.addEventListener('mouseleave', () => {
                    gsap.to(btn, {
                        scale: 1,
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                });
            });

            // Card hover effects
            const cards = document.querySelectorAll('.glass-card');
            
            cards.forEach(card => {
                card.addEventListener('mouseenter', () => {
                    gsap.to(card, {
                        y: -5,
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                });
                
                card.addEventListener('mouseleave', () => {
                    gsap.to(card, {
                        y: 0,
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                });
            });
        }

        setupParallax() {
            // Hero content parallax
            const heroContent = document.querySelector('.hero-content');
            const heroCard = document.querySelector('.hero-card');
            
            if (heroContent && heroCard) {
                gsap.to(heroContent, {
                    scrollTrigger: {
                        trigger: '.hero',
                        start: 'top top',
                        end: 'bottom top',
                        scrub: 1
                    },
                    y: 100,
                    opacity: 0.3
                });
                
                gsap.to(heroCard, {
                    scrollTrigger: {
                        trigger: '.hero',
                        start: 'top top',
                        end: 'bottom top',
                        scrub: 1
                    },
                    y: 80,
                    opacity: 0.5
                });
            }
        }
    }

    // ============================================
    // UI Interactions
    // ============================================
    class UI {
        constructor() {
            this.init();
        }

        init() {
            this.setupMobileMenu();
            this.setupCopyButton();
            this.setupFAQ();
            this.setupSmoothScroll();
        }

        setupMobileMenu() {
            const menuBtn = document.getElementById('mobileMenuBtn');
            const mobileNav = document.getElementById('mobileNav');
            
            if (menuBtn && mobileNav) {
                menuBtn.addEventListener('click', () => {
                    mobileNav.classList.toggle('active');
                    menuBtn.classList.toggle('active');
                });
                
                // Close menu on link click
                const navLinks = mobileNav.querySelectorAll('.nav-link');
                navLinks.forEach(link => {
                    link.addEventListener('click', () => {
                        mobileNav.classList.remove('active');
                        menuBtn.classList.remove('active');
                    });
                });
            }
        }

        setupCopyButton() {
            const copyBtn = document.getElementById('copyBtn');
            const contractAddress = document.getElementById('contractAddress');
            
            if (copyBtn && contractAddress) {
                copyBtn.addEventListener('click', async () => {
                    try {
                        await navigator.clipboard.writeText(CONFIG.contractAddress);
                        
                        const copyText = copyBtn.querySelector('.copy-text');
                        const originalText = copyText.textContent;
                        
                        copyBtn.classList.add('copied');
                        copyText.textContent = 'Copied!';
                        
                        gsap.fromTo(copyBtn, 
                            { scale: 0.95 },
                            { scale: 1, duration: 0.2, ease: 'power2.out' }
                        );
                        
                        setTimeout(() => {
                            copyBtn.classList.remove('copied');
                            copyText.textContent = originalText;
                        }, 2000);
                    } catch (err) {
                        console.error('Failed to copy:', err);
                    }
                });
            }
        }

        setupFAQ() {
            const faqItems = document.querySelectorAll('.faq-item');
            
            faqItems.forEach(item => {
                const question = item.querySelector('.faq-question');
                
                question.addEventListener('click', () => {
                    const isActive = item.classList.contains('active');
                    
                    // Close all other items
                    faqItems.forEach(otherItem => {
                        if (otherItem !== item) {
                            otherItem.classList.remove('active');
                            otherItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
                        }
                    });
                    
                    // Toggle current item
                    item.classList.toggle('active');
                    question.setAttribute('aria-expanded', !isActive);
                });
            });
        }

        setupSmoothScroll() {
            const links = document.querySelectorAll('a[href^="#"]');
            
            links.forEach(link => {
                link.addEventListener('click', (e) => {
                    const href = link.getAttribute('href');
                    
                    if (href === '#') return;
                    
                    const target = document.querySelector(href);
                    
                    if (target) {
                        e.preventDefault();
                        
                        const headerHeight = document.getElementById('header').offsetHeight;
                        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
                        
                        gsap.to(window, {
                            scrollTo: targetPosition,
                            duration: 1,
                            ease: 'power2.inOut'
                        });
                    }
                });
            });
        }
    }

    // ============================================
    // Initialize
    // ============================================
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize WebGL background
        new WebGLBackground();
        
        // Initialize GSAP animations
        new Animations();
        
        // Initialize UI interactions
        new UI();
        
        // Log welcome message
        console.log('%c🚀 MeMe Token', 'font-size: 24px; font-weight: bold; color: #c49a6c;');
        console.log('%cThe Meme You Ape, The Risk You Understand.', 'font-size: 14px; color: #888;');
        console.log('%c⚠️ This is a memecoin. DYOR. NFA.', 'font-size: 12px; color: #fbbf24;');
    });

})();
