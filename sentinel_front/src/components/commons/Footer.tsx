import { useTheme } from "@/utils/store/themeContext";
import React from "react";
import Logo from "@/assets/icons/sentinel_simple-logo.svg?react";

export default function Footer() {
  const { theme } = useTheme();

  return (
    <footer
      style={{
        
        backgroundColor: theme.colors.primary,
        position: "relative",
        overflow: "hidden",
        paddingTop: "4rem",
        paddingBottom: "2rem",
      }}
    >
      {/* Curva superior */}
      <div
      
        style={{
          position: "absolute",
          top: "-60px",
          left: 0,
          width: "100%",
          height: "120px",
          background: "black",
          borderBottomLeftRadius: "50% 100%",
          borderBottomRightRadius: "50% 100%",
        }}
      />

      {/* Contenido principal */}
      <div className="container is-fluid" >
        <div className="columns is-vcentered" style={{
            
        flexDirection: "row",
        justifyContent:" space-around"}}>

          {/* Newsletter (col izquierda) */}
          <div className="column is-4" style={{
                
    animation: "fadeIn 1s ease-out",}}>
            <h2
              style={{
                fontSize: "3rem",
                fontWeight: "700",
                lineHeight: "2.5rem",
                color: theme.colors.secondary,
              }}
            >
              get our <br /> newsletter
            </h2>

            <div style={{ marginTop: "2rem" }}>
              <div className="is-flex is-align-items-center">
                <label htmlFor="newsletter-email" className="sr-only">Email</label>
                <input
                  id="newsletter-email"
                  type="email"
                  autoComplete="email"
                  className="input"
                  placeholder="your email"
                  style={{
                    border: "none",
                    borderBottom: `2px solid ${theme.colors.text.primary}`,
                    borderRadius: 0,
                    background: "transparent",
                    color: theme.colors.text.primary,
                    width: "70%",
                    paddingLeft: 0,
                  }}
                />
                <button
                  aria-label="Subscribe"
                  className="button"
                  style={{
                    background: theme.colors.text.primary,
                    border: "none",
                    borderRadius: 100,
                    marginLeft: "0.5rem",
                    color: theme.colors.secondary,
                    fontSize: "1.3rem",
                  }}
                >
                  ➜
                </button>
              </div>
            </div>
          </div>

          {/* Logo grande (col centro) */}
          <div className="column is-4 has-text-centered" style={{ position: "relative" }}>
            <Logo
              aria-hidden="true"
              style={{
                
  animation: "floating 4s ease-in-out infinite",
                width: "200px",
                height: "200px",
                fill: theme.colors.text.primary,
                marginBottom: "1rem",
              }}
            />

            <h2
              style={{
                fontSize: "4.5rem",
                fontWeight: "900",
                letterSpacing: "-3px",
                marginTop: "-1rem",
                color: theme.colors.text.primary,
              }}
            >
              SEN<span style={{ color: theme.colors.secondary }}>TIN</span>EL
            </h2>
          </div>

          {/* Links (col derecha) */}
          <div className="column is-3 has-text-right" >
            <ul className="footer-column" style={{ fontSize: "1.2rem", lineHeight: "2rem" }}>
  <li>
    <a
      href="https://docs.laziness.crudzaso.com"
      target="_blank"
      rel="noopener noreferrer"
      className="footer-link"
      style={{ textDecoration: "none", color: theme.colors.text.primary }}
    >
      Documentation
    </a>
  </li>

  <li>
    <a
      href="https://docs.laziness.crudzaso.com"
      target="_blank"
      rel="noopener noreferrer"
      className="footer-link"
      style={{ textDecoration: "none", color: theme.colors.text.primary }}
    >
      About us
    </a>
  </li>

  <li>Contact</li>
</ul>

          </div>

        </div>
      </div>

    </footer>
  );
}
