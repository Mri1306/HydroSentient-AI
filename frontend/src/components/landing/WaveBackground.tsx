const WaveBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <svg
      className="absolute bottom-0 w-[200%] wave-animation opacity-[0.07]"
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
    >
      <path
        fill="hsl(var(--primary))"
        d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,186.7C960,213,1056,235,1152,224C1248,213,1344,171,1392,149.3L1440,128L1440,320L0,320Z"
      />
    </svg>
    <svg
      className="absolute bottom-0 w-[200%] wave-animation-slow opacity-[0.05]"
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
    >
      <path
        fill="hsl(var(--accent))"
        d="M0,224L48,208C96,192,192,160,288,165.3C384,171,480,213,576,218.7C672,224,768,192,864,165.3C960,139,1056,117,1152,128C1248,139,1344,181,1392,202.7L1440,224L1440,320L0,320Z"
      />
    </svg>
  </div>
);

export default WaveBackground;
